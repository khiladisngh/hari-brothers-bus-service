// scripts/processImages.js

const admin = require("firebase-admin");
const fs = require("fs").promises;
const path = require("path");

// Load .env for potential non-emulator runs or other config
require("dotenv").config({ path: path.join(__dirname, '..', '.env') }); // Look for .env in root

// --- Configuration ---
const BUCKET_NAME = process.env.FIREBASE_STORAGE_BUCKET || "hari-bus-service-8d1fa.appspot.com";
// Construct paths relative to THIS script's location (__dirname is scripts/)
const serviceAccountPath = path.join(__dirname, '..', 'secrets', 'serviceAccountKey.json'); // ../secrets/
const projectRootDir = path.join(__dirname, '..'); // Go one level up to project root

const toursJsonInputPath = path.join(projectRootDir, 'public', 'json', 'tours.json'); // ../public/json/
const toursImageSourceDir = path.join(projectRootDir, 'public', 'images', 'tours');    // ../public/images/
const galleryImageSourceDir = path.join(projectRootDir, 'public', 'images', 'gallery-page');
const outputJsonDir = path.join(projectRootDir, 'public', 'json'); // Output JSON directory
const outputToursJsonPath = path.join(outputJsonDir, "tours_with_metadata.json");
const outputGalleryJsonPath = path.join(outputJsonDir, "galleryImages.json");
const supportedImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const toursStoragePrefix = 'tours/';
const galleryStoragePrefix = 'gallery/';
// --- End Configuration ---

// --- Firebase Initialization ---
console.log(`DEBUG: STORAGE_EMULATOR_HOST is set to: "${process.env.STORAGE_EMULATOR_HOST}"`);
async function initializeFirebaseAdmin() {
    const isStorageEmulator = !!process.env.STORAGE_EMULATOR_HOST;
    const isFirestoreEmulator = !!process.env.FIRESTORE_EMULATOR_HOST; // Check Firestore too for consistency

    if (isStorageEmulator || isFirestoreEmulator) {
        console.log("Emulator environment detected (STORAGE_EMULATOR_HOST or FIRESTORE_EMULATOR_HOST is set).");
        console.log("Initializing Firebase Admin SDK for EMULATOR use...");
        try {
            admin.initializeApp({
                storageBucket: BUCKET_NAME,
                // Project ID is usually inferred by emulators if FIREBASE_CONFIG env var is set by `emulators:start`
                // projectId: process.env.GCLOUD_PROJECT || "hari-bus-service-8d1fa",
            });
            console.log("Firebase Admin SDK initialized (Emulator Mode).");
        } catch (e) {
            if (e.code !== 'app/duplicate-app') { // Ignore if already initialized
                console.error("Emulator mode initialization failed:", e);
                throw e;
            } else {
                console.warn("Firebase Admin SDK already initialized (Emulator Mode).");
            }
        }
    } else {
        console.log("No Emulator detected. Initializing using Service Account Key...");
        try {
            // Check if file exists before requiring it
            await fs.access(serviceAccountPath);
            const serviceAccount = require(serviceAccountPath); // require uses path relative to CWD or node_modules
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket: BUCKET_NAME
            });
            console.log("Firebase Admin SDK initialized using Service Account (Live Mode).");
        } catch (keyError) {
            console.error(`Error initializing with Service Account Key from ${serviceAccountPath}:`, keyError);
            console.error("Please ensure the key file exists and is accessible, OR run with emulators.");
            throw new Error("Admin SDK Initialization Failed. Cannot proceed.");
        }
    }
    return admin.storage().bucket();
}

// --- Helper Functions ---
async function checkFileExists(filePath) {
    try {
        await fs.access(filePath, fs.constants.R_OK);
        return true;
    } catch {
        return false;
    }
}

async function findImageFile(directory, baseName) {
    for (const ext of supportedImageExtensions) {
        const filePath = path.join(directory, `${baseName}${ext}`);
        if (await checkFileExists(filePath)) {
            return filePath;
        }
    }
    return null;
}

async function uploadFileAndGetPublicUrl(bucket, localPath, destinationPath) {
    try {
        const options = {
            destination: destinationPath,
            metadata: { cacheControl: 'public, max-age=31536000' },
        };
        const [file] = await bucket.upload(localPath, options);
        await file.makePublic(); // Make the file publicly readable

        // Construct the public URL manually for better consistency (esp. with emulator)
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;
        // Or get signed URL for guaranteed access (even emulator)
        // const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: '01-01-2100' });

        console.log(`  Uploaded ${path.basename(localPath)} -> ${publicUrl}`);
        return publicUrl; // Using simpler public URL construction
    } catch (error) {
        console.error(`  ERROR uploading ${path.basename(localPath)} to ${destinationPath}:`, error.message);
        return null;
    }
}

async function uploadFileAndGetAccessibleUrl(bucket, localPath, destinationPath) {
    const isEmulator = !!process.env.STORAGE_EMULATOR_HOST;

    try {
        const options = {
            destination: destinationPath,
            metadata: { cacheControl: 'public, max-age=31536000' },
        };
        const [file] = await bucket.upload(localPath, options);

        let fileUrl;

        if (isEmulator) {
            // For emulator, get WSL IP or use 0.0.0.0
            const wslIP = process.env.WSL_IP;
            let emulatorHost = process.env.STORAGE_EMULATOR_HOST.replace('http://', '').replace('https://', '');

            if (wslIP) {
                // Use WSL IP for Windows browser access
                emulatorHost = emulatorHost.replace('127.0.0.1', wslIP).replace('0.0.0.0', wslIP);
            }

            // For emulator URLs, we need to encode the path properly
            // Split by '/' and encode each segment, then join back
            const pathSegments = destinationPath.split('/');
            const encodedPath = pathSegments.map(segment => encodeURIComponent(segment)).join('%2F');

            fileUrl = `http://${emulatorHost}/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;
            console.log(`  Uploaded ${path.basename(localPath)} -> ${destinationPath} (Emulator)`);
        } else {
            // For production, make public and get signed URL
            await file.makePublic();
            const [signedUrl] = await file.getSignedUrl({
                action: 'read',
                expires: '01-01-2100'
            });
            fileUrl = signedUrl;
            console.log(`  Uploaded ${path.basename(localPath)} -> ${destinationPath}`);
        }

        return fileUrl;

    } catch (error) {
        // Log the specific error during upload
        console.error(`  ERROR uploading or getting URL for ${path.basename(localPath)} to ${destinationPath}:`, error.message);
        // If it's the specific SSL error, add context
        if (error.code === 'EPROTO' || (error.message && error.message.includes('routines:ssl3_get_record:wrong version number'))) {
            console.error("  >>> This might be the HTTP/HTTPS protocol mismatch error with the emulator. <<<");
        }
        return null; // Return null on failure
    }
}

function deriveAltText(filename, prefix = "") {
    const nameWithoutExt = path.parse(filename).name;
    let cleanName = nameWithoutExt.replace(/[-_]/g, ' ');
    cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    return `${prefix}${cleanName}`;
}

// --- Main Processing Functions --- (Logic remains largely the same, paths are relative now)
async function processTourImages(bucket) {
    console.log("\n--- Processing Tour Images ---");
    let originalToursData;
    try {
        const content = await fs.readFile(toursJsonInputPath, 'utf8');
        originalToursData = JSON.parse(content);
    } catch (err) {
        console.error(`Error reading or parsing ${toursJsonInputPath}:`, err); return;
    }

    const newToursData = [];
    for (const tour of originalToursData) {
        const processedPlaces = [];
        console.log(`Processing tour: ${tour.tourName}`);
        if (Array.isArray(tour.tourPlaces)) {
            for (const placeName of tour.tourPlaces) {
                if (typeof placeName !== 'string' || !placeName.trim()) { console.warn(`  - Skipping invalid place name entry: ${placeName}`); continue; }
                const localImagePath = await findImageFile(toursImageSourceDir, placeName.trim());
                let imageUrl = null;
                let filenameUsed = localImagePath ? path.basename(localImagePath) : `${placeName}.jpg`; // Default filename for alt text

                if (localImagePath) {
                    // Don't encode here - let uploadFileAndGetAccessibleUrl handle encoding for the URL
                    const destinationPath = `${toursStoragePrefix}${path.basename(localImagePath)}`;
                    imageUrl = await uploadFileAndGetAccessibleUrl(bucket, localImagePath, destinationPath);
                } else {
                    console.warn(`  - Local image not found for place: "${placeName}" in ${toursImageSourceDir}`);
                }
                processedPlaces.push({ name: placeName, imageUrl: imageUrl, altText: deriveAltText(filenameUsed, `Image of `) });
            }
        }
        newToursData.push({ ...tour, tourPlaces: processedPlaces });
    }
    try {
        await fs.mkdir(outputJsonDir, { recursive: true });
        await fs.writeFile(outputToursJsonPath, JSON.stringify(newToursData, null, 2));
        console.log(`Successfully wrote updated tours data to ${outputToursJsonPath}`);
    } catch (err) { console.error(`Error writing ${outputToursJsonPath}:`, err); }
}

async function processGalleryImages(bucket) {
    console.log("\n--- Processing Gallery Images ---");
    let files;
    try { files = await fs.readdir(galleryImageSourceDir); }
    catch (err) { console.error(`Error reading gallery directory ${galleryImageSourceDir}:`, err); return; }

    const imageFiles = files.filter(file => supportedImageExtensions.includes(path.extname(file).toLowerCase()));
    const galleryData = [];
    let orderIndex = 0;
    console.log(`Found ${imageFiles.length} gallery images to process.`);

    for (const filename of imageFiles) {
        const localPath = path.join(galleryImageSourceDir, filename);
        // Don't encode here - let uploadFileAndGetAccessibleUrl handle encoding for the URL
        const destinationPath = `${galleryStoragePrefix}${filename}`;
        const imageUrl = await uploadFileAndGetAccessibleUrl(bucket, localPath, destinationPath);
        if (imageUrl) {
            galleryData.push({ imageUrl: imageUrl, altText: deriveAltText(filename, `Gallery image: `), order: orderIndex++ });
        } else {
            console.warn(`  - Skipping gallery image ${filename} due to upload failure.`);
        }
    }
    try {
        await fs.mkdir(outputJsonDir, { recursive: true });
        await fs.writeFile(outputGalleryJsonPath, JSON.stringify(galleryData, null, 2));
        console.log(`Successfully wrote gallery data to ${outputGalleryJsonPath}`);
    } catch (err) { console.error(`Error writing ${outputGalleryJsonPath}:`, err); }
}

// --- Run Script ---
async function main() {
    let bucket;
    try { bucket = await initializeFirebaseAdmin(); }
    catch (initError) { console.error("CRITICAL: Could not initialize Firebase Admin SDK. Exiting.", initError); process.exit(1); }

    console.log(`\nTargeting Storage Bucket: ${bucket.name}`);
    // ... (rest of main function logging and calls) ...
    await processTourImages(bucket);
    await processGalleryImages(bucket);
    console.log("\nImage processing script finished.");
}

main().catch(err => { console.error("\n--- UNHANDLED ERROR ---"); console.error(err); process.exit(1); });

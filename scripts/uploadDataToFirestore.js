// scripts/uploadDataToFirestore.js

const admin = require("firebase-admin");
const fs = require("fs").promises;
const path = require("path");

// Load .env for potential non-emulator runs or other config
require("dotenv").config({ path: path.join(__dirname, '..', '.env') }); // Look for .env in root

// --- Configuration ---
// Construct paths relative to THIS script's location (__dirname is scripts/)
const serviceAccountPath = path.join(__dirname, '..', 'secrets', 'serviceAccountKey.json');
const jsonDir = path.join(__dirname, '..', 'public', 'json');

const testimonialsJsonPath = path.join(jsonDir, 'testimonials.json');
const toursJsonPath = path.join(jsonDir, 'tours_with_metadata.json'); // Use the NEW tours JSON
const galleryJsonPath = path.join(jsonDir, 'galleryImages.json');   // Use the NEW gallery JSON
// --- End Configuration ---


// --- Firebase Initialization ---
async function initializeFirebaseAdmin() {
    const isEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;

    if (isEmulator) {
        console.log(`Firestore Emulator detected at: ${process.env.FIRESTORE_EMULATOR_HOST}`);
        console.log("Initializing Firebase Admin SDK for EMULATOR use...");
         try {
            admin.initializeApp({
                // projectId: process.env.GCLOUD_PROJECT || "hari-bus-service-8d1fa", // Usually auto-detected
            });
            console.log("Firebase Admin SDK initialized (Emulator Mode).");
        } catch (e) {
             if (e.code !== 'app/duplicate-app') { throw e; }
             else { console.warn("Firebase Admin SDK already initialized (Emulator Mode)."); }
        }
    } else {
        console.log("No Firestore Emulator detected. Initializing using Service Account Key...");
        try {
            await fs.access(serviceAccountPath);
            const serviceAccount = require(serviceAccountPath);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log("Firebase Admin SDK initialized using Service Account (Live Mode).");
        } catch (keyError) {
            console.error(`Error initializing with Service Account Key from ${serviceAccountPath}:`, keyError);
             try {
                console.warn("Attempting initialization with Application Default Credentials (ADC)...");
                admin.initializeApp();
                console.log("Initialized with ADC (ensure correct permissions).");
             } catch (adcError) {
                 console.error("Failed to initialize with ADC as well.", adcError);
                 throw new Error("Admin SDK Initialization Failed. Cannot proceed.");
             }
        }
    }
    return admin.firestore();
}

/**
 * Reads a JSON file and uploads its contents to a Firestore collection using batches.
 * @param {admin.firestore.Firestore} db Firestore database instance.
 * @param {string} jsonFilePath Absolute path to the JSON file.
 * @param {string} collectionName The name of the Firestore collection.
 * @param {string|null} docIdField Optional field name in the JSON object to use as the document ID. If null, Firestore auto-generates IDs.
 */
async function uploadJsonToFirestore(db, jsonFilePath, collectionName, docIdField = null) {
    console.log(`\n--- Uploading data for collection: ${collectionName} ---`);
    let data;
    const fileName = path.basename(jsonFilePath);

    try {
        const fileContent = await fs.readFile(jsonFilePath, "utf8");
        data = JSON.parse(fileContent);
        console.log(`Successfully read data from ${fileName}`);
    } catch (error) {
        console.error(`! Error reading or parsing file ${jsonFilePath}:`, error.message);
        return; // Stop if file read fails
    }

    if (!Array.isArray(data)) {
        console.error(`! Error: Data in ${fileName} is not an array.`);
        return;
    }

    console.log(`Starting upload of ${data.length} documents to collection '${collectionName}'...`);
    const batchSize = 400; // Firestore batch write limit is 500, use a safe batch size
    let batch = db.batch();
    let docCountInBatch = 0;
    let totalUploadedCount = 0;
    const promises = []; // To track batch commits

    for (let i = 0; i < data.length; i++) {
        const element = data[i];
        let docId = null;

        if (docIdField && element[docIdField]) {
            docId = String(element[docIdField]); // Ensure ID is a string
             if (!docId) {
                console.warn(`  - Skipping element index ${i} with invalid/missing ID field '${docIdField}'.`);
                continue;
             }
             const docRef = db.collection(collectionName).doc(docId);
             batch.set(docRef, element, { merge: true }); // Use set with merge for specific IDs
        } else {
            const docRef = db.collection(collectionName).doc(); // Ref for auto-ID
            batch.set(docRef, element); // Use set for auto-ID (same as add within batch)
        }

        docCountInBatch++;
        totalUploadedCount++;

        // Commit batch when size is reached or it's the last element
        if (docCountInBatch === batchSize || i === data.length - 1) {
            console.log(`  Committing batch ${promises.length + 1} with ${docCountInBatch} documents (Total: ${totalUploadedCount}/${data.length})...`);
            promises.push(batch.commit());
            batch = db.batch(); // Start a new batch
            docCountInBatch = 0;
        }
    }

    try {
        await Promise.all(promises);
        console.log(`Successfully committed all batches for ${collectionName}. Total documents processed: ${totalUploadedCount}.`);
    } catch (error) {
        console.error(`! Error committing one or more batches for ${collectionName}:`, error);
    }
}

// --- Run Script ---
async function runUploads() {
    console.log("Starting Firestore data upload script...");
    let db;
    try {
        db = await initializeFirebaseAdmin();
    } catch(initError) {
        console.error("CRITICAL: Could not initialize Firebase Admin SDK. Exiting.", initError);
        process.exit(1);
    }

    // Upload Testimonials (using auto-generated IDs)
    await uploadJsonToFirestore(db, testimonialsJsonPath, 'testimonials');

    // Upload Tours (using 'tourName' as document ID from the new JSON)
    await uploadJsonToFirestore(db, toursJsonPath, 'tours', 'tourName');

    // Upload Gallery Images (using auto-generated IDs from the new JSON)
    await uploadJsonToFirestore(db, galleryJsonPath, 'galleryImages');

    console.log("\nFirestore data upload script finished.");
}

runUploads().catch(error => {
    console.error("\n--- UNHANDLED ERROR in script execution ---");
    console.error(error);
    process.exit(1);
});

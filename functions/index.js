// functions/index.js


// --- Gen 2 Imports ---
const { onRequest } = require("firebase-functions/v2/https");
// Use Gen 1 logger path as confirmed working in previous steps
const logger = require("firebase-functions/logger");

// --- Other Imports ---
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const express = require("express");
const path = require("path");
const engines = require("consolidate");
const cookieParser = require("cookie-parser");
const createError = require("http-errors");
const nodemailer = require("nodemailer"); // Nodemailer for email
// Lodash might still be needed if other templates use it, remove if gallery was the only user
const _ = require("lodash");
// Removed fs and axios as they are no longer needed for gallery

// For local development using a .env file
require("dotenv").config({ path: path.join(__dirname, '.env') }); // Load .env from functions dir if present

// --- Initialization ---
try {
    // Initialize only if not already initialized (useful for testing/emulators)
    if (admin.apps.length === 0) {
        admin.initializeApp();
        logger.info("Firebase Admin SDK initialized.");
    }
} catch (error) {
    logger.error("Firebase Admin SDK initialization failed:", error);
    // Throwing error might prevent function cold start, log and potentially continue
    // depending on whether other parts of the function can work without admin SDK.
    // For this app, DB access is crucial, so throwing might be appropriate.
    throw error;
}
const db = getFirestore();

// --- Environment Variable Checks ---
// Removed Google Places API vars
const requiredEnvVars = [
    'EMAIL_USER',               // Your Gmail address used for sending
    'EMAIL_PASSWORD',           // Your 16-character Gmail App Password
    'CONTACT_FORM_RECIPIENT'    // The email address to send contact notifications TO
];

let missingEnvVars = false;
requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        logger.error(`Missing required environment variable: ${varName}`);
        missingEnvVars = true;
    }
});

if (missingEnvVars) {
    logger.error("One or more required environment variables are missing. Email functionality may be impaired.");
    // Consider how critical email is. If essential, maybe throw an error here.
}

// --- Nodemailer Transporter Setup ---
let transporter;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASSWORD; // This should be the App Password

if (emailUser && emailPass) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: emailUser,
            pass: emailPass,
        },
    });
    logger.info("Nodemailer transporter created successfully for Gmail.");

    // Verify connection config
    transporter.verify(function(error, success) {
       if (error) {
            logger.error("Nodemailer transporter verification failed:", error);
       } else {
            logger.info("Nodemailer transporter is ready to send messages.");
       }
    });
} else {
    logger.error("Email credentials (EMAIL_USER, EMAIL_PASSWORD) missing. Email sending will be disabled.");
}

// --- Express App Setup ---
const app = express();
app.engine("html", engines.ejs);
app.set("views", path.join(__dirname, "views")); // Views relative to functions directory
app.set("view engine", "ejs");

// Removed express.static - rely on Firebase Hosting for static files from the root /public directory
// app.use(express.static(path.join(__dirname, "public")));

app.use(require('morgan')("tiny")); // HTTP request logger
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: false })); // For parsing application/x-www-form-urlencoded
app.use(cookieParser()); // Parse cookies

// Helper for cache headers
const setCacheHeaders = (res) => {
    // Example: Cache for 5 mins in browser, 10 mins in CDN
    res.set("Cache-Control", "public, max-age=300, s-maxage=600");
};

// --- Routes ---

// HOME ROUTE
app.get("/", async (req, res, next) => {
    logger.info("Accessing Home route");
    try {
        const snapshot = await db.collection("testimonials").get();
        let testimonials = [];
        if (snapshot.empty) {
            logger.warn("No testimonials found in Firestore.");
        } else {
            testimonials = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            logger.info(`Fetched ${testimonials.length} testimonials.`);
        }
        setCacheHeaders(res);
        res.render("home", { testimonials: testimonials });
    } catch (error) {
        logger.error("Error fetching testimonials:", error);
        next(error);
    }
});

// TOUR ROUTE - Fetches updated structure from Firestore
app.get("/tours", async (req, res, next) => {
    logger.info("Accessing Tours route");
    try {
        const snapshot = await db.collection("tours").orderBy("tourName", "asc").get(); // Order alphabetically
        let tours = [];
        if (snapshot.empty) {
            logger.warn("No tours found in Firestore.");
        } else {
            // Data now includes tourPlaces as array of {name, imageUrl, altText} objects
            tours = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            logger.info(`Fetched ${tours.length} tours.`);
        }
        setCacheHeaders(res);
        // Pass data expected by the updated tours.ejs
        res.render("tours", { toursData: tours });
    } catch (error) {
        logger.error("Error fetching tours:", error);
        next(error);
    }
});

// GALLERY ROUTE - Fetches from Firestore 'galleryImages' collection
app.get("/gallery", async (req, res, next) => {
    logger.info("Accessing Gallery route (fetching from Firestore)");
    try {
        const snapshot = await db.collection("galleryImages")
                                 .orderBy("order", "asc") // Order images based on the 'order' field
                                 .get();

        let galleryItems = [];
        if (snapshot.empty) {
            logger.warn("No images found in Firestore 'galleryImages' collection.");
        } else {
            galleryItems = snapshot.docs.map(doc => ({
                id: doc.id,
                // Ensure imageUrl and altText exist, provide defaults if necessary
                imageUrl: doc.data().imageUrl || '', // Default to empty string if missing
                altText: doc.data().altText || "Gallery Image"
            }));
            logger.info(`Fetched ${galleryItems.length} gallery items from Firestore.`);
        }

        setCacheHeaders(res);
        // Pass data expected by the updated gallery.ejs
        res.render("gallery", {
            galleryItems: galleryItems
            // Removed lodash as template no longer uses it for columns
        });

    } catch (error) {
        logger.error("Error fetching gallery items from Firestore:", error);
        next(error);
    }
});

// ABOUT ROUTE
app.get("/about", (req, res) => {
    logger.info("Accessing About route");
    setCacheHeaders(res);
    res.render("about");
});

// PAY ROUTE
app.get("/pay", (req, res) => {
    logger.info("Accessing Pay route");
    setCacheHeaders(res);
    res.render("pay");
});

// CONTACT ROUTE - GET
app.get("/contact", (req, res) => {
    logger.info("Accessing Contact route (GET)");
    setCacheHeaders(res);
    res.render("contact", { success: req.query.success === 'true' });
});

// CONTACT ROUTE - POST
app.post("/contact", async (req, res, next) => {
    logger.info("Processing Contact form submission");

    if (!req.body) { /* ... handle empty body ... */ return next(createError(400, "Bad Request")); }
    const formData = req.body;

    // Validation (ensure form has 'email' field)
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phoneNumber || !formData.message) {
        /* ... handle missing fields ... */
        return res.status(400).render("contact", { error: "Please fill out all required fields.", formData: formData });
    }

    // Email Sending Logic
    const emailRecipient = process.env.CONTACT_FORM_RECIPIENT;
    if (!transporter) { logger.error("Nodemailer transporter not available."); }
    if (!emailRecipient) { logger.error("CONTACT_FORM_RECIPIENT not set."); }

    const mailSubject = `New Contact Form Submission from ${formData.firstName} ${formData.lastName}`;
    const mailTextBody = `... (construct text body using formData) ...`; // Keep your text body construction
    const mailHtmlBody = `... (construct HTML body using formData) ...`; // Keep your HTML body construction

    const mailOptions = {
        from: `"Hari Bus Service Website" <${emailUser}>`,
        to: emailRecipient,
        replyTo: formData.email,
        subject: mailSubject,
        text: mailTextBody,
        html: mailHtmlBody,
    };

    let emailInfo = null;
    if (transporter && emailRecipient) {
        try {
            emailInfo = await transporter.sendMail(mailOptions);
            logger.info(`Email sent successfully. Message ID: ${emailInfo.messageId}`);
        } catch (emailError) {
            logger.error("Error sending contact form email:", emailError);
            // Decide if this is fatal. Currently logs and continues.
        }
    } else {
         logger.warn("Skipping email notification due to missing configuration.");
    }

    // Save to Firestore
    try {
        const docRef = await db.collection("messages").add({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phoneNumber: formData.phoneNumber,
            fromCity: formData.fromCity || null,
            fromState: formData.fromState || null,
            toCity: formData.toCity || null,
            toState: formData.toState || null,
            date: formData.date || null,
            message: formData.message,
            emailMessageId: emailInfo ? emailInfo.messageId : null,
            submittedAt: admin.firestore.FieldValue.serverTimestamp() // Use server timestamp
        });
        logger.info(`Message saved to Firestore with ID: ${docRef.id}`);
        res.redirect('/contact?success=true');
    } catch (firestoreError) {
        logger.error("Error saving contact form data to Firestore:", firestoreError);
        next(createError(500, "Failed to save message data."));
    }
});

// --- Error Handling ---
// Catch 404
app.use((req, res, next) => {
    // If you have a custom 404.ejs view:
    // res.status(404).render("404");
    // Otherwise, use http-errors:
    next(createError(404));
});

// General error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    const status = err.status || 500;
    logger.error("Unhandled error caught:", {
        message: err.message,
        status: status,
        stack: err.stack, // Log stack in development or for debugging
        url: req.originalUrl,
        method: req.method
    });

    res.locals.message = err.message;
    // Provide error details only in development (check NODE_ENV or similar)
    const isDevelopment = process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV === 'development';
    res.locals.error = isDevelopment ? err : {};

    res.status(status);
    // Ensure you have an 'error.ejs' view in functions/views/
    res.render("error");
});

// --- Export Firebase Function (Gen 2 Syntax) ---
const functionOptions = {
    region: "asia-south1", // Your preferred region
    secrets: ["EMAIL_PASSWORD"], // Recommended: Use Secret Manager for EMAIL_PASSWORD
    // memory: "512MB", // Optional: Adjust memory
    // timeoutSeconds: 60, // Optional: Adjust timeout
};

// Export the Express app as a Gen 2 onRequest function named 'app'
exports.app = onRequest(functionOptions, app);

// For local development using a .env file
require("dotenv").config();

// --- Gen 2 Imports ---
// Import specific function type and logger from v2 modules
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// --- Other Imports ---
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const express = require("express");
const path = require("path");
const engines = require("consolidate");
const cookieParser = require("cookie-parser");
const createError = require("http-errors");
const axios = require("axios"); // Modern HTTP client
const nodemailer = require("nodemailer"); // Nodemailer for email
const _ = require("lodash");
const { promises: fs } = require("fs");

// --- Initialization ---

try {
    admin.initializeApp();
} catch (error) {
    if (error.code !== 'app/duplicate-app') {
        logger.error("Firebase Admin SDK initialization failed:", error);
        throw error;
    } else {
        logger.warn("Firebase Admin SDK already initialized.");
    }
}
const db = getFirestore();

// --- Environment Variable Checks ---
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
    logger.error("One or more required environment variables are missing. Functionality may be impaired.");
}

// --- Nodemailer Transporter Setup ---
let transporter;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASSWORD;

if (emailUser && emailPass) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: emailUser,
            pass: emailPass,
        },
    });
    logger.info("Nodemailer transporter created successfully for Gmail.");
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
// This part remains exactly the same
const app = express();
app.engine("html", engines.ejs);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(require('morgan')("tiny"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const setCacheHeaders = (res) => {
    res.set("Cache-Control", "public, max-age=300, s-maxage=600");
};

// --- Routes ---
// All your app.get() and app.post() routes remain exactly the same

// HOME ROUTE
app.get("/", async (req, res, next) => {
    logger.info("Accessing Home route");
    try {
        const snapshot = await db.collection("testimonials").get();
        let testimonials = [];
        if (snapshot.empty) {
            logger.warn("No testimonials found in Firestore.");
        } else {
            testimonials = snapshot.docs.map(doc => doc.data());
            logger.info(`Workspaceed ${testimonials.length} testimonials.`); // Fixed typo from previous version if present
        }
        setCacheHeaders(res);
        res.render("home", { testimonials: testimonials });
    } catch (error) {
        logger.error("Error fetching testimonials:", error);
        next(error);
    }
});

// TOUR ROUTE
app.get("/tours", async (req, res, next) => {
    logger.info("Accessing Tours route");
    try {
        const snapshot = await db.collection("tours").get();
        let tours = [];
        if (snapshot.empty) {
            logger.warn("No tours found in Firestore.");
        } else {
            tours = snapshot.docs.map(doc => doc.data());
            logger.info(`Workspaceed ${tours.length} tours.`); // Fixed typo
        }
        setCacheHeaders(res);
        res.render("tours", { toursData: tours });
    } catch (error) {
        logger.error("Error fetching tours:", error);
        next(error);
    }
});

// GALLERY ROUTE
app.get("/gallery", async (req, res, next) => {
    logger.info("Accessing Gallery route");
    try {
        const imageFolderPath = path.join('public', 'images', 'gallery-page');
        const files = await fs.readdir(imageFolderPath);
        // Filter for image files (e.g., jpg, png, jpeg) and create relative paths
        const imageFiles = files
            .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
            .map(file => `/images/gallery-page/${file}`); // Create paths relative to the public folder

        logger.info(`Found ${imageFiles.length} images locally.`);
        setCacheHeaders(res);
        res.render("gallery", {
            localImages: imageFiles, // Pass the list of local image paths
            lodash: _ // Keep lodash if the template still uses it for other things
        });
    } catch (error) {
        logger.error("Error reading gallery images from local directory:", error);
        next(error); // Pass the error to the error handler
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

    if (!req.body) {
        logger.warn("Contact form submitted with empty body.");
        return next(createError(400, "Bad Request: No form data received."));
    }
    const formData = req.body;

    // Basic validation - Ensure your form actually has an 'email' field
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phoneNumber || !formData.message) {
        logger.warn("Contact form submission missing required fields.", { received: formData });
        setCacheHeaders(res);
        return res.status(400).render("contact", {
            error: "Please fill out all required fields.",
            formData: formData
        });
    }

    // Email Sending Logic
    const emailRecipient = process.env.CONTACT_FORM_RECIPIENT;
    if (!transporter) {
         logger.error("Nodemailer transporter not available. Cannot send email.");
    }
    if (!emailRecipient) {
         logger.error("CONTACT_FORM_RECIPIENT environment variable not set. Cannot send email notification.");
    }

    const mailSubject = `New Contact Form Submission from ${formData.firstName} ${formData.lastName}`;
    const mailTextBody = `
        New contact form submission received:\n
        Name: ${formData.firstName} ${formData.lastName}
        Email: ${formData.email}
        Phone: ${formData.phoneNumber}
        From: ${formData.fromCity || 'N/A'}, ${formData.fromState || 'N/A'}
        To: ${formData.toCity || 'N/A'}, ${formData.toState || 'N/A'}
        Date: ${formData.date || 'N/A'}\n
        Message:\n${formData.message}
    `;
    const mailHtmlBody = `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${formData.firstName} ${formData.lastName}</p>
        <p><strong>Email:</strong> ${formData.email}</p>
        <p><strong>Phone:</strong> ${formData.phoneNumber}</p>
        <p><strong>From:</strong> ${formData.fromCity || 'N/A'}, ${formData.fromState || 'N/A'}</p>
        <p><strong>To:</strong> ${formData.toCity || 'N/A'}, ${formData.toState || 'N/A'}</p>
        <p><strong>Date:</strong> ${formData.date || 'N/A'}</p>
        <hr>
        <p><strong>Message:</strong></p>
        <p>${formData.message.replace(/\n/g, '<br>')}</p>
    `;
    const mailOptions = {
        from: `"Hari Bus Service Website" <${emailUser}>`,
        to: emailRecipient,
        replyTo: formData.email, // Set reply-to to the user's email
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
            // Continue to save to Firestore even if email fails for now
        }
    } else {
         logger.warn("Skipping email notification due to missing configuration (transporter or recipient).");
    }

    // Save to Firestore
    try {
        const docRef = await db.collection("messages").add({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email, // Ensure email field exists in Firestore schema if needed
            phoneNumber: formData.phoneNumber,
            fromCity: formData.fromCity || null,
            fromState: formData.fromState || null,
            toCity: formData.toCity || null,
            toState: formData.toState || null,
            date: formData.date || null,
            message: formData.message,
            emailMessageId: emailInfo ? emailInfo.messageId : null,
            submittedAt: new Date()
        });
        logger.info(`Message saved to Firestore with ID: ${docRef.id}`);
        res.redirect('/contact?success=true');
    } catch (firestoreError) {
        logger.error("Error saving contact form data to Firestore:", firestoreError);
        next(createError(500, "Failed to save message data. Please try again later."));
    }
});

// --- Error Handling ---
// This remains the same
app.use((req, res, next) => {
    next(createError(404));
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    logger.error("Unhandled error caught:", {
        message: err.message,
        status: err.status || 500,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method
    });
    res.locals.message = err.message;
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.locals.error = isDevelopment ? err : {};
    res.status(err.status || 500);
    res.render("error");
});

// --- Export Firebase Function (Gen 2 Syntax) ---

// Define options for the function (region, memory, etc.)
// Adjust the region to your preferred one, e.g., 'asia-south1' for Mumbai
const functionOptions = {
    region: "asia-south1", // Example: Set region to Mumbai
    // memory: "512MB", // Example: Set memory (optional)
    // You can add other options here: timeoutSeconds, secrets, etc.
    // secrets: ["EMAIL_PASSWORD"], // Example for using Secret Manager
};

// Export the Express app as a Gen 2 onRequest function
exports.app = onRequest(functionOptions, app);

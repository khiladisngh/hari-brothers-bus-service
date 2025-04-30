// For local development using a .env file
require("dotenv").config();

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger"); // Use structured logging
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
    'GOOGLE_PLACE_ID',
    'GOOGLE_PLACES_API',
    'EMAIL_USER',          // Your Gmail address used for sending
    'EMAIL_PASSWORD',      // Your 16-character Gmail App Password
    'CONTACT_FORM_RECIPIENT' // The email address to send contact notifications TO
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
    // Consider preventing startup or disabling features dependent on missing vars
}

// --- Nodemailer Transporter Setup ---
// Create the transporter outside of the route handlers for efficiency
let transporter;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASSWORD; // This should be the App Password

if (emailUser && emailPass) {
    transporter = nodemailer.createTransport({
        service: 'gmail', // Use Gmail service
        auth: {
            user: emailUser,
            pass: emailPass, // Use the App Password here
        },
    });
    logger.info("Nodemailer transporter created successfully for Gmail.");

    // Optional: Verify transporter connection (logs error if fails)
    transporter.verify(function(error, success) {
       if (error) {
            logger.error("Nodemailer transporter verification failed:", error);
       } else {
            logger.info("Nodemailer transporter is ready to send messages.");
       }
    });

} else {
    logger.error("Email credentials (EMAIL_USER, EMAIL_PASSWORD) missing. Email sending will be disabled.");
    // transporter remains undefined, handle this in routes needing email
}


// --- Express App Setup ---
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
            logger.info(`Workspaceed ${testimonials.length} testimonials.`); // Fixed typo
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
    let googlePhotos = [];
    const googlePlaceId = process.env.GOOGLE_PLACE_ID;
    const googleApiKey = process.env.GOOGLE_PLACES_API;

    if (!googlePlaceId || !googleApiKey) {
        logger.error("Google Place ID or API Key missing in environment variables.");
    }
    const googleDataUrl = `https://maps.googleapis.com/maps/api/place/details/json?placeid=${googlePlaceId}&key=${googleApiKey}&fields=photos,reviews`;

    try {
        const googleResponse = await axios.get(googleDataUrl);
        if (googleResponse.status === 200 && googleResponse.data && googleResponse.data.result) {
            googlePhotos = googleResponse.data.result.photos || [];
            logger.info(`Workspaceed ${googlePhotos.length} photo references from Google Places API.`); // Fixed typo
        } else {
            logger.warn("Failed to fetch or parse data from Google Places API.", { status: googleResponse.status, data: googleResponse.data });
        }
        setCacheHeaders(res);
        res.render("gallery", {
            googlePhotos: googlePhotos,
            lodash: _
        });
    } catch (error) {
        logger.error("Error in Gallery route:", error);
        if (axios.isAxiosError(error)) {
            logger.error("Axios error details:", { message: error.message, response: error.response?.data });
        }
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

    if (!req.body) {
        logger.warn("Contact form submitted with empty body.");
        return next(createError(400, "Bad Request: No form data received."));
    }

    const formData = req.body;

    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phoneNumber || !formData.message) { // Added email validation
        logger.warn("Contact form submission missing required fields.", { received: formData });
        setCacheHeaders(res);
        return res.status(400).render("contact", {
            error: "Please fill out all required fields.",
            formData: formData
        });
    }

    // --- Email Sending Logic ---
    const emailRecipient = process.env.CONTACT_FORM_RECIPIENT; // Get recipient from env

    // Check if transporter was successfully created and recipient is set
    if (!transporter) {
         logger.error("Nodemailer transporter not available. Cannot send email.");
         // Decide how to handle: maybe still save to DB but show an error?
         // For now, we'll proceed to save to DB but skip email.
         // Alternatively, return an error:
         // return next(createError(500, "Server configuration error preventing email sending."));
    }
    if (!emailRecipient) {
         logger.error("CONTACT_FORM_RECIPIENT environment variable not set. Cannot send email notification.");
         // Again, decide how to handle. Proceeding without email for now.
         // Alternatively, return an error:
         // return next(createError(500, "Server configuration error: Email recipient not set."));
    }

    // Construct email content
    const mailSubject = `New Contact Form Submission from ${formData.firstName} ${formData.lastName}`;
    const mailTextBody = `
        New contact form submission received:

        Name: ${formData.firstName} ${formData.lastName}
        Email: ${formData.email} // Added email
        Phone: ${formData.phoneNumber}
        From: ${formData.fromCity || 'N/A'}, ${formData.fromState || 'N/A'}
        To: ${formData.toCity || 'N/A'}, ${formData.toState || 'N/A'}
        Date: ${formData.date || 'N/A'}

        Message:
        ${formData.message}
    `;
    const mailHtmlBody = `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${formData.firstName} ${formData.lastName}</p>
        <p><strong>Email:</strong> ${formData.email}</p> // Added email
        <p><strong>Phone:</strong> ${formData.phoneNumber}</p>
        <p><strong>From:</strong> ${formData.fromCity || 'N/A'}, ${formData.fromState || 'N/A'}</p>
        <p><strong>To:</strong> ${formData.toCity || 'N/A'}, ${formData.toState || 'N/A'}</p>
        <p><strong>Date:</strong> ${formData.date || 'N/A'}</p>
        <hr>
        <p><strong>Message:</strong></p>
        <p>${formData.message.replace(/\n/g, '<br>')}</p> `; // Added basic newline handling for HTML

    const mailOptions = {
        from: `"Hari Bus Service Website" <${emailUser}>`, // Use the authenticated user as sender
        to: emailRecipient, // Send the notification email TO this address
        replyTo: formData.email, // Set reply-to to the user's email
        subject: mailSubject,
        text: mailTextBody,
        html: mailHtmlBody,
    };

    let emailInfo = null; // To store email sending result

    // Attempt to send email only if transporter and recipient are available
    if (transporter && emailRecipient) {
        try {
            emailInfo = await transporter.sendMail(mailOptions);
            logger.info(`Email sent successfully. Message ID: ${emailInfo.messageId}`);
        } catch (emailError) {
            logger.error("Error sending contact form email:", emailError);
            // Decide if this should prevent saving to Firestore or stop the request
            // For now, log the error and continue to save to Firestore
            // You might want to return an error to the user instead:
            // return next(createError(500, "Failed to send message notification. Please try again later."));
        }
    } else {
         logger.warn("Skipping email notification due to missing configuration (transporter or recipient).");
    }

    // --- Save to Firestore ---
    try {
        const docRef = await db.collection("messages").add({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email, // Added email
            phoneNumber: formData.phoneNumber,
            fromCity: formData.fromCity || null,
            fromState: formData.fromState || null,
            toCity: formData.toCity || null,
            toState: formData.toState || null,
            date: formData.date || null,
            message: formData.message,
            emailMessageId: emailInfo ? emailInfo.messageId : null, // Store Email Message ID if sent
            submittedAt: new Date()
        });
        logger.info(`Message saved to Firestore with ID: ${docRef.id}`);

        // Redirect only if Firestore save was successful
        res.redirect('/contact?success=true');

    } catch (firestoreError) {
        logger.error("Error saving contact form data to Firestore:", firestoreError);
        // This is a more critical error, pass it to the main error handler
        next(createError(500, "Failed to save message data. Please try again later."));
    }
});

// --- Error Handling ---
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

// --- Export Firebase Function ---
exports.app = functions.https.onRequest(app);

// functions/index.js
// Uses onInit() to defer initialization during deployment, avoiding timeout issues

// --- Minimal imports only - no Firebase initialization during module load
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const express = require("express");
const path = require("path");
const ejs = require("ejs");
const cookieParser = require("cookie-parser");
const createError = require("http-errors");
const nodemailer = require("nodemailer");

// --- Global variables (initialized in onInit) ---
let admin;
let db;
let transporter;
let initialized = false;

// --- Deferred Initialization Function ---
async function initialize() {
    if (initialized) return;
    initialized = true;

    logger.info("Initializing Firebase Admin SDK and dependencies");

    try {
        // Initialize Firebase Admin
        admin = require("firebase-admin");
        if (admin.apps.length === 0) {
            admin.initializeApp();
        }
        logger.info("Firebase Admin SDK initialized");

        // Initialize Firestore
        const { getFirestore } = require("firebase-admin/firestore");
        db = getFirestore();
        logger.info("Firestore initialized");

        // Initialize Nodemailer
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
            logger.info("Nodemailer transporter initialized");
        } else {
            logger.warn("Email credentials not configured");
        }
    } catch (error) {
        logger.error("Error during initialization:", error);
        throw error;
    }
}

// --- Helper Functions ---
function getDb() {
    if (!db) {
        throw new Error("Firestore not initialized. Wait for onInit to complete.");
    }
    return db;
}

function getTransporter() {
    return transporter;
}

function getAdmin() {
    if (!admin) {
        throw new Error("Admin SDK not initialized. Wait for onInit to complete.");
    }
    return admin;
}

// --- Express App Setup (fast) ---
const app = express();
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Quick health check endpoints
app.get("/__firebase_health__", (req, res) => {
    res.status(200).send("ok");
});

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        timestamp: Date.now(),
        service: "hari-brothers-bus-service"
    });
});

// Middleware
if (process.env.FUNCTIONS_EMULATOR === 'true') {
    app.use(require('morgan')("tiny"));
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Cache headers helper
const setCacheHeaders = (res, maxAge = 300, sMaxAge = 3600) => {
    res.set("Cache-Control", `public, max-age=${maxAge}, s-maxage=${sMaxAge}`);
    res.set("CDN-Cache-Control", `public, max-age=${sMaxAge}`);
};

// --- Routes ---

// Initialize on first request
app.use(async (req, res, next) => {
    if (!initialized) {
        try {
            await initialize();
        } catch (error) {
            logger.error("Initialization failed", error);
            return res.status(500).json({ error: "Service initialization failed" });
        }
    }
    next();
});

// HOME ROUTE
app.get("/", async (req, res, next) => {
    try {
        const snapshot = await getDb().collection("testimonials").get();
        const testimonials = snapshot.empty ? [] : snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setCacheHeaders(res, 600, 1800);
        res.render("home", { testimonials });
    } catch (error) {
        logger.error("Error fetching testimonials:", error);
        next(error);
    }
});

// TOURS ROUTE
app.get("/tours", async (req, res, next) => {
    try {
        const snapshot = await getDb().collection("tours").orderBy("tourName", "asc").get();
        const tours = snapshot.empty ? [] : snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setCacheHeaders(res, 3600, 7200);
        res.render("tours", { toursData: tours });
    } catch (error) {
        logger.error("Error fetching tours:", error);
        next(error);
    }
});

// GALLERY ROUTE
app.get("/gallery", async (req, res, next) => {
    try {
        const snapshot = await getDb().collection("galleryImages").orderBy("order", "asc").get();
        const galleryItems = snapshot.empty ? [] : snapshot.docs.map(doc => ({
            id: doc.id,
            imageUrl: doc.data().imageUrl || '',
            altText: doc.data().altText || "Gallery Image"
        }));

        setCacheHeaders(res, 3600, 7200);
        res.render("gallery", { galleryItems });
    } catch (error) {
        logger.error("Error fetching gallery items:", error);
        next(error);
    }
});

// ABOUT ROUTE
app.get("/about", (req, res) => {
    setCacheHeaders(res, 86400, 86400);
    res.render("about");
});

// PAY ROUTE
app.get("/pay", (req, res) => {
    setCacheHeaders(res, 86400, 86400);
    res.render("pay");
});

// CONTACT ROUTE - GET
app.get("/contact", (req, res) => {
    res.render("contact", { success: req.query.success === 'true' });
});

// CONTACT ROUTE - POST
app.post("/contact", async (req, res, next) => {
    try {
        if (!req.body) {
            return next(createError(400, "Bad Request"));
        }

        const { firstName, lastName, email, phoneNumber, message } = req.body;

        if (!firstName || !lastName || !email || !phoneNumber || !message) {
            return res.status(400).render("contact", {
                error: "Please fill out all required fields.",
                formData: req.body
            });
        }

        // Send email if configured
        let emailInfo = null;
        const emailTransporter = getTransporter();
        const emailRecipient = process.env.CONTACT_FORM_RECIPIENT;
        const emailUser = process.env.EMAIL_USER;

        if (emailTransporter && emailRecipient && emailUser) {
            try {
                emailInfo = await emailTransporter.sendMail({
                    from: `"Hari Bus Service Website" <${emailUser}>`,
                    to: emailRecipient,
                    replyTo: email,
                    subject: `New Contact Form Submission from ${firstName} ${lastName}`,
                    text: `Name: ${firstName} ${lastName}\nEmail: ${email}\nPhone: ${phoneNumber}\n\nMessage:\n${message}`,
                    html: `<p><strong>Name:</strong> ${firstName} ${lastName}</p><p><strong>Email:</strong> ${email}</p><p><strong>Phone:</strong> ${phoneNumber}</p><p><strong>Message:</strong></p><p>${message}</p>`
                });
                logger.info(`Email sent: ${emailInfo.messageId}`);
            } catch (emailError) {
                logger.warn("Email sending failed: " + emailError.message);
            }
        }

        // Save to Firestore
        const docRef = await getDb().collection("messages").add({
            firstName,
            lastName,
            email,
            phoneNumber,
            message,
            emailMessageId: emailInfo?.messageId || null,
            submittedAt: getAdmin().firestore.FieldValue.serverTimestamp()
        });

        logger.info(`Message saved: ${docRef.id}`);
        res.redirect('/contact?success=true');
    } catch (error) {
        logger.error("Contact form error:", error);
        next(error);
    }
});

// --- Error Handling ---
app.use((req, res, next) => {
    next(createError(404));
});

app.use((err, req, res, next) => {
    const status = err.status || 500;
    logger.error("Error:", { message: err.message, status, url: req.originalUrl });

    res.locals.message = err.message;
    res.locals.error = process.env.FUNCTIONS_EMULATOR === 'true' ? err : {};
    res.status(status).render("error");
});

// --- Export Firebase Function (Gen 2) ---
exports.app = onRequest({
    region: "asia-south1",
    secrets: ["EMAIL_PASSWORD"],
    timeoutSeconds: 120,
    memory: "512MB",
}, app);

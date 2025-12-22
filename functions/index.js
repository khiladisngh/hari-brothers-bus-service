// functions/index.js
// ULTRA-MINIMAL bootstrap for fast HTTP discovery
// ALL requires and initialization deferred until first request

// --- Global variables (everything initialized lazily) ---
let express, path, ejs, cookieParser, createError, nodemailer, logger, admin, db, transporter, app;
let initialized = false;

// --- Deferred Initialization Function ---
async function initialize() {
    if (initialized) return;
    initialized = true;

    const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";

    // Require packages on first use
    logger = require("firebase-functions/logger");
    express = require("express");
    path = require("path");
    ejs = require("ejs");
    cookieParser = require("cookie-parser");
    createError = require("http-errors");
    nodemailer = require("nodemailer");

    logger.info("Initializing Firebase Admin SDK and dependencies", { isEmulator });

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

    // --- Express App Setup ---
    app = express();
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
        const morgan = require('morgan');
        app.use(morgan("tiny"));
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

    // HOME ROUTE
    app.get("/", async (req, res, next) => {
        try {
            const snapshot = await db.collection("testimonials").get();
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
            const snapshot = await db.collection("tours").orderBy("tourName", "asc").get();
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
            const snapshot = await db.collection("galleryImages").orderBy("order", "asc").get();
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
            const emailRecipient = process.env.CONTACT_FORM_RECIPIENT;
            const emailUser = process.env.EMAIL_USER;

            if (transporter && emailRecipient && emailUser) {
                try {
                    emailInfo = await transporter.sendMail({
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
            const docRef = await db.collection("messages").add({
                firstName,
                lastName,
                email,
                phoneNumber,
                message,
                emailMessageId: emailInfo?.messageId || null,
                submittedAt: admin.firestore.FieldValue.serverTimestamp()
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

    logger.info("Application initialized successfully");
}

// --- Export Firebase Function IMMEDIATELY (no requires!) ---
// This must be ULTRA-FAST for HTTP discovery (< 10 seconds)
const functions = require('firebase-functions');

// Wrapper that initializes on first request
exports.app = functions.https.onRequest(async (req, res) => {
    // Initialize app on first request
    if (!initialized) {
        await initialize();
    }

    // Now handle the request with the initialized app
    return app(req, res);
});

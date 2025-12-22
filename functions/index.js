// functions/index.js
// ULTRA-MINIMAL bootstrap for fast HTTP discovery
// ALL requires and initialization deferred until first request

let app;
let initialized = false;

// --- Deferred Initialization Function ---
async function initialize() {
    if (initialized) return;
    initialized = true;

    const logger = require("firebase-functions/logger");
    logger.info("Starting application initialization");

    try {
        // Initialize Firebase Admin and Firestore
        const { initializeFirebase } = require('./config/firebase');
        initializeFirebase();

        // Initialize Nodemailer
        const { initializeNodemailer } = require('./config/nodemailer');
        initializeNodemailer();

        // Create and configure Express app
        const { createExpressApp } = require('./config/express');
        app = createExpressApp();

        // Add request logging middleware
        const { requestLogger } = require('./middleware/logger');
        app.use(requestLogger);

        // Register all routes
        const { registerRoutes } = require('./routes');
        registerRoutes(app);

        // Add error handling middleware (must be last)
        const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
        app.use(notFoundHandler);
        app.use(errorHandler);

        logger.info("Application initialized successfully");
    } catch (error) {
        const logger = require("firebase-functions/logger");
        logger.error("Initialization failed", { error: error.message, stack: error.stack });
        throw error;
    }
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

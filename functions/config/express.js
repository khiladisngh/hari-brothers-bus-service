// config/express.js
// Express application configuration with performance optimizations

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const { etagMiddleware } = require("../middleware/cache");
const logger = require("firebase-functions/logger");

/**
 * Create and configure Express application
 */
function createExpressApp() {
    const app = express();
    
    // Enable gzip/deflate compression for all responses
    // Compresses text-based responses (HTML, CSS, JS, JSON)
    app.use(compression({
        level: 6, // Compression level (0-9, 6 is good balance)
        threshold: 1024, // Only compress responses > 1KB
        filter: (req, res) => {
            // Don't compress if client doesn't support it
            if (req.headers['x-no-compression']) {
                return false;
            }
            // Use compression's default filter
            return compression.filter(req, res);
        }
    }));
    
    // Enable ETag support for 304 Not Modified responses
    app.use(etagMiddleware);
    
    // View engine setup
    app.set("views", path.join(__dirname, "..", "views"));
    app.set("view engine", "ejs");
    
    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    
    // Request logging in emulator mode
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        const morgan = require('morgan');
        app.use(morgan("tiny"));
    }
    
    logger.info("Express app configured with compression and ETag support");
    
    return app;
}

module.exports = { createExpressApp };

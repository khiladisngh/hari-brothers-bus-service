// config/express.js
// Express application configuration

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("firebase-functions/logger");

/**
 * Create and configure Express application
 */
function createExpressApp() {
    const app = express();
    
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
    
    logger.info("Express app configured");
    
    return app;
}

module.exports = { createExpressApp };

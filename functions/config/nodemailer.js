// config/nodemailer.js
// Email transporter configuration

const nodemailer = require("nodemailer");
const logger = require("firebase-functions/logger");

let transporter = null;

/**
 * Initialize Nodemailer transporter
 * Safe to call multiple times - will only initialize once
 */
function initializeNodemailer() {
    if (transporter) {
        return transporter;
    }

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
        logger.warn("Email credentials not configured - email functionality disabled");
    }
    
    return transporter;
}

module.exports = { initializeNodemailer, getTransporter: () => transporter };

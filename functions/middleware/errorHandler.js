// middleware/errorHandler.js
// Error handling middleware

const createError = require("http-errors");
const logger = require("firebase-functions/logger");

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res, next) {
    next(createError(404));
}

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
    const status = err.status || 500;
    
    logger.error("Error occurred", {
        message: err.message,
        status,
        url: req.originalUrl,
        method: req.method,
        stack: process.env.FUNCTIONS_EMULATOR === 'true' ? err.stack : undefined
    });

    res.locals.message = err.message;
    res.locals.error = process.env.FUNCTIONS_EMULATOR === 'true' ? err : {};
    res.status(status).render("error");
}

module.exports = { notFoundHandler, errorHandler };

// middleware/errorHandler.js
// Error handling middleware with structured logging

const createError = require("http-errors");
const { logError, LogSeverity, log } = require("./logger");

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res, next) {
    log(
        LogSeverity.WARNING,
        '404 Not Found',
        {
            path: req.path,
            method: req.method,
            referer: req.get('referer') || 'direct'
        },
        req.correlationId
    );
    next(createError(404));
}

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
    const status = err.status || 500;
    const isServerError = status >= 500;
    
    // Log error with appropriate severity
    logError(
        err,
        `${req.method} ${req.path}`,
        req.correlationId
    );

    // Log additional context for server errors
    if (isServerError) {
        log(
            LogSeverity.ERROR,
            'Server error context',
            {
                statusCode: status,
                url: req.originalUrl,
                method: req.method,
                headers: req.headers,
                body: req.body,
                query: req.query
            },
            req.correlationId
        );
    }

    res.locals.message = err.message;
    res.locals.error = process.env.FUNCTIONS_EMULATOR === 'true' ? err : {};
    res.status(status).render("error");
}

module.exports = { notFoundHandler, errorHandler };

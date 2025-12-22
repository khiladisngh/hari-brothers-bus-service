// middleware/errorHandler.js
// Error handling middleware with structured logging and custom error pages

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
 * Global error handler with custom error pages
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

    // Set response locals
    res.locals.message = err.message;
    res.locals.error = process.env.FUNCTIONS_EMULATOR === 'true' ? err : {};
    
    // Use custom error pages
    res.status(status);
    
    if (status === 404) {
        return res.render('404');
    }
    
    if (isServerError) {
        return res.render('500');
    }
    
    // Fallback to generic error page
    res.render('error');
}

module.exports = { notFoundHandler, errorHandler };

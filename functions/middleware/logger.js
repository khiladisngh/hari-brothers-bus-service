// middleware/logger.js
// Request logging middleware

const logger = require("firebase-functions/logger");
const crypto = require("crypto");

/**
 * Generate unique correlation ID for request tracing
 */
function generateCorrelationId() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Request logging middleware with correlation ID
 */
function requestLogger(req, res, next) {
    req.correlationId = generateCorrelationId();
    req.startTime = Date.now();
    
    // Log when response finishes
    res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        
        logger.info("Request completed", {
            correlationId: req.correlationId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('user-agent')
        });
    });
    
    next();
}

module.exports = { requestLogger };

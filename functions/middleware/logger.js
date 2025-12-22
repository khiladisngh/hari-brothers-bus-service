// middleware/logger.js
// Structured logging middleware with performance tracking

const logger = require("firebase-functions/logger");
const crypto = require("crypto");

/**
 * Log severity levels matching Cloud Logging
 */
const LogSeverity = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    NOTICE: 'NOTICE',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    CRITICAL: 'CRITICAL',
    ALERT: 'ALERT',
    EMERGENCY: 'EMERGENCY'
};

/**
 * Generate unique correlation ID for request tracing
 */
function generateCorrelationId() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Create structured log entry
 * @param {string} severity - Log severity level
 * @param {string} message - Log message
 * @param {Object} data - Additional structured data
 * @param {string} correlationId - Request correlation ID
 */
function createStructuredLog(severity, message, data = {}, correlationId = null) {
    const logEntry = {
        severity,
        message,
        timestamp: new Date().toISOString(),
        ...data
    };

    if (correlationId) {
        logEntry.correlationId = correlationId;
    }

    return logEntry;
}

/**
 * Log with structured format
 * @param {string} severity - Log severity level
 * @param {string} message - Log message
 * @param {Object} data - Additional data
 * @param {string} correlationId - Request correlation ID
 */
function log(severity, message, data = {}, correlationId = null) {
    const entry = createStructuredLog(severity, message, data, correlationId);

    switch (severity) {
        case LogSeverity.DEBUG:
            logger.debug(message, entry);
            break;
        case LogSeverity.WARNING:
            logger.warn(message, entry);
            break;
        case LogSeverity.ERROR:
        case LogSeverity.CRITICAL:
        case LogSeverity.ALERT:
        case LogSeverity.EMERGENCY:
            logger.error(message, entry);
            break;
        default:
            logger.info(message, entry);
    }
}

/**
 * Log error with stack trace
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 * @param {string} correlationId - Request correlation ID
 */
function logError(error, context = 'Unknown', correlationId = null) {
    log(
        LogSeverity.ERROR,
        `Error in ${context}: ${error.message}`,
        {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack,
            context
        },
        correlationId
    );
}

/**
 * Performance timing utility
 */
class PerformanceTimer {
    constructor(correlationId) {
        this.correlationId = correlationId;
        this.marks = new Map();
        this.startTime = Date.now();
    }

    /**
     * Mark a timing point
     * @param {string} name - Name of the timing mark
     */
    mark(name) {
        this.marks.set(name, Date.now());
    }

    /**
     * Get duration from start or between two marks
     * @param {string} from - Start mark name (null for start time)
     * @param {string} to - End mark name (null for now)
     */
    getDuration(from = null, to = null) {
        const startTime = from ? this.marks.get(from) : this.startTime;
        const endTime = to ? this.marks.get(to) : Date.now();
        return endTime - startTime;
    }

    /**
     * Log performance metrics
     * @param {string} operation - Operation name
     * @param {Object} additionalData - Additional metrics
     */
    logMetrics(operation, additionalData = {}) {
        const duration = this.getDuration();
        log(
            LogSeverity.INFO,
            `Performance: ${operation}`,
            {
                operation,
                durationMs: duration,
                marks: Object.fromEntries(
                    Array.from(this.marks.entries()).map(([name, time]) => [
                        name,
                        time - this.startTime
                    ])
                ),
                ...additionalData
            },
            this.correlationId
        );
    }
}

/**
 * Request logging middleware with performance tracking
 */
function requestLogger(req, res, next) {
    req.correlationId = generateCorrelationId();
    req.startTime = Date.now();
    req.perfTimer = new PerformanceTimer(req.correlationId);

    // Log request start
    log(
        LogSeverity.DEBUG,
        'Request started',
        {
            method: req.method,
            path: req.path,
            query: req.query,
            ip: req.ip
        },
        req.correlationId
    );
    
    // Log when response finishes
    res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        const isError = res.statusCode >= 400;
        
        log(
            isError ? LogSeverity.WARNING : LogSeverity.INFO,
            'Request completed',
            {
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                durationMs: duration,
                userAgent: req.get('user-agent'),
                referer: req.get('referer') || 'direct'
            },
            req.correlationId
        );

        // Log slow requests
        if (duration > 1000) {
            log(
                LogSeverity.WARNING,
                'Slow request detected',
                {
                    method: req.method,
                    path: req.path,
                    durationMs: duration,
                    threshold: '1000ms'
                },
                req.correlationId
            );
        }
    });
    
    next();
}

module.exports = {
    requestLogger,
    log,
    logError,
    LogSeverity,
    PerformanceTimer
};

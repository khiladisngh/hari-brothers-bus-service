// utils/retry.js
// Retry logic for transient failures

const { log, logError, LogSeverity } = require('../middleware/logger');

/**
 * Retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
    maxAttempts: 3,
    initialDelay: 100, // ms
    maxDelay: 2000, // ms
    backoffMultiplier: 2,
    retryableErrors: [
        'UNAVAILABLE',
        'DEADLINE_EXCEEDED',
        'RESOURCE_EXHAUSTED',
        'INTERNAL',
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND'
    ]
};

/**
 * Check if error is retryable
 * @param {Error} error - Error to check
 * @param {Array<string>} retryableErrors - List of retryable error codes
 * @returns {boolean} True if error should be retried
 */
function isRetryableError(error, retryableErrors = DEFAULT_RETRY_CONFIG.retryableErrors) {
    if (!error) return false;
    
    // Check error code
    if (error.code && retryableErrors.includes(error.code)) {
        return true;
    }
    
    // Check error message
    const message = error.message || '';
    return retryableErrors.some(code => 
        message.toUpperCase().includes(code)
    );
}

/**
 * Calculate delay for retry attempt with exponential backoff
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {Object} config - Retry configuration
 * @returns {number} Delay in milliseconds
 */
function calculateDelay(attempt, config = DEFAULT_RETRY_CONFIG) {
    const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
    return Math.min(delay, config.maxDelay);
}

/**
 * Sleep for specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {Object} config - Retry configuration
 * @param {string} operationName - Name for logging
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<*>} Result of successful operation
 */
async function retryOperation(
    operation,
    config = DEFAULT_RETRY_CONFIG,
    operationName = 'operation',
    correlationId = null
) {
    const maxAttempts = config.maxAttempts || DEFAULT_RETRY_CONFIG.maxAttempts;
    let lastError;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const result = await operation();
            
            // Log successful retry
            if (attempt > 0) {
                log(
                    LogSeverity.INFO,
                    `Operation succeeded after ${attempt + 1} attempts`,
                    {
                        operation: operationName,
                        attempts: attempt + 1
                    },
                    correlationId
                );
            }
            
            return result;
        } catch (error) {
            lastError = error;
            
            // Check if we should retry
            if (!isRetryableError(error, config.retryableErrors)) {
                log(
                    LogSeverity.WARNING,
                    'Non-retryable error encountered',
                    {
                        operation: operationName,
                        error: error.message,
                        errorCode: error.code
                    },
                    correlationId
                );
                throw error;
            }
            
            // Check if we have more attempts
            const isLastAttempt = attempt === maxAttempts - 1;
            if (isLastAttempt) {
                break;
            }
            
            // Calculate delay and retry
            const delay = calculateDelay(attempt, config);
            
            log(
                LogSeverity.WARNING,
                `Retryable error, attempting retry`,
                {
                    operation: operationName,
                    attempt: attempt + 1,
                    maxAttempts,
                    delayMs: delay,
                    error: error.message,
                    errorCode: error.code
                },
                correlationId
            );
            
            await sleep(delay);
        }
    }
    
    // All attempts failed
    logError(
        lastError,
        `${operationName} failed after ${maxAttempts} attempts`,
        correlationId
    );
    
    throw lastError;
}

/**
 * Wrap a Firestore operation with retry logic
 * @param {Function} firestoreOp - Firestore operation function
 * @param {string} operationName - Name for logging
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<*>} Result of operation
 */
async function withRetry(firestoreOp, operationName, correlationId = null) {
    return retryOperation(
        firestoreOp,
        DEFAULT_RETRY_CONFIG,
        operationName,
        correlationId
    );
}

module.exports = {
    retryOperation,
    withRetry,
    isRetryableError,
    DEFAULT_RETRY_CONFIG
};

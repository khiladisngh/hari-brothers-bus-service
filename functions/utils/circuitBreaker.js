// utils/circuitBreaker.js
// Circuit breaker pattern for external services

const { log, LogSeverity } = require('../middleware/logger');

/**
 * Circuit breaker states
 */
const CircuitState = {
    CLOSED: 'CLOSED',     // Normal operation
    OPEN: 'OPEN',         // Failures detected, rejecting requests
    HALF_OPEN: 'HALF_OPEN' // Testing if service recovered
};

/**
 * Circuit Breaker implementation
 */
class CircuitBreaker {
    constructor(options = {}) {
        this.failureThreshold = options.failureThreshold || 5;
        this.successThreshold = options.successThreshold || 2;
        this.timeout = options.timeout || 60000; // 60 seconds
        this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
        
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.nextAttempt = Date.now();
        this.name = options.name || 'CircuitBreaker';
    }

    /**
     * Get current circuit state
     */
    getState() {
        return this.state;
    }

    /**
     * Get circuit statistics
     */
    getStats() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            nextAttempt: this.nextAttempt > Date.now() 
                ? new Date(this.nextAttempt).toISOString() 
                : 'now'
        };
    }

    /**
     * Execute operation with circuit breaker
     * @param {Function} operation - Async operation to execute
     * @param {string} correlationId - Request correlation ID
     * @returns {Promise<*>} Result of operation or fallback
     */
    async execute(operation, correlationId = null) {
        // Check if circuit is open
        if (this.state === CircuitState.OPEN) {
            if (Date.now() < this.nextAttempt) {
                const error = new Error('Circuit breaker is OPEN');
                error.circuitState = this.state;
                
                log(
                    LogSeverity.WARNING,
                    'Circuit breaker is OPEN, rejecting request',
                    {
                        circuitBreaker: this.name,
                        state: this.state,
                        nextAttemptIn: this.nextAttempt - Date.now()
                    },
                    correlationId
                );
                
                throw error;
            }
            
            // Try to transition to HALF_OPEN
            this.state = CircuitState.HALF_OPEN;
            this.successCount = 0;
            
            log(
                LogSeverity.INFO,
                'Circuit breaker transitioning to HALF_OPEN',
                { circuitBreaker: this.name },
                correlationId
            );
        }

        try {
            const result = await operation();
            this.onSuccess(correlationId);
            return result;
        } catch (error) {
            this.onFailure(correlationId);
            throw error;
        }
    }

    /**
     * Handle successful operation
     */
    onSuccess(correlationId = null) {
        this.failureCount = 0;

        if (this.state === CircuitState.HALF_OPEN) {
            this.successCount++;
            
            if (this.successCount >= this.successThreshold) {
                this.state = CircuitState.CLOSED;
                this.successCount = 0;
                
                log(
                    LogSeverity.INFO,
                    'Circuit breaker CLOSED after successful recovery',
                    { 
                        circuitBreaker: this.name,
                        successThreshold: this.successThreshold 
                    },
                    correlationId
                );
            }
        }
    }

    /**
     * Handle failed operation
     */
    onFailure(correlationId = null) {
        this.failureCount++;

        if (this.state === CircuitState.HALF_OPEN) {
            // Failed during recovery, go back to OPEN
            this.state = CircuitState.OPEN;
            this.nextAttempt = Date.now() + this.resetTimeout;
            
            log(
                LogSeverity.WARNING,
                'Circuit breaker reopened after failure in HALF_OPEN state',
                { 
                    circuitBreaker: this.name,
                    resetTimeoutMs: this.resetTimeout 
                },
                correlationId
            );
        } else if (this.failureCount >= this.failureThreshold) {
            // Too many failures, open the circuit
            this.state = CircuitState.OPEN;
            this.nextAttempt = Date.now() + this.resetTimeout;
            
            log(
                LogSeverity.ERROR,
                'Circuit breaker OPENED due to failures',
                {
                    circuitBreaker: this.name,
                    failureCount: this.failureCount,
                    failureThreshold: this.failureThreshold,
                    resetTimeoutMs: this.resetTimeout
                },
                correlationId
            );
        }
    }

    /**
     * Manually reset the circuit breaker
     */
    reset() {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.nextAttempt = Date.now();
        
        log(
            LogSeverity.INFO,
            'Circuit breaker manually reset',
            { circuitBreaker: this.name }
        );
    }
}

// Global circuit breaker for email service
const emailCircuitBreaker = new CircuitBreaker({
    name: 'EmailService',
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 60000,
    resetTimeout: 30000
});

module.exports = {
    CircuitBreaker,
    CircuitState,
    emailCircuitBreaker
};

// controllers/testimonials.js
// Testimonials data controller with structured logging, caching, and retry logic

const { getDb } = require('../config/firebase');
const { log, logError, LogSeverity, PerformanceTimer } = require('../middleware/logger');
const { cache } = require('../middleware/memoryCache');
const { withRetry } = require('../utils/retry');

// Cache TTL: 30 minutes (displayed on home page)
const CACHE_TTL = 1800;

/**
 * Fetch all testimonials from Firestore
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Array>} Array of testimonial objects
 */
async function getAllTestimonials(correlationId = null) {
    const perfTimer = new PerformanceTimer(correlationId);
    const cacheKey = 'testimonials:all';
    
    try {
        const testimonials = await cache.getOrSet(
            cacheKey,
            async () => {
                const db = getDb();
                perfTimer.mark('db-query-start');

                // Wrap Firestore query with retry logic
                const snapshot = await withRetry(
                    () => db.collection("testimonials").get(),
                    'fetchTestimonials',
                    correlationId
                );
                perfTimer.mark('db-query-end');
                
                return snapshot.empty
                    ? []
                    : snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            },
            CACHE_TTL,
            correlationId
        );
        
        log(
            LogSeverity.INFO,
            'Testimonials fetched successfully',
            {
                operation: 'getAllTestimonials',
                count: testimonials.length,
                cached: perfTimer.getDuration() < 10,
                queryTimeMs: perfTimer.getDuration('db-query-start', 'db-query-end') || 0,
                totalTimeMs: perfTimer.getDuration()
            },
            correlationId
        );
        
        return testimonials;
    } catch (error) {
        logError(error, 'getAllTestimonials', correlationId);
        
        // Graceful degradation: return cached data even if expired, or empty array
        const staleData = cache.get(cacheKey);
        if (staleData) {
            log(
                LogSeverity.WARNING,
                'Returning stale cache data due to error',
                { operation: 'getAllTestimonials' },
                correlationId
            );
            return staleData;
        }
        
        // Return empty array as last resort
        log(
            LogSeverity.ERROR,
            'No data available, returning empty array',
            { operation: 'getAllTestimonials' },
            correlationId
        );
        return [];
    }
}

module.exports = { getAllTestimonials };

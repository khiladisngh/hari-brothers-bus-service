// controllers/testimonials.js
// Testimonials data controller with structured logging and caching

const { getDb } = require('../config/firebase');
const { log, logError, LogSeverity, PerformanceTimer } = require('../middleware/logger');
const { cache } = require('../middleware/memoryCache');

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

                const snapshot = await db.collection("testimonials").get();
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
        throw error;
    }
}

module.exports = { getAllTestimonials };

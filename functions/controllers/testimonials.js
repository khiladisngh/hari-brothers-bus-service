// controllers/testimonials.js
// Testimonials data controller with structured logging

const { getDb } = require('../config/firebase');
const { log, logError, LogSeverity, PerformanceTimer } = require('../middleware/logger');

/**
 * Fetch all testimonials from Firestore
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Array>} Array of testimonial objects
 */
async function getAllTestimonials(correlationId = null) {
    const perfTimer = new PerformanceTimer(correlationId);
    
    try {
        const db = getDb();
        perfTimer.mark('db-query-start');

        const snapshot = await db.collection("testimonials").get();
        perfTimer.mark('db-query-end');
        
        const testimonials = snapshot.empty
            ? []
            : snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        log(
            LogSeverity.INFO,
            'Testimonials fetched successfully',
            {
                operation: 'getAllTestimonials',
                count: testimonials.length,
                queryTimeMs: perfTimer.getDuration('db-query-start', 'db-query-end'),
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

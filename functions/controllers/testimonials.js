// controllers/testimonials.js
// Testimonials data controller

const { getDb } = require('../config/firebase');
const logger = require('firebase-functions/logger');

/**
 * Fetch all testimonials from Firestore
 * @returns {Promise<Array>} Array of testimonial objects
 */
async function getAllTestimonials() {
    const startTime = Date.now();
    
    try {
        const db = getDb();
        const snapshot = await db.collection("testimonials").get();
        
        const testimonials = snapshot.empty
            ? []
            : snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        logger.info("Testimonials fetched", {
            count: testimonials.length,
            duration: `${Date.now() - startTime}ms`
        });
        
        return testimonials;
    } catch (error) {
        logger.error("Error fetching testimonials", { error: error.message });
        throw error;
    }
}

module.exports = { getAllTestimonials };

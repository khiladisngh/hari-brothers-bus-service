// controllers/tours.js
// Tours data controller

const { getDb } = require('../config/firebase');
const logger = require('firebase-functions/logger');

/**
 * Fetch all tours from Firestore, ordered by name
 * @returns {Promise<Array>} Array of tour objects
 */
async function getAllTours() {
    const startTime = Date.now();
    
    try {
        const db = getDb();
        const snapshot = await db.collection("tours").orderBy("tourName", "asc").get();
        
        const tours = snapshot.empty
            ? []
            : snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        logger.info("Tours fetched", {
            count: tours.length,
            duration: `${Date.now() - startTime}ms`
        });
        
        return tours;
    } catch (error) {
        logger.error("Error fetching tours", { error: error.message });
        throw error;
    }
}

module.exports = { getAllTours };

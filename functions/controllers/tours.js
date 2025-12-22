// controllers/tours.js
// Tours data controller with structured logging

const { getDb } = require('../config/firebase');
const { log, logError, LogSeverity, PerformanceTimer } = require('../middleware/logger');

/**
 * Fetch all tours from Firestore, ordered by name
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Array>} Array of tour objects
 */
async function getAllTours(correlationId = null) {
    const perfTimer = new PerformanceTimer(correlationId);
    
    try {
        const db = getDb();
        perfTimer.mark('db-query-start');

        const snapshot = await db.collection("tours").orderBy("tourName", "asc").get();
        perfTimer.mark('db-query-end');
        
        const tours = snapshot.empty
            ? []
            : snapshot.docs.map(doc => {
                const data = doc.data();
                // Support both old and new format for tour places
                const tourPlaces = data.tourPlaces?.map(place => ({
                    ...place,
                    // Support old format (imageUrl) and new format (imageUrls)
                    imageUrl: place.imageUrl || place.imageUrls?.jpeg?.medium || null,
                    imageUrls: place.imageUrls || null
                })) || [];

                return {
                    id: doc.id,
                    ...data,
                    tourPlaces
                };
            });
        
        perfTimer.mark('mapping-complete');

        log(
            LogSeverity.INFO,
            'Tours fetched successfully',
            {
                operation: 'getAllTours',
                count: tours.length,
                totalPlaces: tours.reduce((sum, tour) => sum + (tour.tourPlaces?.length || 0), 0),
                queryTimeMs: perfTimer.getDuration('db-query-start', 'db-query-end'),
                totalTimeMs: perfTimer.getDuration()
            },
            correlationId
        );
        
        return tours;
    } catch (error) {
        logError(error, 'getAllTours', correlationId);
        throw error;
    }
}

module.exports = { getAllTours };

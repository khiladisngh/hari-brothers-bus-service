// controllers/tours.js
// Tours data controller with structured logging, caching, and retry logic

const { getDb } = require('../config/firebase');
const { log, logError, LogSeverity, PerformanceTimer } = require('../middleware/logger');
const { cache } = require('../middleware/memoryCache');
const { withRetry } = require('../utils/retry');

// Cache TTL: 1 hour (data changes infrequently)
const CACHE_TTL = 3600;

/**
 * Fetch all tours from Firestore, ordered by name
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Array>} Array of tour objects
 */
async function getAllTours(correlationId = null) {
    const perfTimer = new PerformanceTimer(correlationId);
    const cacheKey = 'tours:all';
    
    try {
        const tours = await cache.getOrSet(
            cacheKey,
            async () => {
                const db = getDb();
                perfTimer.mark('db-query-start');

                // Wrap Firestore query with retry logic
                const snapshot = await withRetry(
                    () => db.collection("tours").orderBy("tourName", "asc").get(),
                    'fetchTours',
                    correlationId
                );
                perfTimer.mark('db-query-end');
                
                const result = snapshot.empty
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
                return result;
            },
            CACHE_TTL,
            correlationId
        );

        log(
            LogSeverity.INFO,
            'Tours fetched successfully',
            {
                operation: 'getAllTours',
                count: tours.length,
                totalPlaces: tours.reduce((sum, tour) => sum + (tour.tourPlaces?.length || 0), 0),
                cached: perfTimer.getDuration() < 10,
                queryTimeMs: perfTimer.getDuration('db-query-start', 'db-query-end') || 0,
                totalTimeMs: perfTimer.getDuration()
            },
            correlationId
        );
        
        return tours;
    } catch (error) {
        logError(error, 'getAllTours', correlationId);
        
        // Graceful degradation: return cached data even if expired, or empty array
        const staleData = cache.get(cacheKey);
        if (staleData) {
            log(
                LogSeverity.WARNING,
                'Returning stale cache data due to error',
                { operation: 'getAllTours' },
                correlationId
            );
            return staleData;
        }
        
        // Return empty array as last resort
        log(
            LogSeverity.ERROR,
            'No data available, returning empty array',
            { operation: 'getAllTours' },
            correlationId
        );
        return [];
    }
}

module.exports = { getAllTours };

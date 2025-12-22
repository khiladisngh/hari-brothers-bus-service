// controllers/gallery.js
// Gallery data controller with structured logging and caching

const { getDb } = require('../config/firebase');
const { log, logError, LogSeverity, PerformanceTimer } = require('../middleware/logger');
const { cache } = require('../middleware/memoryCache');

// Cache TTL: 1 hour (data changes infrequently)
const CACHE_TTL = 3600;

/**
 * Fetch all gallery images from Firestore, ordered by order field
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Array>} Array of gallery image objects
 */
async function getAllGalleryImages(correlationId = null) {
    const perfTimer = new PerformanceTimer(correlationId);
    const cacheKey = 'gallery:all';
    
    try {
        // Try to get from cache
        const galleryItems = await cache.getOrSet(
            cacheKey,
            async () => {
                const db = getDb();
                perfTimer.mark('db-query-start');

                const snapshot = await db.collection("galleryImages").orderBy("order", "asc").get();
                perfTimer.mark('db-query-end');
        
        const galleryItems = snapshot.empty
            ? []
            : snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    // Support both old format (imageUrl) and new format (imageUrls)
                    imageUrl: data.imageUrl || data.imageUrls?.jpeg?.medium || '',
                    imageUrls: data.imageUrls || null, // New format with multiple sizes
                    altText: data.altText || "Gallery Image"
                };
            });
        
                perfTimer.mark('mapping-complete');
                return snapshot.empty ? [] : snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        imageUrl: data.imageUrl || data.imageUrls?.jpeg?.medium || '',
                        imageUrls: data.imageUrls || null,
                        altText: data.altText || "Gallery Image"
                    };
                });
            },
            CACHE_TTL,
            correlationId
        );

        log(
            LogSeverity.INFO,
            'Gallery images fetched successfully',
            {
                operation: 'getAllGalleryImages',
                count: galleryItems.length,
                cached: perfTimer.getDuration() < 10,
                queryTimeMs: perfTimer.getDuration('db-query-start', 'db-query-end') || 0,
                totalTimeMs: perfTimer.getDuration()
            },
            correlationId
        );
        
        return galleryItems;
    } catch (error) {
        logError(error, 'getAllGalleryImages', correlationId);
        throw error;
    }
}

module.exports = { getAllGalleryImages };

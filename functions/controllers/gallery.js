// controllers/gallery.js
// Gallery data controller with structured logging

const { getDb } = require('../config/firebase');
const { log, logError, LogSeverity, PerformanceTimer } = require('../middleware/logger');

/**
 * Fetch all gallery images from Firestore, ordered by order field
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Array>} Array of gallery image objects
 */
async function getAllGalleryImages(correlationId = null) {
    const perfTimer = new PerformanceTimer(correlationId);
    
    try {
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

        log(
            LogSeverity.INFO,
            'Gallery images fetched successfully',
            {
                operation: 'getAllGalleryImages',
                count: galleryItems.length,
                queryTimeMs: perfTimer.getDuration('db-query-start', 'db-query-end'),
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

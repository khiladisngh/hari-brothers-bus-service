// controllers/gallery.js
// Gallery data controller

const { getDb } = require('../config/firebase');
const logger = require('firebase-functions/logger');

/**
 * Fetch all gallery images from Firestore, ordered by order field
 * @returns {Promise<Array>} Array of gallery image objects
 */
async function getAllGalleryImages() {
    const startTime = Date.now();
    
    try {
        const db = getDb();
        const snapshot = await db.collection("galleryImages").orderBy("order", "asc").get();
        
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
        
        logger.info("Gallery images fetched", {
            count: galleryItems.length,
            duration: `${Date.now() - startTime}ms`
        });
        
        return galleryItems;
    } catch (error) {
        logger.error("Error fetching gallery images", { error: error.message });
        throw error;
    }
}

module.exports = { getAllGalleryImages };

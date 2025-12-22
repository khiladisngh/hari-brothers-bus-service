// utils/constants.js
// Application constants

module.exports = {
    // Cache durations in seconds
    CACHE: {
        SHORT: 300,        // 5 minutes
        MEDIUM: 3600,      // 1 hour  
        LONG: 7200,        // 2 hours
        VERY_LONG: 86400   // 24 hours
    },
    
    // Collection names
    COLLECTIONS: {
        TESTIMONIALS: 'testimonials',
        TOURS: 'tours',
        GALLERY_IMAGES: 'galleryImages',
        MESSAGES: 'messages'
    },
    
    // Environment
    IS_EMULATOR: process.env.FUNCTIONS_EMULATOR === 'true',
    
    // Service name
    SERVICE_NAME: 'hari-brothers-bus-service'
};

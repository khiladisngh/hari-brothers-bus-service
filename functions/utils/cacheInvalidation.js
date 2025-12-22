// utils/cacheInvalidation.js
// Cache invalidation utilities

const { cache } = require('../middleware/memoryCache');
const { log, LogSeverity } = require('../middleware/logger');

/**
 * Invalidate specific cache entries
 * @param {string|string[]} keys - Cache key(s) to invalidate
 * @param {string} correlationId - Request correlation ID
 */
function invalidateCache(keys, correlationId = null) {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    let invalidated = 0;
    
    keyArray.forEach(key => {
        if (cache.delete(key)) {
            invalidated++;
        }
    });
    
    log(
        LogSeverity.INFO,
        'Cache invalidated',
        {
            operation: 'invalidateCache',
            keys: keyArray,
            invalidatedCount: invalidated
        },
        correlationId
    );
    
    return invalidated;
}

/**
 * Invalidate all gallery-related cache entries
 */
function invalidateGalleryCache(correlationId = null) {
    return invalidateCache('gallery:all', correlationId);
}

/**
 * Invalidate all tour-related cache entries
 */
function invalidateToursCache(correlationId = null) {
    return invalidateCache('tours:all', correlationId);
}

/**
 * Invalidate all testimonial-related cache entries
 */
function invalidateTestimonialsCache(correlationId = null) {
    return invalidateCache('testimonials:all', correlationId);
}

/**
 * Invalidate all cache entries
 */
function invalidateAllCache(correlationId = null) {
    cache.clear();
    
    log(
        LogSeverity.INFO,
        'All cache cleared',
        { operation: 'invalidateAllCache' },
        correlationId
    );
}

module.exports = {
    invalidateCache,
    invalidateGalleryCache,
    invalidateToursCache,
    invalidateTestimonialsCache,
    invalidateAllCache
};

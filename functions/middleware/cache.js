// middleware/cache.js
// Cache headers and ETag middleware

const crypto = require('crypto');

/**
 * Set cache control headers for responses
 * @param {number} maxAge - Browser cache duration in seconds
 * @param {number} sMaxAge - CDN cache duration in seconds
 */
function setCacheHeaders(maxAge = 300, sMaxAge = 3600) {
    return (req, res, next) => {
        res.set("Cache-Control", `public, max-age=${maxAge}, s-maxage=${sMaxAge}`);
        res.set("CDN-Cache-Control", `public, max-age=${sMaxAge}`);
        next();
    };
}

/**
 * Helper function to set cache headers directly on response
 */
function setCacheHeadersDirectly(res, maxAge = 300, sMaxAge = 3600) {
    res.set("Cache-Control", `public, max-age=${maxAge}, s-maxage=${sMaxAge}`);
    res.set("CDN-Cache-Control", `public, max-age=${sMaxAge}`);
}

/**
 * Generate ETag from content
 * @param {string|Buffer} content - Content to hash
 * @returns {string} ETag value
 */
function generateETag(content) {
    return `"${crypto
        .createHash('md5')
        .update(content)
        .digest('hex')}"`;
}

/**
 * Middleware to add ETag support for responses
 * Enables 304 Not Modified responses for unchanged content
 */
function etagMiddleware(req, res, next) {
    const originalSend = res.send;
    
    res.send = function(body) {
        // Only add ETag for GET/HEAD requests with 200 status
        if ((req.method === 'GET' || req.method === 'HEAD') && res.statusCode === 200) {
            if (body && (typeof body === 'string' || Buffer.isBuffer(body))) {
                const etag = generateETag(body);
                res.set('ETag', etag);
                
                // Check if client has cached version
                const clientETag = req.get('If-None-Match');
                if (clientETag === etag) {
                    // Content hasn't changed, send 304
                    res.status(304);
                    return originalSend.call(this, '');
                }
            }
        }
        
        return originalSend.call(this, body);
    };
    
    next();
}

module.exports = { 
    setCacheHeaders, 
    setCacheHeadersDirectly,
    etagMiddleware,
    generateETag
};

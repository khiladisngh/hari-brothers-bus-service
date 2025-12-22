// middleware/cache.js
// Cache headers middleware

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

module.exports = { setCacheHeaders, setCacheHeadersDirectly };

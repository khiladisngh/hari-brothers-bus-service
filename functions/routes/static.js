// routes/static.js
// Static page routes (About, Pay, Health) and performance monitoring

const express = require('express');
const router = express.Router();
const { setCacheHeadersDirectly } = require('../middleware/cache');
const { cache } = require('../middleware/memoryCache');

// About page
router.get('/about', (req, res) => {
    setCacheHeadersDirectly(res, 86400, 86400);
    res.render('about');
});

// Pay page
router.get('/pay', (req, res) => {
    setCacheHeadersDirectly(res, 86400, 86400);
    res.render('pay');
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: Date.now(),
        service: 'hari-brothers-bus-service'
    });
});

// Cache statistics endpoint (for monitoring)
router.get('/cache-stats', (req, res) => {
    const stats = cache.getStats();
    res.status(200).json({
        service: 'hari-brothers-bus-service',
        cacheStats: stats,
        timestamp: Date.now()
    });
});

// Firebase internal health check
router.get('/__firebase_health__', (req, res) => {
    res.status(200).send('ok');
});

module.exports = router;

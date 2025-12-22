// routes/gallery.js
// Gallery page route

const express = require('express');
const router = express.Router();
const { getAllGalleryImages } = require('../controllers/gallery');
const { setCacheHeadersDirectly } = require('../middleware/cache');

router.get('/', async (req, res, next) => {
    try {
        const galleryItems = await getAllGalleryImages();
        setCacheHeadersDirectly(res, 3600, 7200);
        res.render('gallery', { galleryItems });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

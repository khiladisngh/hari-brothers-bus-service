// routes/home.js
// Home page route

const express = require('express');
const router = express.Router();
const { getAllTestimonials } = require('../controllers/testimonials');
const { setCacheHeadersDirectly } = require('../middleware/cache');

router.get('/', async (req, res, next) => {
    try {
        const testimonials = await getAllTestimonials(req.correlationId);
        setCacheHeadersDirectly(res, 600, 1800);
        res.render('home', { testimonials });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

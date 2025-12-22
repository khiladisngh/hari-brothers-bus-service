// routes/tours.js
// Tours page route

const express = require('express');
const router = express.Router();
const { getAllTours } = require('../controllers/tours');
const { setCacheHeadersDirectly } = require('../middleware/cache');

router.get('/', async (req, res, next) => {
    try {
        const toursData = await getAllTours();
        setCacheHeadersDirectly(res, 3600, 7200);
        res.render('tours', { toursData });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

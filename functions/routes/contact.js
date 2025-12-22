// routes/contact.js
// Contact form routes

const express = require('express');
const router = express.Router();
const { saveMessage, validateMessageData } = require('../controllers/messages');

// GET contact page
router.get('/', (req, res) => {
    res.render('contact', { success: req.query.success === 'true' });
});

// POST contact form
router.post('/', async (req, res, next) => {
    try {
        if (!req.body) {
            return res.status(400).render('contact', {
                error: 'Bad Request - No data received',
                formData: {}
            });
        }

        // Validate form data
        const validation = validateMessageData(req.body);
        if (!validation.valid) {
            return res.status(400).render('contact', {
                error: validation.errors.join(', '),
                formData: req.body
            });
        }

        // Save message and send email
        await saveMessage(req.body, req.correlationId);

        // Redirect with success message
        res.redirect('/contact?success=true');
    } catch (error) {
        next(error);
    }
});

module.exports = router;

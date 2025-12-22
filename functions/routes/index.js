// routes/index.js
// Route aggregator - combines all routes

const homeRoutes = require('./home');
const toursRoutes = require('./tours');
const galleryRoutes = require('./gallery');
const contactRoutes = require('./contact');
const staticRoutes = require('./static');

/**
 * Register all routes with the Express app
 * @param {Express.Application} app - Express application instance
 */
function registerRoutes(app) {
    // Static routes (health checks, about, pay)
    app.use('/', staticRoutes);
    
    // Home page
    app.use('/', homeRoutes);
    
    // Tours page
    app.use('/tours', toursRoutes);
    
    // Gallery page
    app.use('/gallery', galleryRoutes);
    
    // Contact form
    app.use('/contact', contactRoutes);
}

module.exports = { registerRoutes };

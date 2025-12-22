// config/firebase.js
// Firebase Admin SDK initialization

const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");

let db = null;

/**
 * Initialize Firebase Admin SDK and Firestore
 * Safe to call multiple times - will only initialize once
 */
function initializeFirebase() {
    if (admin.apps.length === 0) {
        admin.initializeApp();
        logger.info("Firebase Admin SDK initialized");
    }
    
    if (!db) {
        db = getFirestore();
        logger.info("Firestore initialized");
    }
    
    return { admin, db };
}

module.exports = { initializeFirebase, getDb: () => db, getAdmin: () => admin };

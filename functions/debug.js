const admin = require("firebase-admin");
console.log("Loaded admin...");

let adminInitialized = false;
function initializeAdmin() {
    if (adminInitialized) return;
    adminInitialized = true;
    try {
        if (admin.apps.length === 0) {
            admin.initializeApp();
        }
    } catch (error) {
        console.error("Firebase Admin SDK initialization warning:", error.message);
    }
}

console.log("Loaded firestore function...");

const express = require("express");
console.log("Loaded express...");

const path = require("path");
console.log("Loaded path...");

const ejs = require("ejs");
console.log("Loaded ejs...");

const { onRequest } = require("firebase-functions/v2/https");
console.log("Loaded onRequest...");

const app = express();
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

console.log("Created app...");

const functionOptions = {
    region: "asia-south1",
    timeoutSeconds: 120,
    memory: "512MB",
};

exports.app = onRequest(functionOptions, app);
console.log("Exported function...");

// Exit immediately
process.exit(0);

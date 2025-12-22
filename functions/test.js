const { onRequest } = require("firebase-functions/v2/https");

exports.test = onRequest((req, res) => {
    res.send("Hello from Firebase!");
});

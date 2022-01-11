const functions = require("firebase-functions");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json")

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    apiKey: "AIzaSyAfMeBzXEcp2dXX56PaBMvYcn2Qas4JV8I",
    authDomain: "hari-bus-service-8d1fa.firebaseapp.com",
    projectId: "hari-bus-service-8d1fa",
    storageBucket: "hari-bus-service-8d1fa.appspot.com",
    messagingSenderId: "1011820700274",
    appId: "1:1011820700274:web:9d09f10c7080e41356d8eb",
    measurementId: "G-HDDPLB3YJJ"
});

const db = admin.firestore();

// // TESTIMONIALS
// // Read json
// const fs = require("fs");
// const data = JSON.parse(fs.readFileSync("json/testimonials.json", "utf8"));
//
// // Upload data to firestore
// data.forEach(element => {
//     console.log(element);
//     db.collection("testimonials").add(element).then(() => {
//         console.log("Document successfully written!");
//     }).catch((error) => {
//         console.error("Error writing document: ", error);
//     })
// });

// TOURS
// Read json
const fs = require("fs");
const data = JSON.parse(fs.readFileSync("json/tours.json", "utf8"));

// Upload data to firestore
data.forEach(element => {
    console.log(element);
    db.collection("tours").doc(element["tourName"]).set(element).then(() => {
        console.log("Document successfully written!");
    }).catch((error) => {
        console.error("Error writing document: ", error);
    })
});

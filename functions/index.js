require("dotenv").config();

const functions = require("firebase-functions");
const firebase = require("firebase-admin");
const config = functions.config();

const firebaseApp = firebase.initializeApp(config.firebase);
const db = firebaseApp.firestore();

// Porting envs from firebase config
for (const key in config.envs) {
    process.env[key.toUpperCase()] = config.envs[key];
}

const _ = require("lodash");
const fs = require("fs");
const ejs = require("ejs");
const express = require("express");
const logger = require("morgan");
const request = require("request");
const engines = require("consolidate");
const cookieParser = require("cookie-parser");
const createError = require("http-errors");

// view engine setup
const app = express();
app.engine("html", engines.ejs);
app.set("views", "./views");
app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(logger("tiny"));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

// HOME ROUTE
app.route("/").get((req, res) => {
    // Fetching testimonials from database
    db.collection("testimonials")
        .get()
        .then((snapshot) => {
            if (snapshot.empty) {
                console.log("No testimonials found");
            } else {
                let testimonials = [];
                snapshot.forEach((doc) => {
                    testimonials.push(doc.data());
                });
                res.set("Cache-Control", "public, max-age=300, s-maxage=600");
                res.render("home", {
                    testimonials: testimonials,
                });
            }
        })
});

// TOUR ROUTE
app.route("/tours").get((req, res) => {
    // Fetching tours from database
    db.collection("tours")
        .get()
        .then((snapshot) => {
            if (snapshot.empty) {
                console.log("No tours found");
            } else {
                let tours = [];
                snapshot.forEach((doc) => {
                    tours.push(doc.data());
                });
                res.set("Cache-Control", "public, max-age=300, s-maxage=600");
                res.render("tours", {
                    toursData: tours,
                });
            }
        })
});

// GALLERY ROUTE
app.route("/gallery").get(async (req, res) => {
    let images = [];
    let reviews = [];
    let photoReferences = [];

    const googleDataUrl = `https://maps.googleapis.com/maps/api/place/details/json?placeid=${process.env.GOOGLE_PLACE_ID}&key=${process.env.GOOGLE_PLACES_API}`;
    request(googleDataUrl, (error, response, body) => {
        const googleData = JSON.parse(body);
        reviews = googleData.result.reviews;
        photoReferences = googleData.result.photos;
        res.set("Cache-Control", "public, max-age=300, s-maxage=600");
        res.render("gallery", {imagesList: photoReferences, lodash: _});
    });
    await fs.readdir("public/images/gallery", (err, files) => {
        if (err) console.log(err);
        else {
            files.forEach((item) => {
                images.push(item);
            });
        }
    });
});

// ABOUT ROUTE
app.route("/about").get((req, res) => {
    res.set("Cache-Control", "public, max-age=300, s-maxage=600");
    res.render("about");
});

// PAY ROUTE
app.route("/pay").get((req, res) => {
    res.set("Cache-Control", "public, max-age=300, s-maxage=600");
    res.render("pay");
});

// CONTACT ROUTE
app
    .route("/contact")
    .get((req, res) => {
        res.set("Cache-Control", "public, max-age=300, s-maxage=600");
        res.render("contact");
    })
    .post((req, res) => {
        if (req.body) {
            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            const client = require("twilio")(accountSid, authToken);

            let formData = req.body;
            let sender = process.env.TWILIO_SENDER_NUMBER;
            let receiver = process.env.TWILIO_RECEIVER_NUMBER;

            let messageBody = `\n\nClient Message\n${formData["firstName"]} ${formData["lastName"]}\nPhone: ${formData["phoneNumber"]}\nFrom: ${formData["fromCity"]}, ${formData["fromState"]}\nTo: ${formData["toCity"]}, ${formData["toState"]}\nDate: ${formData["date"]}\nMessage:\n${formData["message"]}`;

            client.messages
                .create({
                    body: messageBody,
                    from: sender,
                    to: receiver,
                })
                .then((message) => {
                    db.collection("messages")
                        .add({
                            firstName: formData["firstName"],
                            lastName: formData["lastName"],
                            phoneNumber: formData["phoneNumber"],
                            fromCity: formData["fromCity"],
                            fromState: formData["fromState"],
                            toCity: formData["toCity"],
                            toState: formData["toState"],
                            date: formData["date"],
                            message: formData["message"],
                        })
                        .then(() => {
                            console.log("Message added to database");
                        });
                    res.set("Cache-Control", "public, max-age=300, s-maxage=600");
                    res.render("contact");
                });
        }
    });

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error");
});

exports.app = functions.https.onRequest(app);

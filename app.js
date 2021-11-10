require("dotenv").config();

const _ = require("lodash");
const fs = require("fs");
const ejs = require("ejs");
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const logger = require("morgan");
const request = require("request");
const serveIndex = require("serve-index");
const createError = require("http-errors");
const cookieParser = require("cookie-parser");

// view engine setup
const app = express();
app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(logger("tiny"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use("/images", serveIndex(path.join(__dirname, "/images")));

mongoURI = `mongodb+srv://dbAdmin:${process.env.MONGODB_ADMIN_KEY}@cluster0.rhtnn.mongodb.net/website?retryWrites=true&w=majority`;
mongoLocalURI = `mongodb://localhost:27017/hari-brothers-bus-service`;
mongoose.connect(mongoURI, (err) => {
  if (err) {
    console.log(err);
  }
});

const testimonialSchema = new mongoose.Schema({
  author: String,
  text: String,
});

const toursSchema = new mongoose.Schema({
  tourName: String,
  tourPlaces: [],
});

const messageLogSchema = new mongoose.Schema({
  message: Object,
});

const Testimonials = new mongoose.model("Testimonials", testimonialSchema);
const Tours = new mongoose.model("Tours", toursSchema);
const MessageLog = new mongoose.model("Message Log", messageLogSchema);

// HOME ROUTE
app.route("/").get((req, res) => {
  Testimonials.find({}, (err, message) => {
    if (err) {
      console.log(err);
    } else {
      res.render("home", { testimonials: message });
    }
  });
});

// TOUR ROUTE
app.route("/tours").get((req, res) => {
  Tours.find({}, (err, tour) => {
    if (err) {
      console.log(err);
    } else {
      res.render("tours", { toursData: tour });
    }
  });
});


// GALLERY ROUTE
app.route("/gallery").get(async (req, res) => {
  let images = [];
  let reviews = [];
  let photoReferences = [];

  const googleDataUrl = `https://maps.googleapis.com/maps/api/place/details/json?placeid=${process.env.GOOGLE_PLACE_ID}&key=${process.env.GOOGLE_API}`;
  request(googleDataUrl, (error, response, body) => {
    const googleData = JSON.parse(body);
    reviews = googleData.result.reviews;
    photoReferences = googleData.result.photos;
    res.render("gallery", { imagesList: photoReferences, lodash: _ });
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
  res.render("about");
});

// CONTACT ROUTE
app
  .route("/contact")
  .get((req, res) => {
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
          let messageLog = new MessageLog({
            message: message,
          });
          messageLog.save();
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

const server = app.listen(process.env.PORT || 3000, () => {
  const port = server.address().port;
  console.log(`Express is working on port ${port}`);
});

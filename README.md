# Hari Brothers Bus Service Website

[![Build Status](https://img.shields.io/github/actions/workflow/status/khiladisngh/hari-brothers-bus-service/firebase-deploy.yml?branch=master)](https://github.com/khiladisngh/hari-brothers-bus-service/actions/workflows/firebase-deploy.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Firebase Hosting](https://img.shields.io/badge/Firebase-Hosting-orange)](https://firebase.google.com/docs/hosting)
[![Firebase Functions](https://img.shields.io/badge/Firebase-Functions_v2-orange)](https://firebase.google.com/docs/functions)
[![Cloud Firestore](https://img.shields.io/badge/Cloud-Firestore-blue)](https://firebase.google.com/docs/firestore)
[![Cloud Storage](https://img.shields.io/badge/Cloud-Storage-blue)](https://firebase.google.com/docs/storage)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org/)

This repository contains the source code for the Hari Brothers Bus Service website. It features a dynamic frontend rendered using EJS, served via Firebase Hosting, and powered by a Node.js backend running on Firebase Cloud Functions (Gen 2). Data, including tour details, gallery images, and testimonials, is managed using Cloud Firestore, with image files stored in Cloud Storage for Firebase.

## Features

* Dynamic tour listings with associated place details and images fetched from Firestore/Cloud Storage.
* Dynamic image gallery populated from Firestore/Cloud Storage.
* Testimonials displayed from Firestore.
* Contact form that sends email notifications (via Nodemailer/Gmail) and saves messages to Firestore.
* Uses Firebase Emulator Suite for local development and testing.
* Automated deployment via GitHub Actions (optional setup).

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

* [Node.js](https://nodejs.org/) (v20.x recommended, as specified in `functions/package.json`)
* [npm](https://www.npmjs.com/) (comes with Node.js)
* [Firebase CLI](https://firebase.google.com/docs/cli#install_the_firebase_cli):
    ```bash
    npm install -g firebase-tools
    ```
* Firebase Account and Project: You'll need a Firebase project created at [https://console.firebase.google.com/](https://console.firebase.google.com/). Ensure Firestore, Cloud Storage, and Cloud Functions (Node.js 20 runtime) are enabled for the project.
* **(Optional but Recommended for Local Scripts)** [Google Cloud SDK (gcloud CLI)](https://cloud.google.com/sdk/docs/install): Needed if you plan to use Application Default Credentials (ADC) for local helper scripts instead of a service account key.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd hari-brothers-bus-service # Or your repo name
    ```
2.  **Install Root Dependencies:** (Installs `firebase-admin` for helper scripts)
    ```bash
    npm install
    ```
3.  **Install Function Dependencies:**
    ```bash
    cd functions
    npm install
    cd ..
    ```
4.  **Configure Firebase Project:**
    * Log in to Firebase:
        ```bash
        firebase login
        ```
    * Select your Firebase project (replace `your-firebase-project-id` with your actual project ID, e.g., `hari-bus-service-8d1fa`):
        ```bash
        firebase use your-firebase-project-id
        ```

### Environment Configuration & Secrets

Configuration is handled differently for the deployed Cloud Function versus the local helper scripts.

**1. Cloud Function Runtime Configuration (Live Deployment):**

The deployed `app` function requires these environment variables:

* `EMAIL_USER`: The Gmail address used for sending contact form emails.
* `CONTACT_FORM_RECIPIENT`: The email address where contact form submissions should be sent.
* `EMAIL_PASSWORD`: The 16-character Gmail App Password for the `EMAIL_USER` account. **This MUST be handled securely.**

**Setup using Secret Manager (Recommended for `EMAIL_PASSWORD`):**

1.  **Set the Secret:** In your terminal (project root), run:
    ```bash
    # Replace EMAIL_PASSWORD with the actual secret name if different
    firebase functions:secrets:set EMAIL_PASSWORD
    ```
    Follow the prompts to enter your 16-character Gmail App Password.
2.  **Grant Access:** Allow your function's service account to access the secret:
    ```bash
    # Replace EMAIL_PASSWORD if needed, and ensure 'app' matches your function name
    firebase functions:secrets:grantaccess EMAIL_PASSWORD --roles=secretmanager.secretAccessor --functions=app
    ```
3.  **Update Function Code:** Ensure `functionOptions` in `functions/index.js` includes the secret:
    ```javascript
    const functionOptions = {
        region: "asia-south1", // Or your region
        secrets: ["EMAIL_PASSWORD"], // Access the secret
        // ... other options
    };
    exports.app = onRequest(functionOptions, app);
    ```
    Your code accessing `process.env.EMAIL_PASSWORD` will automatically receive the secret value at runtime.

4.  **Set Other Variables:** For non-sensitive variables (`EMAIL_USER`, `CONTACT_FORM_RECIPIENT`), you can set them:
    * Directly in the Google Cloud Console (Cloud Functions > Select 'app' > Edit > Runtime, build... > Runtime environment variables).
    * **OR** Via a `.env` file *inside the `functions` directory* (e.g., `functions/.env`). Make sure this file is included in deployment if you use this method and **DO NOT** put secrets in it. The `require("dotenv").config()` line in `functions/index.js` will load these.

**2. Local Helper Scripts Configuration (`scripts/*.js`):**

These scripts (`processImages.js`, `uploadDataToFirestore.js`) run locally using Node.js and need to authenticate with Firebase Admin SDK, especially when targeting your *live* project.

* **Authentication:**
    * **Recommended:** Use a Service Account Key.
        1.  Download the key JSON file from Firebase Console (Project Settings > Service accounts > Generate new private key).
        2.  Create a `secrets/` directory at the project root.
        3.  Save the downloaded key as `secrets/serviceAccountKey.json`.
        4.  **Crucially:** Add `secrets/` to your root `.gitignore` file. **NEVER COMMIT THIS KEY.**
        The scripts are configured to look for this key file when emulator variables are not detected.
    * **Alternative:** Use Application Default Credentials (ADC). Run `gcloud auth application-default login` in your terminal. The scripts will attempt to use ADC if the service account key is not found and emulators are not detected. Ensure your logged-in gcloud user has the necessary permissions (Storage Admin, Firestore User).
* **Other Config:** The scripts might use variables from a root `.env` file if needed (e.g., `FIREBASE_STORAGE_BUCKET`).

### Running Locally (Emulator Suite)

Use the Firebase Emulator Suite for local development and testing *before* deploying or running scripts against live data.

1.  **Start Emulators:**
    ```bash
    firebase emulators:start --import=./exported-emulator-data --export-on-exit
    ```
    *(Adjust flags as needed. Keep this terminal running.)*
2.  **Seed Emulator Data (Requires Local Images):**
    * Ensure you have sample images in `public/images/tours/` and `public/images/gallery-page/`.
    * Open a **separate terminal**.
    * **Manually set emulator host variables** (needed because the script runs in a separate process):
        * *(Bash/Zsh)*:
            ```bash
            export FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
            export STORAGE_EMULATOR_HOST="127.0.0.1:9199"
            ```
        * *(Windows Cmd)*:
            ```cmd
            set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
            set STORAGE_EMULATOR_HOST=127.0.0.1:9199
            ```
        * *(Windows PowerShell)*:
            ```powershell
            $env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
            $env:STORAGE_EMULATOR_HOST = "127.0.0.1:9199"
            ```
    * Run the image processing script (uploads to Storage Emulator, generates JSON with emulator URLs):
        ```bash
        node scripts/processImages.js
        ```
    * Run the Firestore seeding script (reads generated JSON, seeds Firestore Emulator):
        ```bash
        node scripts/uploadDataToFirestore.js
        ```
        *(If using PowerShell, remember to unset the env vars afterwards: `Remove-Item Env:\STORAGE_EMULATOR_HOST; Remove-Item Env:\FIRESTORE_EMULATOR_HOST`)*
3.  **Access Locally:**
    * **Website:** `http://127.0.0.1:5000` (served by Hosting Emulator)
    * **Emulator UI:** `http://127.0.0.1:4000` (view Firestore/Storage data)
    * **Function Endpoint (Direct):** `http://127.0.0.1:5001/your-project-id/your-region/app`

### Data Seeding Scripts

Located in the `scripts/` directory:

* **`processImages.js`:** Reads image files from `public/images/tours` and `public/images/gallery-page`. Uploads them to Cloud Storage (live or emulator based on environment). Generates `public/json/tours_with_metadata.json` and `public/json/galleryImages.json` containing image metadata, including Cloud Storage URLs. Requires images to be present locally and uses the original `public/json/tours.json` as input for tour place names.
* **`uploadDataToFirestore.js`:** Reads the JSON files generated by `processImages.js` (and `public/json/testimonials.json`). Uploads this data to the relevant Firestore collections (live or emulator based on environment).

Run these scripts locally *before* initial deployment to populate live data, or run them targeting emulators for local testing (as described in "Running Locally"). Ensure proper authentication (Service Account Key or ADC) when targeting live services.

## Deployment

The project is configured for deployment to Firebase Hosting and Cloud Functions.

* **Manual Deployment:** To deploy changes manually to your live Firebase project (after testing locally and potentially running seeding scripts against live data):
    ```bash
    firebase deploy --only functions,hosting
    ```
    *(This command deploys both the function code from `functions/` and the static web content from `public/`)*.
* **GitHub Actions:** A workflow like `.github/workflows/firebase-deploy.yml` (you might need to create/adjust this) can be set up to automate deployment on pushes to the `main` branch or other triggers. This typically requires:
    * Setting up a `FIREBASE_TOKEN` secret in your GitHub repository.
    * Ensuring the workflow installs dependencies in both the root and `functions` directories.
    * Running the `firebase deploy --only functions,hosting --token "${{ secrets.FIREBASE_TOKEN }}"` command.
    *(Note: The provided helper scripts are generally NOT run as part of an automated deployment workflow unless specifically designed for it with appropriate CI/CD authentication like Workload Identity Federation or Base64 encoded service keys.)*

## Built With

* [Firebase Hosting](https://firebase.google.com/docs/hosting) - Web Hosting
* [Firebase Cloud Functions (Gen 2)](https://firebase.google.com/docs/functions) - Serverless Backend (Node.js 20)
* [Cloud Firestore](https://firebase.google.com/docs/firestore) - NoSQL Database
* [Cloud Storage for Firebase](https://firebase.google.com/docs/storage) - File Storage
* [Node.js](https://nodejs.org/) - Backend Runtime
* [Express.js](https://expressjs.com/) - Web Framework for Cloud Function
* [EJS](https://ejs.co/) - Templating Engine
* [Nodemailer](https://nodemailer.com/) - Email Sending

## Contributing

Contributions are welcome! Please follow standard fork/branch/pull request workflow. Ensure code adheres to existing style and includes tests where appropriate.

## License

This project is licensed under the MIT License - see the LICENSE.md file (if created) for details.

## Contact

* Project Maintainer: Gishant Singh * Project Link: [https://github.com/khiladisngh/hari-brothers-bus-service](https://github.com/khiladisngh/hari-brothers-bus-service) ```

This updated README provides a much more accurate picture of the project's current state, architecture, and setup requirements. Remember to potentially update the workflow filename, license details, and contact info.

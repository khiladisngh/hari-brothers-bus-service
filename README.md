# Hari Brothers Bus Service Website

<!-- Add Shields/Badges Here -->
[![Build Status](https://img.shields.io/github/actions/workflow/status/khiladisngh/hari-brothers-bus-service/firebase-pull-request.yml?branch=main)](https://github.com/khiladisngh/hari-brothers-bus-service/actions/workflows/firebase-pull-request.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) <!-- Replace with your actual license -->
[![Firebase Hosting](https://img.shields.io/badge/Firebase-Hosting-orange)](https://firebase.google.com/docs/hosting)
[![Firebase Functions](https://img.shields.io/badge/Firebase-Functions-orange)](https://firebase.google.com/docs/functions)

This repository contains the source code for the Hari Brothers Bus Service website, including the frontend hosted on Firebase Hosting and backend functions running on Firebase Functions.

## Features

*   Displays bus routes and schedules (if applicable).
*   Provides contact information and a contact form.
*   Integrates with Google Places API.
*   Automated deployment via GitHub Actions.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   [Node.js](https://nodejs.org/) (includes npm)
*   [Firebase CLI](https://firebase.google.com/docs/cli#install_the_firebase_cli):
    ```bash
    npm install -g firebase-tools
    ```
*   Firebase Account and Project: You'll need to create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/).

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd hari-brothers-bus-service
    ```
2.  **Install function dependencies:**
    ```bash
    cd functions
    npm install
    cd ..
    ```
3.  **Configure Firebase:**
    *   Log in to Firebase:
        ```bash
        firebase login
        ```
    *   Set up your Firebase project (replace `your-firebase-project-id`):
        ```bash
        firebase use --add your-firebase-project-id
        ```
4.  **Set up Environment Variables:**
    *   Firebase Functions require environment variables for configuration. You can set these using the Firebase CLI. Refer to the `env` section in `.github/workflows/firebase-pull-request.yml` for the required variables (`GOOGLE_PLACES_API`, `GOOGLE_PLACE_ID`, `EMAIL_USER`, `EMAIL_PASSWORD`, `CONTACT_FORM_RECIPIENT`).
    *   Example command to set a variable:
        ```bash
        firebase functions:config:set google.places_api="YOUR_API_KEY" google.place_id="YOUR_PLACE_ID" email.user="YOUR_EMAIL" email.password="YOUR_PASSWORD" contact.recipient="RECIPIENT_EMAIL"
        # Add other necessary variables similarly
        ```
    *   **Important:** Do not commit sensitive keys directly into your code. Use Firebase environment configuration or a secure secrets management solution.

### Running Locally (Optional)

*   **Firebase Emulator Suite:** For local development and testing, use the Firebase Emulator Suite:
    ```bash
    firebase emulators:start
    ```
    This will typically emulate Hosting and Functions locally. Visit the URL provided by the emulator (usually `http://localhost:5000` for Hosting and `http://localhost:5001` for Functions).

## Deployment

*   **Pull Request Deploys:** The `.github/workflows/firebase-pull-request.yml` workflow automatically deploys changes to Firebase Hosting and Functions when a pull request is created or updated. This typically deploys to a preview channel.
*   **Manual Deployment:** To deploy manually to your live Firebase project:
    ```bash
    firebase deploy
    ```
    To deploy only specific parts:
    ```bash
    firebase deploy --only hosting
    firebase deploy --only functions
    ```

## Built With

*   [Firebase Hosting](https://firebase.google.com/docs/hosting) - Web Hosting
*   [Firebase Functions](https://firebase.google.com/docs/functions) - Serverless Backend
*   [Node.js](https://nodejs.org/) - Backend Runtime
*   [Google Places API](https://developers.google.com/maps/documentation/places/web-service/overview) - For location data

## Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add some feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Open a Pull Request.

Please ensure your code adheres to existing style guidelines and includes tests where appropriate.

## License

Specify your project's license here (e.g., MIT, Apache 2.0). If you don't have one, consider adding a `LICENSE.md` file.

Example: This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Contact

*   Project Maintainer: [Your Name/Organization] - [your-email@example.com]
*   Project Link: [https://github.com/your-username/hari-brothers-bus-service](https://github.com/your-username/hari-brothers-bus-service)

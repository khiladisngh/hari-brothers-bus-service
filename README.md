# Hari Brothers Bus Service Website

A dynamic bus service website built with Firebase, featuring tour listings, gallery, testimonials, and a contact form.

## Tech Stack

- **Firebase Hosting** - Static file serving
- **Firebase Functions** - Node.js 24 backend (Gen 1 for emulator compatibility)
- **Cloud Firestore** - Database for tours, gallery, testimonials
- **Cloud Storage** - Image storage
- **Express.js + EJS** - Web framework and templating
- **Nodemailer** - Email notifications

## Prerequisites

- **Node.js 24.x** - [Download here](https://nodejs.org/)
- **Firebase CLI** - Install globally:

  ```bash
  npm install -g firebase-tools
  ```

- **Firebase Project** - Create at [Firebase Console](https://console.firebase.google.com/)
  - Enable: Firestore, Cloud Storage, Cloud Functions
- **Gmail App Password** - For contact form emails (16-character code)

---

## Initial Setup

### 1. Clone & Install

```bash
# Clone repository
git clone https://github.com/khiladisngh/hari-brothers-bus-service.git
cd hari-brothers-bus-service

# Install dependencies
npm install                    # Root dependencies
cd functions && npm install   # Function dependencies
cd ..
```

### 2. Firebase Configuration

```bash
# Login to Firebase
firebase login

# Link to your Firebase project (replace with your project ID)
firebase use your-project-id
```

### 3. Environment Setup

Create `functions/.env` file:

```env
EMAIL_USER=your-email@gmail.com
CONTACT_FORM_RECIPIENT=recipient@example.com
EMAIL_PASSWORD=your-16-char-app-password
```

> **Important:** Add `functions/.env` to `.gitignore` - never commit credentials!

---

## Local Development (Emulator)

### Start Emulators

**If using WSL2 on Windows:**

```bash
FUNCTIONS_DISCOVERY_TIMEOUT=30 firebase emulators:start --debug
```

**On Mac/Linux/Native Windows:**

```bash
firebase emulators:start
```

The emulators will start on:

- **Website:** <http://127.0.0.1:5000> (or http://WSL_IP:5000 on WSL2)
- **Emulator UI:** <http://127.0.0.1:4000> (or http://WSL_IP:4000 on WSL2)
- **Functions:** Port 5001
- **Firestore:** Port 8080
- **Storage:** Port 9199

### Populate Emulator Data

In a **new terminal** (keep emulators running):

```bash
# On WSL2, get your IP first
WSL_IP=$(hostname -I | awk '{print $1}')

# Upload images to Storage Emulator and generate JSON
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
STORAGE_EMULATOR_HOST=http://127.0.0.1:9199 \
GCLOUD_PROJECT=your-project-id \
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com \
WSL_IP=$WSL_IP \
node scripts/processImages.js

# Upload data to Firestore Emulator
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
GCLOUD_PROJECT=your-project-id \
node scripts/uploadDataToFirestore.js
```

**On Windows PowerShell:**

```powershell
$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
$env:STORAGE_EMULATOR_HOST = "http://127.0.0.1:9199"
$env:GCLOUD_PROJECT = "your-project-id"
$env:FIREBASE_STORAGE_BUCKET = "your-project-id.appspot.com"

node scripts/processImages.js
node scripts/uploadDataToFirestore.js

# Clean up env vars after
Remove-Item Env:\FIRESTORE_EMULATOR_HOST
Remove-Item Env:\STORAGE_EMULATOR_HOST
Remove-Item Env:\GCLOUD_PROJECT
Remove-Item Env:\FIREBASE_STORAGE_BUCKET
```

### Clear Emulator Data

To reset emulator data, click **"Delete all files"** in Storage tab and **"Clear all data"** in Firestore tab at <http://127.0.0.1:4000>, then re-run the population scripts.

---

## Production Deployment

### Initial Setup (One-time)

#### 1. Configure Storage Rules

Deploy storage rules that allow public read access:

```bash
firebase deploy --only storage
```

#### 2. Set Environment Variables

**Option A: Secret Manager (Recommended for EMAIL_PASSWORD)**

```bash
# Set the secret
firebase functions:secrets:set EMAIL_PASSWORD

# Grant access to your function
firebase functions:secrets:grantaccess EMAIL_PASSWORD \
  --roles=secretmanager.secretAccessor \
  --functions=app
```

**Option B: Environment Variables (via Console)**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to: Functions > app function > Edit
3. Runtime, build... > Runtime environment variables
4. Add:
   - `EMAIL_USER`: <your-email@gmail.com>
   - `CONTACT_FORM_RECIPIENT`: <recipient@example.com>
   - `EMAIL_PASSWORD`: your-16-char-app-password

#### 3. Populate Production Data

Ensure images exist in `public/images/tours/` and `public/images/gallery-page/`, then:

```bash
# Set authentication (choose one method):

# Method A: Service Account Key
# 1. Download key from Firebase Console > Project Settings > Service accounts
# 2. Save as secrets/serviceAccountKey.json
# 3. Add secrets/ to .gitignore
# 4. Scripts will auto-detect the key

# Method B: Application Default Credentials
gcloud auth application-default login

# Upload images to production Storage
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com \
GCLOUD_PROJECT=your-project-id \
node scripts/processImages.js

# Upload data to production Firestore
GCLOUD_PROJECT=your-project-id \
node scripts/uploadDataToFirestore.js
```

### Deploy Code

```bash
# Deploy functions and hosting
firebase deploy --only functions,hosting

# Or use the npm script
cd functions
npm run deploy
```

### View Live Site

Your site will be available at:

- `https://your-project-id.web.app`
- Or your custom domain if configured

---

## Project Structure

```
hari-brothers-bus-service/
├── functions/
│   ├── index.js              # Cloud Function (Express app)
│   ├── package.json          # Node 24 runtime
│   ├── .env                  # Local env vars (gitignored)
│   └── views/                # EJS templates
│       ├── home.ejs
│       ├── tours.ejs
│       ├── gallery.ejs
│       └── partials/
├── public/
│   ├── images/
│   │   ├── tours/           # Source images for tours
│   │   └── gallery-page/    # Source images for gallery
│   ├── json/
│   │   ├── tours_with_metadata.json    # Generated by processImages.js
│   │   ├── galleryImages.json          # Generated by processImages.js
│   │   └── testimonials.json           # Manual data
│   └── stylesheets/
├── scripts/
│   ├── processImages.js             # Upload images, generate JSON
│   └── uploadDataToFirestore.js     # Seed Firestore from JSON
├── firebase.json              # Firebase config
├── firestore.rules           # Firestore security rules
├── storage.rules             # Storage security rules
└── README.md
```

---

## Key Commands Reference

### Emulator Commands

```bash
# Start emulators (WSL2)
FUNCTIONS_DISCOVERY_TIMEOUT=30 firebase emulators:start --debug

# Start emulators (Mac/Linux/Windows)
firebase emulators:start

# Populate emulator data (Bash/Zsh)
WSL_IP=$(hostname -I | awk '{print $1}') && \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
STORAGE_EMULATOR_HOST=http://127.0.0.1:9199 \
GCLOUD_PROJECT=your-project-id \
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com \
WSL_IP=$WSL_IP \
node scripts/processImages.js && \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
GCLOUD_PROJECT=your-project-id \
node scripts/uploadDataToFirestore.js
```

### Production Commands

```bash
# Deploy everything
firebase deploy

# Deploy only functions and hosting
firebase deploy --only functions,hosting

# Deploy only storage rules
firebase deploy --only storage

# View function logs
firebase functions:log
```

### Data Management Commands

```bash
# Process images and upload to Storage (detects emulator vs production)
node scripts/processImages.js

# Upload data to Firestore (detects emulator vs production)
node scripts/uploadDataToFirestore.js
```

---

## Troubleshooting

### Emulator Issues

**Problem:** "Function discovery timeout" on WSL2

- **Solution:** Use `FUNCTIONS_DISCOVERY_TIMEOUT=30 firebase emulators:start --debug`

**Problem:** Can't access emulator from Windows browser on WSL2

- **Solution:**
  - Use WSL IP address instead of localhost: `http://172.x.x.x:5000`
  - Get IP: `hostname -I | awk '{print $1}'`
  - Emulators are already configured to bind to `0.0.0.0`

**Problem:** Images not loading in emulator

- **Solution:**
  - Check storage rules allow public read: `allow read: if true;`
  - Restart emulators after rule changes
  - Re-run `processImages.js` with correct environment variables

**Problem:** Tours page blank but gallery works

- **Solution:** Check browser console for errors, ensure Firestore data uploaded correctly

### Production Issues

**Problem:** Contact form not sending emails

- **Solution:**
  - Verify Gmail App Password is correct (16 characters)
  - Check environment variables are set in Firebase Console
  - Check function logs: `firebase functions:log`

**Problem:** Images not loading in production

- **Solution:**
  - Verify storage rules deployed: `firebase deploy --only storage`
  - Check Storage bucket has public read access
  - Verify image URLs in Firestore point to correct bucket

---

## WSL2-Specific Notes

If developing on **Windows with WSL2**:

1. **Emulator Access:**
   - From WSL terminal: `http://127.0.0.1:5000`
   - From Windows browser: `http://WSL_IP:5000` (get IP with `hostname -I`)

2. **Environment Variables:**
   - WSL_IP is automatically set in `processImages.js` for emulator URLs
   - Emulators bound to `0.0.0.0` for cross-platform access

3. **Port Forwarding:**
   - Windows doesn't always forward WSL2 ports automatically
   - Use WSL IP directly in browser
   - All emulator services accessible via WSL IP

---

## Data Scripts Explained

### processImages.js

**Purpose:** Upload images to Storage and generate JSON files with image URLs

**Behavior:**

- Detects emulator via `STORAGE_EMULATOR_HOST` environment variable
- **Emulator mode:** Generates URLs like `http://WSL_IP:9199/v0/b/bucket/o/path`
- **Production mode:** Uploads to live Storage, generates production URLs
- Creates `tours_with_metadata.json` and `galleryImages.json`

**Required Images:**

- `public/images/tours/*.jpg` - Tour location images (match place names in tours.json)
- `public/images/gallery-page/*.png` - Gallery images

### uploadDataToFirestore.js

**Purpose:** Upload JSON data to Firestore collections

**Behavior:**

- Detects emulator via `FIRESTORE_EMULATOR_HOST` environment variable
- Reads JSON files from `public/json/`
- Uploads to collections: `tours`, `galleryImages`, `testimonials`
- Uses batching for efficient uploads

**Collections:**

- `tours`: 14 documents (tour name + places with images)
- `galleryImages`: 12 documents (image URL, alt text, order)
- `testimonials`: 4 documents (customer reviews)

---

## Structured Logging

The application uses structured logging with Cloud Logging integration for better observability and debugging.

### Log Severity Levels

Following Cloud Logging standards:

- **DEBUG**: Detailed debugging information
- **INFO**: General informational messages (default)
- **NOTICE**: Normal but significant events
- **WARNING**: Warning messages (potential issues)
- **ERROR**: Error events (failures that need attention)
- **CRITICAL/ALERT/EMERGENCY**: Severe errors requiring immediate action

### Features

#### Performance Tracking

Every request is automatically tracked with:

- **Correlation ID**: Unique ID for tracing requests across components
- **Duration Metrics**: Total time and operation-specific timings
- **Slow Request Detection**: Automatic warning for requests > 1000ms

#### Structured Log Format

All logs include:

```json
{
  "severity": "INFO",
  "message": "Gallery images fetched successfully",
  "timestamp": "2025-12-22T10:30:45.123Z",
  "correlationId": "a1b2c3d4e5f6...",
  "operation": "getAllGalleryImages",
  "count": 12,
  "queryTimeMs": 45,
  "totalTimeMs": 52
}
```

#### Error Tracking

Errors are logged with full context:

- Stack traces (in development)
- Operation context (which controller/route)
- Request details (method, path, headers)
- Correlation ID for request tracing

### Using Logging in Code

#### Basic Logging

```javascript
const { log, LogSeverity } = require('./middleware/logger');

log(
    LogSeverity.INFO,
    'Operation completed',
    { count: 10, status: 'success' },
    req.correlationId
);
```

#### Error Logging

```javascript
const { logError } = require('./middleware/logger');

try {
    // ... operation
} catch (error) {
    logError(error, 'operationName', req.correlationId);
    throw error;
}
```

#### Performance Timing

```javascript
const { PerformanceTimer } = require('./middleware/logger');

const perfTimer = new PerformanceTimer(req.correlationId);

// Mark timing points
perfTimer.mark('db-query-start');
await db.collection('items').get();
perfTimer.mark('db-query-end');

// Log with metrics
perfTimer.logMetrics('fetchItems', {
    count: items.length,
    queryTime: perfTimer.getDuration('db-query-start', 'db-query-end')
});
```

### Viewing Logs

#### Local Development (Emulator)

Logs appear in terminal where emulators are running:

```bash
firebase emulators:start
# Logs stream in real-time with structured JSON
```

#### Production (Cloud Logging)

View logs in Firebase Console:

1. Go to Firebase Console → Functions → Logs
2. Or use Cloud Console → Logging → Logs Explorer

**Filter by correlation ID:**

```
jsonPayload.correlationId="a1b2c3d4e5f6..."
```

**Filter by operation:**

```
jsonPayload.operation="getAllGalleryImages"
```

**Find slow requests:**

```
jsonPayload.durationMs > 1000
```

**Find errors:**

```
severity >= ERROR
```

### Performance Benchmarks

With structured logging, typical operations:

- Gallery fetch: 40-60ms (query: 30-45ms)
- Tours fetch: 50-80ms (query: 40-60ms, mapping: 10-20ms)
- Contact form save: 150-300ms (email: 100-200ms, db: 30-50ms)
- Full page load (including render): 200-500ms

Slow request warning triggers at > 1000ms.

---

## Performance Optimizations

The application includes several performance enhancements to ensure fast page loads and efficient resource usage.

### In-Memory Caching

**Features:**
- **TTL-based caching**: Gallery (1 hour), Tours (1 hour), Testimonials (30 minutes)
- **Hit/Miss tracking**: Monitor cache effectiveness
- **Automatic cleanup**: Expired entries removed every 5 minutes
- **getOrSet pattern**: Fetch-on-miss with automatic caching

**Cache Statistics:**

Access `/cache-stats` endpoint to monitor:

```json
{
  "service": "hari-brothers-bus-service",
  "cacheStats": {
    "hits": 150,
    "misses": 10,
    "sets": 10,
    "evictions": 2,
    "size": 3,
    "hitRate": "93.75%"
  },
  "timestamp": 1703251245123
}
```

**Cache Invalidation:**

Manually clear cache when data changes:

```javascript
const { invalidateGalleryCache, invalidateToursCache, invalidateAllCache } = require('./utils/cacheInvalidation');

// Invalidate specific collection
invalidateGalleryCache(req.correlationId);

// Clear all cache
invalidateAllCache(req.correlationId);
```

### Response Compression

**Gzip/Deflate compression** for all text-based responses:

- **Compression Level**: 6 (balanced speed/ratio)
- **Threshold**: 1KB (only compress larger responses)
- **Benefit**: 60-80% size reduction for HTML/CSS/JS/JSON

### ETag Support

**304 Not Modified responses** for unchanged content:

- Automatic ETag generation using MD5 hash
- Browser can reuse cached content
- Reduces bandwidth and server load
- Works for GET/HEAD requests with 200 status

### Performance Benchmarks

**With optimizations enabled:**

| Operation | First Load (Cold) | Cached (Warm) | Improvement |
|-----------|------------------|---------------|-------------|
| Gallery fetch | 40-60ms | 1-3ms | **95% faster** |
| Tours fetch | 50-80ms | 1-3ms | **95% faster** |
| Home page (testimonials) | 30-50ms | 1-3ms | **95% faster** |
| Contact form save | 150-300ms | N/A (no cache) | - |
| Full page load | 200-500ms | 50-100ms | **75% faster** |

**Compression savings:**

- HTML pages: ~70% reduction (e.g., 50KB → 15KB)
- JSON responses: ~60% reduction
- CSS/JS: ~70% reduction

**Cache hit rate target:** > 90% for production traffic

### Best Practices

1. **Restart emulator** after code changes to pick up new caching logic
2. **Monitor cache stats** via `/cache-stats` endpoint
3. **Invalidate cache** when data is updated in Firestore
4. **Adjust TTL values** based on data update frequency
5. **Test with compression** enabled (check `Content-Encoding: gzip` header)

---

## Security Notes

### Never Commit

- `functions/.env` - Contains email credentials
- `secrets/serviceAccountKey.json` - Firebase admin credentials
- `.firebase/` - Local Firebase CLI cache
- `node_modules/` - Dependencies

### Storage Rules

**Development:** Allow public read for easy testing

```javascript
match /{allPaths=**} {
  allow read: if true;
  allow write: if false;
}
```

**Production:** Consider restricting to specific paths or authenticated users

### Firestore Rules

Current rules allow public read, authenticated writes. Review `firestore.rules` and adjust based on security requirements.

---

## License

MIT License - See LICENSE file for details

## Author

**Gishant Singh**

- GitHub: [@khiladisngh](https://github.com/khiladisngh)
- Project: [hari-brothers-bus-service](https://github.com/khiladisngh/hari-brothers-bus-service)

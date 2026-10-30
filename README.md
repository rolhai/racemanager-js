# Race Manager

Static Firebase-backed race management app for seasons, drivers, teams, tracks, countries, race results, and live championship standings.

Setup:
- Replace `firebase-config.js` with your Firebase web config.
  Replace `firebase-config.js` with Github Actions 
- In Settings → Secrets and variables → Actions, add FIREBASE_API_KEY as a secret. Add the other Firebase web config values as repository variables, for example FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID, and FIREBASE_APP_ID.
- Set Settings → Pages → Build and deployment → Source to GitHub Actions
- Enable Email/Password sign-in in Firebase Authentication.
- Publish Firestore rules:
  ```firestore
  match /seasons/{seasonId} {
    allow read/write: if request.auth != null;
  }
  ```
- Open `index.html` in a browser or serve the folder with a static HTTP server.


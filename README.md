# Race Manager

Static Firebase-backed race management app for seasons, drivers, teams, tracks, countries, race results, and live championship standings.

Setup:
- Replace `firebase-config.js` with your Firebase web config.
- Enable Email/Password sign-in in Firebase Authentication.
- Publish Firestore rules:
  ```firestore
  match /seasons/{seasonId} {
    allow read/write: if request.auth != null;
  }
  ```
- Open `index.html` in a browser or serve the folder with a static HTTP server.

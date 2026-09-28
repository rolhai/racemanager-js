# Copilot Instructions — Race Manager

## Project
"Race Manager" is a web app for tracking one or more Formula 1 seasons:
drivers, teams, tracks, and events, with live-calculated championship
standings. Data is shared and synced across users via Firebase.

## Functionality
- **User accounts**: log in with email + password (Firebase Authentication).
  Only logged-in users can view/add/edit/delete anything.
  - **No public sign-up form in the app.** The app owner (you) creates each
    user manually in the Firebase console (Authentication > Users > Add
    user) and shares the email/password with that person directly. This
    keeps write access limited to people you've explicitly approved.
  - Log in / log out
  - Password reset ("forgot password" email link), so users can change
    their own password after you've created their account
  - A visible auth state indicator (e.g. "Logged in as name@example.com" /
    "Log in to edit") in the header
- **Seasons**: create, rename, delete, and switch between multiple F1
  seasons (e.g. "2025 Season", "2026 Season"). Each season has its own
  independent set of drivers, teams, tracks, countries, qualifying results and race results. A season selector
  (dropdown or list) is visible at all times so the user knows which season
  they're editing. a season has the following additional data: unique name, year, simulation name.
  a click on new season clears the active season and updates the selected season to the new one.
- **Countries**: add/edit/delete a country (name, code with 3 characters).
- **Drivers**: add/edit/delete a driver (first name, last name, country of nationality, team assignment). 
- **Teams**: add/edit/delete a team (name, licence country, engine supplier).
- **Tracks**: add/edit/delete a track (name, country).
- **Qualifying Results**: for each track enter the qualifying results.
  - the qualifying results have three sections for each event type one
  - each section has the finishing order (position 1–3) and map each position to a driver.
  - select event type ('Q3' or 'Q2' or 'Q1'), select track, select driver, select position and enter the laptime.
  - event type, track and driver is unique for the qualifying result
- **Sprint Race Results**: for each track enter the sprint race results. 
  - enter the race date for a sprint race (event type is 'SR') and the finishing order (position 1–8) and 
    map each position to a driver.
  - event type, track and driver is unique for the sprint race result
  Support:  
  - Sprint points system (8-7-6-5-4-3-2-1 for P1–P8)
  - DNF handling (driver scores 0, no position)
- **Race Results**: for each track enter the race results.
  - enter the race date for a race (event type is 'R', best laptime and finishing order (position 1–10) and
    map each position to a driver.
  - event type, track and driver is unique for the race result
  Support:
  - Standard points system (25-18-15-12-10-8-6-4-2-1 for P1–P10)
  - +1 point for fastest lap (optional toggle)
  - DNF handling (driver scores 0, no position)
- **Season view**: list all races in the season with status (upcoming /
  completed).
- **Championship tables**:
  - Drivers' Championship: driver, team, total points, wins, podiums — sorted
    by points descending.
  - Constructors' Championship: team, total points (sum of both drivers) —
    sorted by points descending.
  - Tables update automatically as race results are entered.

## Data & storage — Firebase
- Backend is **Firebase Firestore**, so multiple friends can view and edit
  the same season(s) and stay in sync in real time (no manual file sharing).
- Include the Firebase SDK via `<script>` tags (no build step / bundler).
  Keep the Firebase config object (apiKey, projectId, etc.) in a separate
  `firebase-config.js` file so it's easy to swap per deployment; note in
  comments that this key is safe to expose publicly and that access is
  controlled by Firestore security rules, not by hiding the key.
- **Data model** — one Firestore collection `seasons`, one document per
  season, each holding its own nested data:
  ```
  seasons (collection)
    └── {seasonId} (document)
          - name: string
          - year: number
          - simulationName: string
          . countries: [{ id, name, code }]
          - drivers: [{ id, firstname, lastname, teamId, nationality }]
          - teams: [{ id, name, licenceCountryId, engine }]
          - tracks: [{ id, name, countryId }]
          - results: [{ trackId, date, eventType, positions: [{ position, driverId, laptime, dnf }] }]
  ```
- Use `onSnapshot` (real-time listener) on the currently selected season's
  document so all connected users see edits live, without a manual refresh.
- **Authentication**: use **Firebase Authentication** with the email/password
  provider. Every read and write operation (read/create/update/delete on any season,
  driver, team, track, country or event) must check `firebase.auth().currentUser`
  is not null before calling Firestore; reads are not open to everyone
  (only logged in).
- **Security rules** (Firestore rules, not just client-side checks — the
  client check is just for UX, the real gate is server-side):
  ```
  match /seasons/{seasonId} {
    allow read: if true;
    allow write: if request.auth != null;
  }
  ```
- Note as a setup step for the user: enable the Email/Password provider in
  the Firebase console (Authentication > Sign-in method) and publish the
  rule above in Firestore > Rules.
- **JSON import/export stays available per season** (independent of
  Firebase sync):
  - **Export**: download the currently selected season's document as a
    `.json` file (same shape as the Firestore document above).
  - **Import**: upload a `.json` file to create a *new* season document (or
    overwrite the currently selected one, with a confirmation prompt) —
    useful for backups, sharing a season outside Firebase, or seeding a
    fresh Firebase project with existing data.
  - Both actions are per-season, never "all seasons at once."

## Look & feel
- Motorsport-inspired dark theme: dark background, high-contrast text,
  accent color in F1 red or a team color.
- Card-based layout for drivers/teams/tracks lists.
- Championship tables styled like real F1 standings tables (position, name,
  team, points columns; leader row highlighted).
- Responsive: usable on both desktop and mobile.
- Clear navigation between sections: Drivers | Teams | Tracks | Race Results
  | Standings.
- Login as a simple modal or dedicated view (email + password + "forgot
  password" link only — no sign-up form). Edit controls (add/edit/delete
  buttons, forms) are hidden or disabled when logged out, so logged-out
  visitors get a clean read-only view rather than disabled-looking buttons
  everywhere.

## Tech constraints
- Vanilla HTML/CSS/JS only — no frameworks, no build step (Firebase SDK via
  CDN `<script>` tags, including the Auth module, is the one exception).
- Static files only (`index.html` + linked HTML/CSS/JS in the same folder) so it
  deploys directly to GitHub Pages with zero configuration; Firebase is the
  only external dependency and runs entirely client-side.
- Keep code in small, readable functions; comment non-obvious logic
  (especially points calculation and Firestore listeners).

## Coding conventions
- Use `const`/`let`, no `var`.
- Use descriptive function and variable names (`calculateDriverStandings`,
  not `calcDS`).
- Keep HTML semantic (`<table>` for standings, `<form>` for data entry).
- All read/write functions should take the active `seasonId` explicitly
  (no hidden global season state) so season-switching logic stays simple
  and bug-free.

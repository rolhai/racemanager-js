# Copilot Instructions — Race Manager

## Project

Race Manager is a static, browser-based app for managing Formula 1 seasons,
their countries, drivers, teams, tracks, qualifying and race results, and
championship standings. Season data is stored in Firebase Firestore.

## Current functionality

- **Authentication**: Firebase email/password login, logout, and password
  reset. There is no public sign-up form; accounts are created by the owner
  in Firebase Authentication. The header shows the current auth state.
- **Season management**: create, rename, delete, and select seasons. A season
  has a name, numeric year, simulation name, and its own countries, drivers,
  teams, tracks, and results. Name, year, and simulation name are required.
  Creating a season clears the active season until it is saved; saving selects
  the newly created season.
- **Countries**: create, edit, and delete countries with a name and a unique
  three-character iso code.
- **Drivers**: create, edit, and delete drivers with first name, last name,
  nationality country, and team assignment.
- **Teams**: create, edit, and delete teams with a name, licence country, and
  engine supplier.
- **Tracks**: create, edit, and delete tracks with a name and country.
- **Event results**: create, edit, and delete one result per track and event
  type. Supported event types are Q1, Q2, Q3, sprint (SR), and race (R). Every
  result requires a track and date. Qualifying has positions 1–3, sprint has
  positions 1–8, and race has positions 1–10. Each position can store a
  driver, laptime.
- **Results list**: lists entered results and labels each as upcoming or
  completed based on whether its date is in the future. This is not a separate
  calendar of unentered races.
- **Standings**: standings recalculate from the active season's results.
  Race points are 25-18-15-12-10-8-6-4-2-1 for positions 1–10; sprint points
  are 8-7-6-5-4-3-2-1 for positions 1–8. DNFs score zero. Qualifying does not score championship points.
  Driver standings include points, wins, and podiums and are ordered by points,
  then wins, then podiums. Constructor points sum the points of drivers
  assigned to each team.
- **JSON backup/restore**: export the selected season or import a JSON file.
  Import creates a new season unless a season is selected and the user
  confirms overwriting it. The imported Firestore document ID is not reused
  when creating a new season.

## Data and Firebase

- Use the Firebase JavaScript SDK through CDN script tags in `index.html`;
  there is no build step or framework.
- Firebase settings live in `firebase-config.js`. Its client config is safe to
  expose; Firestore security rules, not secrecy of the client key, control
  access.
- The Firestore model is one `seasons` collection with one document per
  season. The document stores nested arrays:
  ```text
  seasons/{seasonId}
    name: string
    year: number
    simulationName: string
    countries: [{ id, name, code }]
    drivers: [{ id, firstname, lastname, nationality, teamId }]
    teams: [{ id, name, licenceCountryId, engine }]
    tracks: [{ id, name, countryId }]
    results: [{
      id, trackId, date, eventType,
      positions: [{ position, driverId, laptime }]
    }]
  ```
- After authentication, the app listens to the seasons collection and to the
  selected season document with `onSnapshot`. It unsubscribes from the prior
  selected-season listener when switching seasons.
- Signed-out users do not load or see season data. Data-edit form fields are
  disabled, while some add/edit/delete controls remain visible; write handlers
  check authentication and prompt the user to log in. Firestore rules remain
  the authoritative access control.
- Enable Email/Password in Firebase Authentication and publish rules that
  require authentication for both reads and writes:
  ```firestore
  match /seasons/{seasonId} {
    allow read, write: if request.auth != null;
  }
  ```
- Every season's entities and events are edited by updating that season
  document's arrays. Keep mutations scoped to the active season using the
  existing `state.activeSeasonId` and `updateSeasonDocument` helper.

## Look and feel

- Use the existing motorsport-inspired dark theme, red accent, cards, and
  responsive layout.
- Keep the season selector and auth state in the header area, and use the
  existing section navigation: Drivers, Teams, Tracks, Countries, Race
  Results, and Standings.
- Use semantic forms and tables, and preserve the existing login modal and
  feedback banner patterns.

## Coding conventions

- Use vanilla HTML, CSS, and JavaScript; use `const` and `let`, never `var`.
- Keep functions small and names descriptive.
- Preserve the nested per-season Firestore model and existing active-season
  state flow. Check authentication before writes and rely on Firestore rules
  for server-side enforcement.
- Escape user-provided values before inserting them into HTML.
- Keep comments for non-obvious logic, especially points calculations and
  Firestore listeners.

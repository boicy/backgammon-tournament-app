# Quickstart: Named Tournaments & History

**Branch**: `002-tournament-history` | **Date**: 2026-03-04

Extends `specs/001-tournament-tracker/quickstart.md`. Setup, test, and deploy steps are unchanged. This document covers only what is new or different for this feature.

---

## Prerequisites

Same as 001-tournament-tracker:
- Node.js 20+
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No build tools required

---

## Setup & Run

```bash
# Install dev dependencies (Vitest only — unchanged)
npm install

# Run all tests once
npm test

# Run in watch mode (TDD loop)
npm run test:watch

# Serve app locally (required for ES modules)
npx serve .
# Open http://localhost:3000
```

---

## New Test Files

This feature adds two new test files:

```
tests/models/tournamentSnapshot.test.js   # NEW
tests/models/allTimeStanding.test.js      # NEW
```

The existing `tests/store/store.test.js` gains new test cases for `endTournament()`, the updated `initTournament()` auto-archive behavior, and roster updates in `addPlayer()`.

---

## Manual Validation Checklist

Use the following checklist to verify the feature after implementation, using the locally served app and Playwright MCP.

### US1 — Name and Start a Tournament

- [ ] Launching the app with no prior data shows a "Name this tournament" prompt (not the player list)
- [ ] Submitting an empty name shows a validation error and does not proceed
- [ ] Entering a valid name (e.g. "April Club Night") and confirming navigates to the Players view
- [ ] The tournament name is displayed visibly on the Players view
- [ ] Refreshing the page preserves the tournament name (localStorage persistence)
- [ ] The Club tab is visible in the navigation at all times (even before any tournament is archived)

### US2 — End and Archive a Tournament

- [ ] The Players view shows an "End Tournament" button alongside the existing "Reset Tournament" button
- [ ] Clicking "End Tournament" on a tournament with 2 players and 1+ games shows a confirmation
- [ ] Confirming archives the tournament and shows the "Name this tournament" prompt for the next one
- [ ] The archived tournament appears in the Club tab archive list with its name, date, and game count
- [ ] Refreshing after archiving preserves the archive entry
- [ ] Clicking "End Tournament" on a tournament with no players or no games discards data without adding to archive
- [ ] Clicking "Reset Tournament" (existing) discards data without archiving (unchanged behaviour)
- [ ] Starting a new tournament (via name prompt) while one with players+games is active auto-archives the current tournament before creating the new one

### US3 — Browse Tournament Archive

- [ ] The Club tab shows "No past tournaments yet" when no tournaments have been archived
- [ ] After archiving two tournaments, both appear in the Club tab list in reverse chronological order (most recent first)
- [ ] Each list item shows: tournament name, date, and game count
- [ ] Tapping a tournament in the list shows its final standings and full game history (read-only)
- [ ] The detail view has no "Add Player", "Record Game", "Delete" or other edit controls
- [ ] A "Back" button returns to the archive list

### US4 — All-Time Leaderboard

- [ ] The Club tab shows an All-Time leaderboard section above the archive list
- [ ] Before any tournament is archived, the leaderboard shows current players with 0 wins and an explanatory note
- [ ] After archiving two tournaments with different winners, both players show correct tournament win counts
- [ ] A player who won both tournaments shows 2 tournament wins
- [ ] Two players with the same tournament wins are ranked by cumulative match points (higher points ranks first)
- [ ] Recording a new game in the active tournament immediately updates the All-Time leaderboard (cumulative points) without archiving
- [ ] A player who participated in only some tournaments shows the correct `tournamentsPlayed` count

### US5 — Player Roster Suggestions

- [ ] After archiving a tournament with player "Alice", starting a new tournament and typing "Al" in the name field shows "Alice" as a suggestion
- [ ] Selecting the suggestion adds Alice without typing her full name
- [ ] Typing a name not in the roster and submitting adds it normally (and adds it to roster for future use)
- [ ] Before any tournament is archived or any players added, the name field shows no suggestions

---

## localStorage Inspection (browser DevTools)

Open DevTools → Application → Storage → Local Storage to verify:

| Key | Expected content after first tournament archived |
|-----|--------------------------------------------------|
| `backgammon:tournament` | New tournament object (next evening's name) |
| `backgammon:players` | Players for the current (new) tournament |
| `backgammon:games` | `[]` (empty — new tournament just started) |
| `backgammon:archive` | Array with 1 TournamentSnapshot object |
| `backgammon:roster` | Array of player name strings from all tournaments |

---

## File Structure (additions only)

```
src/
├── models/
│   ├── tournamentSnapshot.js  # NEW
│   └── allTimeStanding.js     # NEW
├── views/
│   ├── namePrompt.js          # NEW (#/start route)
│   └── club.js                # NEW (#/club route)

tests/
└── models/
    ├── tournamentSnapshot.test.js  # NEW
    └── allTimeStanding.test.js     # NEW
```

Modified files: `src/store/store.js`, `src/router.js`, `src/main.js`, `src/views/playerRegistration.js`, `index.html`, `styles.css`, `tests/store/store.test.js`.

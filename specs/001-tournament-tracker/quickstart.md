# Quickstart: Backgammon Tournament Tracker

**Branch**: `001-tournament-tracker` | **Date**: 2026-03-04

---

## Prerequisites

- Node.js 20+ (for running tests)
- A modern web browser (Chrome, Firefox, Safari, Edge)
- No build tools, no bundler, no server required for development

---

## Setup

```bash
# Install dev dependencies (Vitest only — nothing goes to production)
npm install

# Run all tests once (TDD gate: all must pass before implementation is "done")
npm test

# Run tests in watch mode (use this during development)
npm run test:watch
```

---

## Run the App Locally

Since the app is plain HTML/CSS/JS with no build step, open the file directly:

```bash
# Option 1: Open directly in browser (simplest)
open index.html

# Option 2: Serve locally (recommended — required for ES modules in some browsers)
npx serve .
# Then open http://localhost:3000
```

> **Why serve locally?** Some browsers restrict ES module imports when using `file://` URLs.
> A local server avoids this. `npx serve .` requires no installation.

---

## Run the Tests

```bash
# Single run (CI / pre-commit)
npm test

# Watch mode (active development / TDD loop)
npm run test:watch
```

Tests live in `tests/`. Each test file mirrors the module it tests:

```
tests/
├── models/
│   ├── game.test.js        # Scoring formula (21 combinations required)
│   ├── player.test.js      # Validation rules
│   └── standing.test.js    # Derivation, tiebreaker, recalculation
└── store/
    └── store.test.js       # Action preconditions, event emission, localStorage persistence
```

**TDD discipline**: Tests for a module MUST be written and observed to fail before the module is implemented. The `npm run test:watch` command makes this cycle fast.

---

## Deploy

The production artifact is the source files themselves — no build step.

```bash
# Deploy to Netlify (drag-and-drop or CLI)
# Point the root directory at the repo root — Netlify serves index.html directly

# Deploy to GitHub Pages
# Push to main; configure Pages to serve from / (root)

# Deploy to Vercel
# Import repo; set framework to "Other"; no build command; output directory "."
```

**Environment variables**: None required. The app has no backend.

---

## Validate the Running App

Use the following checklist to confirm a correct deployment:

- [ ] App loads and shows the Players view with an empty player list
- [ ] Adding two players (e.g. "Alice", "Bob") shows both in the list
- [ ] Adding a duplicate player name shows an error and does not add the player
- [ ] Navigating to Record Game shows both players in the dropdowns
- [ ] Recording a standard win (cube=1) awards 1 match point; gammon=2pts; backgammon=3pts
- [ ] Recording a standard win with cube=4 awards 4 match points
- [ ] Leaderboard shows the winning player ranked above the losing player
- [ ] Game history shows the game; expanding it shows "Standard × 1 = 1 pt" breakdown
- [ ] Deleting a game recalculates the leaderboard correctly
- [ ] Refreshing the page preserves all players and games (localStorage persistence)
- [ ] App is usable on a smartphone screen without horizontal scrolling
- [ ] All interactive elements are tappable without zooming

---

## File Structure

```
backgammon-tournament-app/
├── index.html               # Single HTML shell
├── styles.css               # Global + responsive styles
├── package.json             # devDependencies: vitest only
├── vitest.config.js         # Test runner config (jsdom environment)
│
├── src/
│   ├── main.js              # Entry point: localStorage check, initRouter
│   ├── router.js            # Hash router (#/players, #/record, #/leaderboard, #/history)
│   ├── utils.js             # escapeHtml(), generateId(), formatTimestamp()
│   │
│   ├── store/
│   │   ├── store.js         # State, action functions, localStorage persistence
│   │   └── eventBus.js      # Pub/sub (Comment node EventTarget)
│   │
│   ├── models/
│   │   ├── player.js        # createPlayer(), validatePlayerName()
│   │   ├── game.js          # createGame(), calculateMatchPoints()
│   │   ├── tournament.js    # createTournament()
│   │   ├── standing.js      # deriveStandings(players, games) — pure function
│   │   └── roundRobin.js    # generateSchedule(), getPairingStatus()
│   │
│   └── views/
│       ├── playerRegistration.js  # US1: add/remove players, round-robin toggle
│       ├── recordGame.js          # US2: record game with cube value
│       ├── leaderboard.js         # US3: live standings + schedule panel
│       └── gameHistory.js         # US4: expandable history + filter + delete
│
└── tests/
    ├── utils.test.js
    ├── models/
    │   ├── game.test.js
    │   ├── player.test.js
    │   ├── standing.test.js
    │   ├── tournament.test.js
    │   └── roundRobin.test.js
    ├── store/
    │   └── store.test.js
    └── views/
        ├── playerRegistration.test.js
        ├── recordGame.test.js
        ├── leaderboard.test.js
        └── gameHistory.test.js
```

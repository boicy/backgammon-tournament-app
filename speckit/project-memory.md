# Backgammon Tournament App — Project Memory

**Last updated:** 2026-03-06
**Current branch:** main (PR #6 merged)

---

## What This App Does

A mobile-first tournament director tool for running backgammon club nights. One director runs it on their phone to track live matches, record game results, view standings, and archive completed tournaments.

---

## Completed Features (PRs merged to main)

### PR #1 — 001-tournament-tracker
- Start a named tournament
- Register players
- Record games (winner, result type, cube value)
- View live leaderboard (match points)
- Basic game history

### PR #2 — 002-tournament-history
- End tournament → archived snapshot
- Browse past tournaments in Club view
- All-time standings across all archived tournaments
- Club roster (suggestions from past players)

### PR #3 — 003-match-mode
- Match-based play: players compete in a match to a target score
- Multiple games per match; match completes when target reached
- Standings derived from match results, not individual games
- Round-robin schedule generation

### PR #4 (merged as part of 004) — 004-ux-redesign
Scoreboard-style UI overhaul:
- **2-tab nav**: Live + Standings (hamburger for History, Club, End/Reset)
- **Inline game recording**: record games directly on match cards (no separate page)
- **Collapsible roster/form**: roster, add-player, new-match all expand/collapse inline
- **Live column on standings**: shows active match info for each player
- Hash-based routing: `#/live`, `#/leaderboard`, `#/history`, `#/club`, `#/start`

### PR #5/6 — Navigation + Empty State fixes (today)
- Hamburger menu now includes **Live and Standings** back-links (hidden when no tournament)
- **History view**: full centred empty-state card with CTA when no tournament active
- **Club view**: amber banner above existing content with CTA when no tournament active

---

## Tech Stack

| Concern | Choice |
|---|---|
| Language | Vanilla JS ES2022+ (native ES modules) |
| Framework | None |
| Build | None (serve static files) |
| Styles | CSS3 with custom properties |
| State | Centralized store + pub/sub event bus |
| Persistence | `localStorage` (6 keys) |
| Unit tests | Vitest 3.x + jsdom |
| E2e tests | Playwright (Chromium) |
| Dev server | `npx serve .` |

---

## Architecture

```
src/
  main.js              — entry point; localStorage boot; initRouter
  router.js            — hash router; view lifecycle; hamburger menu
  utils.js             — escapeHtml, generateId, formatTimestamp
  store/
    store.js           — all state + actions; loadFromStorage
    eventBus.js        — Comment node EventTarget pub/sub
  models/
    player.js          — createPlayer, validatePlayerName
    game.js            — createGame, calculateMatchPoints
    match.js           — createMatch, isMatchComplete, matchWinner
    tournament.js      — createTournament
    standing.js        — deriveStandings (legacy)
    matchStanding.js   — deriveMatchStandings (current)
    roundRobin.js      — generateSchedule, getPairingStatus
    tournamentSnapshot.js — createSnapshot
    allTimeStanding.js — deriveAllTimeStandings
  views/
    namePrompt.js      — tournament name entry (#/start)
    liveView.js        — live match cards + inline recording (#/live)
    leaderboard.js     — standings table with Live column (#/leaderboard)
    gameHistory.js     — match-grouped history (#/history)
    club.js            — archive list + all-time table (#/club)
tests/
  models/              — unit tests for all model functions
  store/               — store action tests
  views/               — unit tests for view render functions
  e2e/                 — Playwright tests (18 files, 106 tests)
```

---

## localStorage Keys

| Key | Contents |
|---|---|
| `backgammon:tournament` | Active tournament object (null if none) |
| `backgammon:players` | Active tournament players array |
| `backgammon:matches` | Active tournament matches array |
| `backgammon:schedule` | Round-robin schedule (optional) |
| `backgammon:archive` | Array of past tournament snapshots |
| `backgammon:roster` | Club roster (all-time player names) |

---

## Routing

| Route | View | Guarded? |
|---|---|---|
| `#/start` | namePrompt | No |
| `#/live` | liveView | Yes (→ /start) |
| `#/leaderboard` | leaderboard | Yes (→ /start) |
| `#/history` | gameHistory | No |
| `#/club` | club | No |

Legacy redirects: `#/players` → `#/live`, `#/match` → `#/live`

---

## Scoring

`matchPoints = resultTypeMultiplier × cubeValue`

- standard = 1×, gammon = 2×, backgammon = 3×
- cubeValue ∈ {1, 2, 4, 8, 16, 32, 64}

---

## Test Counts (as of 2026-03-06)

- **281 Vitest unit tests** (15 files, 14 skipped)
- **106 Playwright e2e tests** (18 files, Chromium only)

---

## Commands

```bash
npm test                    # run all unit tests
npm run test:watch          # TDD watch mode
npx playwright test         # run all e2e tests
npx serve . --listen 3456   # dev server
```

---

## Key Conventions

- `escapeHtml()` before every `innerHTML` insertion of user data
- All IDs via `crypto.randomUUID()`, timestamps via `Date.now()`
- Views export `render(container)`, `onMount(container)`, `onUnmount()`
- Event delegation on container — one listener survives re-renders
- Store events: `state:players:changed`, `state:matches:changed`, `state:standings:changed`, `state:schedule:changed`, `state:reset`
- CSS single-dash BEM: `.btn-primary`, `.live-card--active` (double-dash for modifiers only)
- `[hidden] { display: none !important; }` in CSS reset — required to override flex defaults

---

## Known Issues / Future Work

- No authentication — single-user, single-device
- No cloud sync — data lives in browser localStorage only
- Round-robin schedule generation exists but is not prominently surfaced in the UI
- Standings sorted by match points; tiebreakers not implemented

# Implementation Plan: Backgammon Tournament Tracker

**Branch**: `001-tournament-tracker` | **Date**: 2026-03-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-tournament-tracker/spec.md`

## Summary

Build a vanilla JavaScript single-page web application for tracking backgammon tournament results during an evening event. The app supports player registration, game result recording (with doubling cube scoring), a live leaderboard ranked by match points, and a game history with expandable score breakdowns. State is managed in a centralized store persisted to localStorage. No framework, no backend, no build step for production. Deployed as plain HTML/CSS/JS to a static host.

## Technical Context

**Language/Version**: HTML5 / CSS3 / Vanilla JavaScript (ES2022+)
**Primary Dependencies**: None (production). Vitest 3.x (dev only, for TDD).
**Storage**: `localStorage` — three keys: `backgammon:tournament`, `backgammon:players`, `backgammon:games`
**Testing**: Vitest 3.x with `jsdom` environment. `npm test` (single run) / `npm run test:watch` (TDD loop).
**Target Platform**: Modern web browsers (Chrome 92+, Firefox 95+, Safari 15.4+) on smartphone, tablet, laptop
**Project Type**: Static single-page web application
**Performance Goals**: Game result recorded in < 30 seconds; leaderboard update visible within 5 seconds
**Constraints**: No backend; offline-capable; responsive (smartphone, tablet, laptop); 44px min touch targets; no build step for production
**Scale/Scope**: 2–20 players, up to 200 games per evening session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| **Simplicity gate**: No framework, build tool, or runtime dep without justification | PASS | Vitest is dev-only; Vite is a transitive peer dep used only at test time, never in production. No other dependencies. |
| **TDD gate**: Every user story has test tasks before and blocking implementation tasks | PASS | Test tasks will precede all implementation tasks in tasks.md. |
| **Static gate**: No server-side component, API endpoint, or external DB | PASS | Data persisted to localStorage only. App deployable as plain files. |
| **Integrity gate**: All score calculation paths covered by unit tests (3 types x 7 cube values = 21 combinations) | PASS | `calculateMatchPoints()` test matrix defined in data-model.md. Tests written before implementation. |

No violations. Complexity Tracking table not required.

## Project Structure

### Documentation (this feature)

```text
specs/001-tournament-tracker/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── store-api.md     # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backgammon-tournament-app/
├── index.html               # Single HTML shell with nav and <main id="app">
├── styles.css               # Global styles, responsive layout, 44px touch targets
├── package.json             # type: module; scripts: test, test:watch; devDeps: vitest
├── vitest.config.js         # environment: jsdom; include: tests/**/*.test.js
│
├── src/
│   ├── main.js              # Entry point: wires router to #app container
│   ├── router.js            # Hash router: #/players, #/record, #/leaderboard, #/history
│   ├── utils.js             # escapeHtml(), generateId() via crypto.randomUUID(), formatTimestamp()
│   │
│   ├── store/
│   │   ├── store.js         # Module-private state; action functions; localStorage persistence
│   │   └── eventBus.js      # Pub/sub via Comment node EventTarget
│   │
│   ├── models/
│   │   ├── player.js        # createPlayer(), validatePlayerName()
│   │   ├── game.js          # createGame(), calculateMatchPoints(resultType, cubeValue)
│   │   ├── tournament.js    # createTournament()
│   │   └── standing.js      # deriveStandings(players, games) -- pure function
│   │
│   └── views/
│       ├── playerRegistration.js   # render/onMount/onUnmount for #/players
│       ├── recordGame.js           # render/onMount/onUnmount for #/record
│       ├── leaderboard.js          # render/onMount/onUnmount for #/leaderboard
│       └── gameHistory.js          # render/onMount/onUnmount for #/history
│
└── tests/
    ├── models/
    │   ├── game.test.js         # calculateMatchPoints -- all 21 combinations
    │   ├── player.test.js       # createPlayer, validatePlayerName
    │   └── standing.test.js     # deriveStandings -- all edge cases
    └── store/
        └── store.test.js        # Action preconditions, localStorage persistence, event emission
```

**Structure Decision**: Single-project static web app. No backend/frontend split — client-only. All source in `src/`, all tests in `tests/`, both at repo root.

## Architecture Decisions

### State Management

Centralized module-private store in `store/store.js`. All reads via `getState()`, all writes via named action functions (`addPlayer`, `recordGame`, `deleteGame`, etc.). Views never mutate state directly.

Standings are **always derived** by calling `deriveStandings(players, games)` inside `getState()` — never stored. This eliminates stale computed value bugs.

### Event System

`store/eventBus.js` uses a Comment node as EventTarget. Granular events (`state:players:changed`, `state:games:changed`, `state:standings:changed`, `state:reset`) allow views to subscribe only to what they need.

### Routing

Hash-based router (`#/route` + `hashchange`). No server config required. Preserves active view on page refresh. Router calls `view.onUnmount()` then `view.render(container)` then `view.onMount(container)` on each navigation.

### Rendering

Full `innerHTML` replacement per view on navigation. Leaderboard uses targeted `<tbody>` update on `state:standings:changed` to avoid disrupting interactions. All user-generated strings escaped via `escapeHtml()` before `innerHTML`. Event delegation on the view container in `onMount()` — survives re-renders, cleaned up in `onUnmount()`.

### Persistence

`localStorage` written after every state mutation. Three keys: `backgammon:tournament`, `backgammon:players`, `backgammon:games`. Every `setItem` wrapped in try/catch for quota errors. In-memory state remains valid on write failure; user sees a non-blocking warning.

### ID Generation

`crypto.randomUUID()` for all entity IDs. Timestamps as `Date.now()` (Unix epoch integer).

## Phase 0 Research Summary

See [`research.md`](./research.md) for full findings. All decisions resolved:

| Topic | Decision |
|-------|----------|
| Test runner | Vitest 3.x + jsdom |
| App architecture | Centralized store + pub/sub event bus + hash router + view modules |
| localStorage | Three separate keys; JSON.stringify/parse; crypto.randomUUID() for IDs |
| Scoring formula | matchPoints = resultTypeMultiplier x cubeValue |

## Phase 1 Design Artifacts

- [`data-model.md`](./data-model.md) — Entity schemas, validation rules, scoring table, test coverage requirements
- [`contracts/store-api.md`](./contracts/store-api.md) — Store action contracts, event bus contract, view module contract
- [`quickstart.md`](./quickstart.md) — Setup, local run, test execution, deployment, validation checklist

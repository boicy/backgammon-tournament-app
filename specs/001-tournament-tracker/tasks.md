---
description: "Task list template for feature implementation"
---

# Tasks: Backgammon Tournament Tracker

**Input**: Design documents from `/specs/001-tournament-tracker/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/store-api.md

**Tests**: MANDATORY per constitution (TDD non-negotiable). Test tasks MUST appear before and block their corresponding implementation tasks. Tests MUST be observed to fail before implementation begins.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user story (US1–US5)
- Exact file paths included in all descriptions

---

## Phase 1: Setup

**Purpose**: Project initialization and base file structure

- [X] T001 Create directory structure: src/, src/store/, src/models/, src/views/, tests/, tests/models/, tests/store/, tests/views/
- [X] T002 Create package.json with `"type": "module"`, scripts (`test`, `test:watch`), devDependencies `vitest` in package.json
- [X] T003 [P] Create vitest.config.js with `environment: 'jsdom'` and `include: ['tests/**/*.test.js']`
- [X] T004 [P] Create index.html with viewport meta, `<nav>` links (`#/players`, `#/record`, `#/leaderboard`, `#/history`), `<main id="app">`, `<script type="module" src="src/main.js">`
- [X] T005 [P] Create styles.css with CSS reset, CSS custom properties (colors, spacing, border-radius), responsive base layout, 44px minimum touch target rule for all interactive elements

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core models, store, and infrastructure that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

### TDD: Scoring Formula (Integrity Gate — 21 combinations required)

- [X] T006 Write failing tests for `calculateMatchPoints(resultType, cubeValue)` covering all 21 combinations (standard/gammon/backgammon × 1/2/4/8/16/32/64) and `createGame()` validation rules (player1Id === player2Id, invalid winnerId, invalid cubeValue) in tests/models/game.test.js
- [X] T007 Implement src/models/game.js with `calculateMatchPoints(resultType, cubeValue)` and `createGame(gameData)` factory to pass T006 tests

### TDD: Player Validation

- [X] T008 [P] Write failing tests for `createPlayer(name, existingPlayers)` and `validatePlayerName(name, existingPlayers)` covering: duplicate name (same case), duplicate name (different case), empty name, name exceeding 50 chars, valid name in tests/models/player.test.js
- [X] T009 [P] Implement src/models/player.js with `createPlayer()` and `validatePlayerName()` to pass T008 tests

### TDD: Standing Derivation

- [X] T010 Write failing tests for `deriveStandings(players, games)` covering: zero games (all players at zero), single game, multiple games per player, tied match points (tiebreaker: fewer losses ranks higher), recalculation correctness after a game is removed in tests/models/standing.test.js
- [X] T011 Implement src/models/standing.js with `deriveStandings(players, games)` pure function (no DOM, no store imports) to pass T010 tests

### Shared Infrastructure

- [X] T012a [P] Write failing tests for `createTournament(name)` in tests/models/tournament.test.js covering: returns object with a UUID `id`, trimmed `name`, today's date string, and `status: 'active'`; throws on empty name
- [X] T012 [P] Implement src/models/tournament.js with `createTournament(name)` factory to pass T012a tests
- [X] T013a [P] Write failing tests for `escapeHtml(str)` and `formatTimestamp(epochMs)` in tests/utils.test.js covering: `escapeHtml` converts `&`, `<`, `>`, `"` to their HTML entities; `formatTimestamp` returns a non-empty human-readable string for a valid epoch value
- [X] T013 [P] Implement src/utils.js with `escapeHtml(str)`, `generateId()` using `crypto.randomUUID()`, and `formatTimestamp(epochMs)` to pass T013a tests
- [X] T014 [P] Implement src/store/eventBus.js with `on(event, handler)`, `off(event, handler)`, `emit(event, detail)` using a Comment node as EventTarget

### TDD: Store

- [X] T015 Write failing tests for all store actions in tests/store/store.test.js covering: `addPlayer` (success, duplicate rejection), `removePlayer` (success, reject if has games), `recordGame` (success, matchPoints computed correctly, invalid input rejection), `deleteGame` (success, standings recalculated), `resetTournament` (clears all state and localStorage), `initTournament` (creates new tournament), localStorage persistence (state survives simulated reload), quota error handling (setItem throws QuotaExceededError → in-memory state preserved)
- [X] T016 Implement src/store/store.js with module-private `let state`, `getState()` returning state with freshly derived standings, all action functions, localStorage read on init, write after each mutation with `try/catch` for quota exceeded errors to pass T015 tests

### Router and Entry Point

- [X] T017 Implement src/router.js with hash-based routing (`window.location.hash`, `hashchange` event), view lifecycle management (`view.onUnmount()` → `view.render(container)` → `view.onMount(container)`), active nav link highlighting, default route `#/players`
- [X] T018 Implement src/main.js as entry point: import `initRouter` from router.js, call `initRouter(document.getElementById('app'))` on DOMContentLoaded

**Checkpoint**: Foundation complete — all user story implementations can now begin in parallel

---

## Phase 3: User Story 1 - Register Players (Priority: P1) — MVP Start

**Goal**: Organizer can add and remove players; list persists across page refresh

**Independent Test**: Open app → add two players → confirm both appear in list → refresh page → confirm both still listed

### Tests for User Story 1 ⚠️ WRITE FIRST (TDD)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T019 [P] [US1] Write failing acceptance tests in tests/views/playerRegistration.test.js for: render with empty player list shows empty state message, add player (type name + submit) → player appears in list, duplicate name submission → error message shown, remove player with no games → player removed from list, remove player with games → error shown, reset tournament button → shows confirmation before clearing

### Implementation for User Story 1

- [X] T020 [US1] Implement src/views/playerRegistration.js with `render(container)`, `onMount(container)` (event delegation for add-player form submit, remove-player button clicks, reset-tournament button; subscribe to `state:players:changed`), `onUnmount()` (unsubscribe) to pass T019 tests
- [X] T021 [US1] Add player registration view styles to styles.css: player list, add-player form layout, remove button, reset button, empty state, inline error messages, responsive single-column layout for mobile

**Checkpoint**: US1 fully functional and independently testable

---

## Phase 4: User Story 2 - Record a Game Result (Priority: P1) — Completes MVP

**Goal**: Record completed game (players, winner, result type, cube value); result reflected in standings; incorrect results can be deleted

**Independent Test**: Register two players → navigate to Record Game → select players, result type, cube value → submit → confirm correct match points in store; navigate to history → delete game → confirm standings recalculated

### Tests for User Story 2 ⚠️ WRITE FIRST (TDD)

- [X] T022 [P] [US2] Write failing acceptance tests in tests/views/recordGame.test.js for: render shows player dropdowns populated from state, same player selected for both roles → error shown, winner not matching either player → prevented, result type defaults to standard, cube toggle off → cubeValue=1, cube toggle on → dropdown appears with values 2/4/8/16/32/64, form submit → `recordGame` store action called with correct arguments including computed matchPoints, subscribe to `state:players:changed` → dropdowns refresh when players change

### Implementation for User Story 2

- [X] T023 [US2] Implement src/views/recordGame.js with `render(container)`, `onMount(container)` (event delegation for form submit, cube toggle change, player dropdown validation; subscribe to `state:players:changed` to refresh dropdowns), `onUnmount()` to pass T022 tests
- [X] T024 [US2] Add record game view styles to styles.css: form layout, player select dropdowns, result type radio buttons, cube toggle + value selector (hidden by default, revealed on toggle), validation error states, submit button, responsive mobile layout

**Checkpoint**: US2 fully functional — P1 stories complete, MVP deliverable

---

## Phase 5: User Story 3 - Live Standings / Leaderboard (Priority: P2)

**Goal**: Live leaderboard ranked by match points; updates immediately when a game is recorded without full page reload

**Independent Test**: Register 3 players → record games with varied scores → confirm ranking order (most points first, fewer losses as tiebreaker) → record another game → confirm leaderboard updates without page reload

### Tests for User Story 3 ⚠️ WRITE FIRST (TDD)

- [X] T025 [P] [US3] Write failing acceptance tests in tests/views/leaderboard.test.js for: render with no games → all players shown with zero stats, render with games → players ranked by matchPoints descending, tied matchPoints → player with fewer losses ranks higher, `state:standings:changed` event → only `<tbody>` is replaced (not full view re-render), leaderboard leader row visually distinguished

### Implementation for User Story 3

- [X] T026 [US3] Implement src/views/leaderboard.js with `render(container)`, `onMount(container)` (subscribe to `state:standings:changed` for targeted `<tbody>` update only — not full re-render), `onUnmount()` to pass T025 tests
- [X] T027 [US3] Add leaderboard styles to styles.css: standings table, rank column, match-points/wins/losses/games-played columns, leader row highlight (rank 1), horizontally scrollable table on small screens, responsive

**Checkpoint**: US3 fully functional and independently testable

---

## Phase 6: User Story 4 - Game History (Priority: P3)

**Goal**: Full game history with expandable score breakdowns and player filter; incorrect games deletable

**Independent Test**: Record 3+ games → open history → confirm all listed in sequence order with total pts visible → expand one → confirm breakdown shows (e.g., "Gammon × 4 = 8 pts") → filter by player name → confirm only their games shown → delete a game → confirm removed from history and leaderboard recalculated

### Tests for User Story 4 ⚠️ WRITE FIRST (TDD)

- [X] T028 [P] [US4] Write failing acceptance tests in tests/views/gameHistory.test.js for: render shows all games in sequence order, each entry shows player names + winner + total matchPoints, expand entry → shows score breakdown `"<resultType> × <cubeValue> = <pts> pts"`, collapse expanded entry, filter input → only matching player games shown, filter cleared → all games shown, delete button → calls `deleteGame` store action, subscribe to `state:games:changed` → history re-renders on game recorded or deleted

### Implementation for User Story 4

- [X] T029 [US4] Implement src/views/gameHistory.js with `render(container)`, `onMount(container)` (event delegation for expand/collapse toggles, delete button with `confirm()` dialog, player filter input; subscribe to `state:games:changed` for full list re-render), `onUnmount()` to pass T028 tests
- [X] T030 [US4] Add game history styles to styles.css: history list, game entry row (summary line), expandable breakdown panel (hidden by default, revealed on expand), filter input, delete button, empty state, responsive

**Checkpoint**: US4 fully functional — all four user stories independently testable

---

## Phase 7: Round-Robin Mode (FR-014)

**Goal**: Organizer can optionally enable round-robin mode to generate a full schedule and track pending/complete matchups

**Independent Test**: Enable round-robin with 4 players → confirm 6 pairings generated → record a game for one pairing → confirm it shows as complete → disable round-robin → confirm schedule hidden

### Tests for Round-Robin ⚠️ WRITE FIRST (TDD)

- [X] T031 [P] [US5] Write failing tests in tests/models/roundRobin.test.js for: `generateSchedule(players)` → produces all unique pairings (N×(N-1)/2 for N players), no duplicate pairings, no self-pairings; `getPairingStatus(schedule, games)` → returns pending/complete for each pairing based on recorded games
- [X] T032 [P] [US5] Write failing tests in tests/store/store.test.js (add to existing) for: `enableRoundRobin()` → stores schedule, emits `state:schedule:changed`; `disableRoundRobin()` → clears schedule, emits `state:schedule:changed`

### Implementation for Round-Robin

- [X] T033 [US5] Implement src/models/roundRobin.js with `generateSchedule(players)` and `getPairingStatus(schedule, games)` pure functions to pass T031 tests
- [X] T034 [US5] Add `enableRoundRobin()` and `disableRoundRobin()` actions and `state:schedule:changed` event to src/store/store.js; update `getState()` to include schedule and pairing statuses to pass T032 tests
- [X] T035 [US5] Add round-robin toggle to src/views/playerRegistration.js (enable/disable button; subscribe to `state:players:changed` and rebuild schedule when players change while round-robin is active)
- [X] T036 [US5] Add schedule panel to src/views/leaderboard.js showing all pairings with pending/complete badges when round-robin is active; subscribe to `state:schedule:changed` for updates
- [X] T037 [US5] Add round-robin styles to styles.css: enable/disable toggle button, schedule panel, pairing row, pending/complete status badges, responsive

**Checkpoint**: Round-robin mode functional and independently testable

---

## Phase 8: Polish and Cross-Cutting Concerns

**Purpose**: Reliability, accessibility, and end-to-end validation

- [X] T038 [P] Add localStorage availability check to src/main.js: on startup, test `localStorage` write/read; if unavailable (private browsing, blocked), render a non-blocking warning banner in index.html notifying user that data will not persist
- [X] T039 [P] Accessibility audit: add `aria-label` attributes to all icon-only buttons, verify keyboard navigation (Tab order, Enter/Space on custom controls), confirm all interactive elements meet 44px touch target minimum in styles.css
- [ ] T040 Run quickstart.md validation checklist across smartphone viewport (375px), tablet viewport (768px), and desktop viewport (1280px); confirm all checklist items pass

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; T003/T004/T005 can run in parallel after T001/T002
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
  - T006→T007 (scoring TDD sequential)
  - T008→T009 (player TDD sequential, parallel to T006/T007)
  - T010→T011 (standing TDD sequential, parallel to above)
  - T012a→T012 / T013a→T013 / T014 (parallel infrastructure; T012a/T013a are test-first tasks)
  - T015→T016 (store TDD sequential, depends on T007/T009/T011/T012/T013/T014)
  - T017→T018 (sequential, depends on T016)
- **User Stories (Phases 3–7)**: All depend on Phase 2 completion; can proceed in priority order or parallel
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (Phase 3)**: Independent — no US dependencies after Foundational
- **US2 (Phase 4)**: Independent — no US dependencies after Foundational
- **US3 (Phase 5)**: Independent — no US dependencies (standings computed from store)
- **US4 (Phase 6)**: Independent — no US dependencies (reads games from store)
- **US5 Round-Robin (Phase 7)**: Depends on US1 complete (needs player list UI)

### Within Each User Story

1. Tests MUST be written and observed to FAIL before implementation
2. Implementation completes to make tests pass
3. View styles added after view logic is working
4. Story is complete and independently testable before moving to next priority

### Parallel Opportunities Within Foundational Phase

```
# Launch in parallel (different files):
T008: tests/models/player.test.js
T010: tests/models/standing.test.js
T006: tests/models/game.test.js (start first — scoring is the integrity gate)

# Launch in parallel after T007/T009/T011 (tests first):
T012a: tests/models/tournament.test.js → T012: src/models/tournament.js
T013a: tests/utils.test.js → T013: src/utils.js
T014: src/store/eventBus.js

# Sequential after above:
T015: tests/store/store.test.js → T016: src/store/store.js
T017: src/router.js → T018: src/main.js
```

---

## Implementation Strategy

### MVP First (P1 User Stories Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational — CRITICAL, blocks all stories
3. Complete Phase 3: US1 Register Players → **stop and validate independently**
4. Complete Phase 4: US2 Record Game → **STOP: full MVP is live and usable**
5. Deploy and demo; tournament can run with just these two phases

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → test independently → tournament roster works
3. US2 → test independently → **MVP: tournament fully runnable**
4. US3 → live standings visible mid-tournament
5. US4 → full history and score breakdowns available
6. Round-Robin → structured tournament format available

---

## Notes

- `[P]` = different files, no incomplete task dependencies — safe to run in parallel
- `[USn]` maps each task to its user story for traceability
- Tests marked `⚠️ WRITE FIRST (TDD)` MUST be created and observed to FAIL before running any implementation task in that story
- Commit after each checkpoint (end of each phase) at minimum
- Stop at any checkpoint to validate story independently before proceeding

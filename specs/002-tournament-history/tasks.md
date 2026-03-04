# Tasks: Named Tournaments & History

**Input**: Design documents from `/specs/002-tournament-history/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/store-api.md ✅, quickstart.md ✅

**Tests**: Tests are MANDATORY per the project constitution (TDD non-negotiable). Test tasks MUST appear before and block their corresponding implementation tasks. Tests MUST be observed to fail before implementation begins.

**E2E Tests**: Playwright e2e tests go in `tests/e2e/`. The `playwright.config.js` serves the app on `http://localhost:4173` via `npx serve . --listen 4173`. Per the constitution, any test failure during execution via the Playwright MCP MUST have artifacts captured before debugging: full-page screenshot via `browser_take_screenshot` (fullPage) to `./artifacts/screenshots/<timestamp>-failure.png` and console log via `browser_console_messages` to `./artifacts/console/<timestamp>.log`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: HTML and CSS scaffolding and Playwright E2E directory structure. No logic changes.

- [X] T001 Add "Club" as the 5th navigation tab to `index.html` (after "History"); link href `#/club`; add `aria-label="Club and History"` or equivalent
- [X] T002 Add CSS for new components in `styles.css`: `.name-prompt` (tournament name form), `.club-section` (Club tab outer container), `.archive-list` (past tournaments list), `.archive-item` (clickable list entry), `.tournament-detail` (read-only detail view), `.all-time-table` (All-Time leaderboard), `.club-note` (explanatory note when no archives); ensure all touch targets ≥44px
- [X] T003 Create `tests/e2e/` directory; confirm `playwright.config.js` testDir points to `./tests/e2e` and webServer serves on port 4173

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core state shape and router infrastructure that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests ⚠️ WRITE FIRST (TDD)

- [X] T004 [P] Write failing Vitest unit tests for store foundations in `tests/store/store.test.js`: (a) `loadFromStorage()` defaults `archive` to `[]` when `backgammon:archive` key is missing; (b) `loadFromStorage()` defaults `roster` to `[]` when `backgammon:roster` key is missing; (c) `getState()` returns `archive` and `roster` fields; (d) `resetForTesting()` resets `archive` and `roster` to `[]`; run `npm test` and confirm these tests fail
- [X] T005 [P] Write failing Vitest unit tests for tournament name validation in `tests/store/store.test.js`: `initTournament('')` throws `Error("Tournament name is required")`; `initTournament('   ')` throws; `initTournament('valid name')` does not throw; run `npm test` and confirm these tests fail
- [X] T008 [P] Write failing Vitest unit tests for router guard logic in `tests/router.test.js` (using jsdom): (a) when `getState().tournament === null` and path is `/players`, `navigate()` sets `window.location.hash` to `#/start`; (b) when `getState().tournament === null` and path is `/start`, navigation proceeds without redirect; (c) when `getState().tournament === null` and path is `/club`, navigation proceeds without redirect; (d) when tournament exists, navigation to `/players` proceeds normally; run `npm test` and confirm these tests fail *(C1 fix: test written before implementation)*

### Implementation

- [X] T006 Update `src/store/store.js`: add `archive: []` and `roster: []` to the `state` object and to `resetForTesting()`; update `KEYS` constant with `archive: 'backgammon:archive'` and `roster: 'backgammon:roster'`; update `loadFromStorage()` to read both new keys (default to `[]` if missing or parse error); update `getState()` to return `archive: [...state.archive]` and `roster: [...state.roster]`; confirm T004 tests now pass
- [X] T007 Update `src/store/store.js`: add name validation at top of `initTournament(name)` — trim whitespace, throw `Error("Tournament name is required")` if empty, throw `Error("Tournament name too long")` if > 100 chars; confirm T005 tests now pass
- [X] T009 Update `src/router.js`: add `/start` and `/club` to the `ROUTES` map (dynamic imports of `./views/namePrompt.js` and `./views/club.js`); add router guard inside `navigate()` — if `getState().tournament === null` and `path` is not `/start` and not `/club`, call `history.replaceState(null, '', '#/start')` and set `path = '/start'` before loading the view; update the no-hash default so it falls through to the guard rather than hardcoding `#/players`; confirm T008 tests now pass

**Checkpoint**: Store accepts archive+roster state; router redirects unauthenticated routes to `#/start`; all Vitest tests pass.

---

## Phase 3: User Story 1 — Name and Start a Tournament (Priority: P1) 🎯 MVP

**Goal**: App always requires a tournament name before showing the player list. Name is displayed on the Players view and persists across refresh.

**Independent Test**: Clear all localStorage → open app → confirm name prompt appears → enter "Test Tournament" → confirm Players view appears with "Test Tournament" heading → refresh → confirm name is still displayed.

### Tests for User Story 1 ⚠️ WRITE FIRST (TDD)

- [X] T010 [US1] Write failing Playwright e2e tests for US1 acceptance scenarios in `tests/e2e/us1-name-tournament.test.js`: (SC1) fresh app with no localStorage shows name prompt, NOT the player list; (SC2) submitting empty name shows validation error and stays on prompt; (SC3) entering "April Club Night" and confirming navigates to Players view with "April Club Night" visible in the heading area; (SC4) refreshing the page after naming preserves the tournament name; run `npx playwright test us1` and confirm tests fail *(Note: initial failure may be a JS module import error for namePrompt.js — this is expected and counts as the required red state)*

### Implementation for User Story 1

- [X] T011 [US1] Create `src/views/namePrompt.js` exporting `render(container)`, `onMount(container)`, `onUnmount()`: render a form with text input for tournament name (max 100 chars), a submit button, and an error message area; on submit, trim the name, show inline error if empty, call `initTournament(name)` on success, then navigate to `#/players` via `window.location.hash = '#/players'`; subscribe to `state:reset` in `onMount` (re-render on reset); confirm T010 test SC1–SC3 now pass
- [X] T012 [US1] Update `src/views/playerRegistration.js` to display the active tournament name as a prominent heading (e.g., `<h2 class="tournament-name">...</h2>`) using `getState().tournament.name`; subscribe to `state:reset` to re-render if tournament changes; confirm T010 test SC2–SC4 now pass

**Checkpoint**: App opens name prompt with no data. Valid name starts tournament and shows player list with name displayed. Name persists on refresh.

---

## Phase 4: User Story 2 — End and Archive a Tournament (Priority: P1)

**Goal**: Organizer can explicitly end a tournament, archiving it to localStorage. Starting a new tournament auto-archives the current one. Empty tournaments are discarded.

**Independent Test**: Add 2 players, record 1 game → click "End Tournament" → confirm confirmation dialog → confirm archive has 1 entry in Club tab → refresh → confirm archive entry persists → open app → confirm name prompt appears → enter new name → confirm new tournament starts fresh.

### Tests for User Story 2 ⚠️ WRITE FIRST (TDD)

- [X] T013 [P] [US2] Write failing Vitest unit tests for `src/models/tournamentSnapshot.js` in `tests/models/tournamentSnapshot.test.js`: `createSnapshot(tournament, players, games)` returns correct id, name, date, archivedAt, deep-copied players, deep-copied games, pre-computed finalStandings (using `deriveStandings`), winnerName (first-ranked player's name), and gameCount; `snapshotWinner(snapshot)` returns first-ranked player's name or null for empty standings; mutating original players array does not affect snapshot; run `npm test` and confirm these tests fail
- [X] T014 [P] [US2] Write failing Vitest unit tests for `endTournament()` and updated `initTournament()` in `tests/store/store.test.js`: `endTournament()` with 1+ players and 1+ games appends a snapshot to state.archive and emits `state:archive:changed` and `state:reset`; `endTournament()` with 0 games discards without archiving; `endTournament()` with 0 players discards without archiving; `initTournament('New')` when called with active tournament that has players+games first archives then creates new tournament; run `npm test` and confirm these tests fail
- [X] T015 [P] [US2] Write failing Playwright e2e tests for US2 in `tests/e2e/us2-end-archive.test.js`: (AC1) End Tournament with 2 players + 1 game shows confirm → archives → app navigates to name prompt; (AC2) starting a new tournament while 1 existing has players+games auto-archives before prompting for new name; (AC3) archived tournament visible in Club tab after refresh; (AC4) End Tournament with no players or no games discards without adding to archive; also verify Reset Tournament button still discards without archiving (FR-003 regression, E2 fix); run `npx playwright test us2` and confirm tests fail

### Implementation for User Story 2

- [X] T016 [US2] Create `src/models/tournamentSnapshot.js` exporting `createSnapshot(tournament, players, games)` and `snapshotWinner(snapshot)` per the data-model.md spec; use `JSON.parse(JSON.stringify(...))` for deep copy; call `deriveStandings` from `../models/standing.js` for finalStandings; set `archivedAt: Date.now()`; confirm T013 tests now pass
- [X] T017 [US2] Update `src/store/store.js` — implement `endTournament()`: validate active tournament has `players.length >= 1` AND `games.length >= 1` before archiving; if archiveable, call `createSnapshot`, append to `state.archive`, persist `backgammon:archive` to localStorage; in all cases, clear `state.tournament`, `state.players`, `state.games`, `state.schedule`; clear the three active localStorage keys; emit `state:archive:changed` (if archived), then `state:reset`; confirm T014 endTournament tests now pass
- [X] T018 [US2] Update `src/store/store.js` — update `initTournament(name)`: before creating the new tournament, check if `state.tournament !== null && state.players.length >= 1 && state.games.length >= 1`; if so, create snapshot, append to `state.archive`, persist `backgammon:archive`, emit `state:archive:changed`; then proceed with existing tournament reset logic; confirm T014 auto-archive tests now pass
- [X] T019 [US2] Update `src/views/playerRegistration.js` — add "End Tournament" button alongside the existing "Reset Tournament" button; on click, show `window.confirm('End this tournament and save it to the archive?')`; on confirm, call `endTournament()` then **immediately navigate**: `window.location.hash = '#/start'` (router guard alone does not fire on event bus events — explicit navigation is required); confirm T015 tests now pass *(F1 fix)*

**Checkpoint**: End Tournament archives the tournament, stores it to localStorage, and redirects to name prompt. Auto-archive works on new tournament start.

---

## Phase 5: User Story 3 — Browse Tournament Archive (Priority: P2)

**Goal**: Club tab shows a reverse-chronological list of archived tournaments. Tapping one shows read-only standings and game history.

**Independent Test**: Archive 2 tournaments → open Club tab → confirm both listed, most recent first, with name/date/game count → tap one → confirm read-only standings + game history shown → tap Back → confirm list returns.

### Tests for User Story 3 ⚠️ WRITE FIRST (TDD)

- [X] T020 [US3] Write failing Playwright e2e tests for US3 in `tests/e2e/us3-browse-archive.test.js`: (AC1) Club tab with no archives shows empty state message; (AC2) two archived tournaments listed in reverse chronological order with name, date, game count; (AC3) tapping a tournament shows its final standings and full game list; (AC4) detail view has no Add Player, Record Game, or Delete controls; (AC5) Back button returns to archive list; run `npx playwright test us3` and confirm tests fail

### Implementation for User Story 3

- [X] T021 [US3] Create `src/views/club.js` exporting `render(container)`, `onMount(container)`, `onUnmount()` — `/club` is already registered in router (T009); implement two rendering modes controlled by module-level `let _selectedSnapshotId = null`: (list mode) heading "Club", All-Time leaderboard section placeholder (`<section class="all-time-section"><p>All-Time leaderboard coming soon.</p></section>`), archive list section with tournaments sorted by `archivedAt` descending showing name/date/gameCount per item, empty state message when `archive.length === 0`; (detail mode) when `_selectedSnapshotId` is set, render the matching snapshot's `finalStandings` table (rank/name/matchPoints/wins/losses) and `games` list (both read-only, no edit/delete controls), plus a Back button that sets `_selectedSnapshotId = null` and re-renders in list mode; delegate click handling in `onMount` for archive items and Back button; subscribe to `state:archive:changed` and `state:reset` to re-render; unsubscribe in `onUnmount`; confirm T020 tests now pass

**Checkpoint**: Club tab shows archive list. Clicking a tournament shows its read-only history. Back returns to list.

---

## Phase 6: User Story 4 — View All-Time Leaderboard (Priority: P2)

**Goal**: All-Time leaderboard at top of Club tab shows cross-tournament wins and cumulative match points per player. Reflects active tournament in real time.

**Independent Test**: Archive 2 tournaments (different winners) → open Club tab → verify each player has 1 win, correct cumulative points → record a game in active tournament → re-open Club tab → verify active game points added without archiving.

### Tests for User Story 4 ⚠️ WRITE FIRST (TDD)

- [X] T022 [P] [US4] Write failing Vitest unit tests for `deriveAllTimeStandings` in `tests/models/allTimeStanding.test.js` covering: single archived tournament → correct wins/points/tournamentsPlayed; two tournaments, different winners → both ranked correctly; tie in wins → tiebreaker by cumulativePoints; active tournament results included without archiving (cumulative points updated); case-insensitive name merge ("Alice" + "alice" → one entry, display name from most recent); player in only some tournaments → correct tournamentsPlayed count; empty archive + no active games → standings with 0 wins; run `npm test` and confirm tests fail
- [X] T023 [P] [US4] Write failing Playwright e2e tests for US4 in `tests/e2e/us4-all-time-leaderboard.test.js`: (AC1) All-Time leaderboard visible in Club tab at all times; (AC2) before first archive, shows current players with 0 wins and explanatory note; (AC3) after archiving 2 tournaments with different winners, each player shows 1 win; (AC4) player with 2 wins from 2 tournaments shows 2; (AC5) tie in wins → higher cumulative points ranks first; (AC6) recording game in active tournament immediately updates All-Time cumulative points; run `npx playwright test us4` and confirm tests fail

### Implementation for User Story 4

- [X] T024 [US4] Create `src/models/allTimeStanding.js` exporting `deriveAllTimeStandings(archive, activeTournament, activePlayers, activeGames)` — pure function implementing: (1) reduce over `archive` to accumulate per-player (key: `name.trim().toLowerCase()`) totals for `tournamentWins` (player is `snapshot.winnerName` normalised) and `cumulativePoints` (sum of matchPoints from snapshot.finalStandings for that player) and `tournamentsPlayed`; (2) add active tournament's in-progress standings (cumulativePoints only, NOT wins — wins only credited when archived); (3) collect display names from most recent tournament occurrence; (4) sort by `tournamentWins` DESC then `cumulativePoints` DESC; (5) return `AllTimeStanding[]` with `{ name, tournamentWins, cumulativePoints, tournamentsPlayed, rank }`; confirm T022 tests now pass
- [X] T025 [US4] Update `src/views/club.js` — replace the All-Time leaderboard placeholder with the real implementation: in list mode, call `deriveAllTimeStandings(archive, activeTournament, activePlayers, activeGames)` from store state; render an `.all-time-table` showing rank/name/tournamentWins/cumulativePoints columns; when `archive.length === 0`, show the explanatory note "Complete your first tournament to start tracking wins" per FR-015; subscribe `onMount` to `state:archive:changed`, `state:standings:changed`, and `state:reset` to re-render the All-Time section when scores change; ensure subscription cleanup in `onUnmount`; confirm T023 tests now pass

**Checkpoint**: All-Time leaderboard shows cross-tournament stats, updates live with active tournament results, always visible with 0-win note before first archive.

---

## Phase 7: User Story 5 — Player Roster Suggestions (Priority: P3)

**Goal**: Typing in the player name field shows suggestions from past tournament participants. Selecting a suggestion adds the player. New names are accepted and saved to the roster.

**Independent Test**: Archive a tournament with "Alice" → start new tournament → type "Al" in name field → confirm "Alice" suggestion appears → select it → confirm Alice added without typing full name.

### Tests for User Story 5 ⚠️ WRITE FIRST (TDD)

- [X] T026 [P] [US5] Write failing Vitest unit tests for roster update in `addPlayer()` in `tests/store/store.test.js`: `addPlayer('Alice')` when roster is empty → roster becomes `['Alice']`; `addPlayer('alice')` when roster has `['Alice']` → roster unchanged (case-insensitive dedup); `addPlayer('Bob')` when roster has `['Alice']` → roster becomes `['Alice', 'Bob']`; `loadFromStorage()` restores roster from `backgammon:roster`; run `npm test` and confirm these tests fail
- [X] T027 [P] [US5] Write failing Playwright e2e tests for US5 in `tests/e2e/us5-roster-suggestions.test.js`: (AC1) after archiving tournament with "Alice" (requires US2), starting new tournament and typing "Al" shows "Alice" as datalist suggestion; (AC2) selecting "Alice" from suggestions adds player without full typing; (AC3) typing a new name not in roster and submitting succeeds and adds name to roster for future use; (AC4) no previous tournaments → no suggestions shown; run `npx playwright test us5` and confirm tests fail *(Note: AC1 depends on endTournament from US2 — see F2 fix: US5 e2e depends on US2, not Phase 2 only)*

### Implementation for User Story 5

- [X] T028 [US5] Update `src/store/store.js` — in `addPlayer(name)`, after successfully creating the player: normalise name with `name.trim().toLowerCase()` and check if it exists in `state.roster` (case-insensitive); if not, append the original-case name to `state.roster` and persist `backgammon:roster` to localStorage; confirm T026 tests now pass
- [X] T029 [US5] Update `src/views/playerRegistration.js` — add `<datalist id="roster-datalist">` to the player name form, populated with `<option value="...">` elements for each entry in `getState().roster`; add `list="roster-datalist"` attribute to the player name `<input>`; re-render datalist when `state:players:changed` fires (to reflect any in-session adds); confirm T027 tests now pass

**Checkpoint**: Player name field shows roster suggestions. Selecting a suggestion adds the player. New names persist to roster.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation, artifact capture setup, and responsive QA.

- [X] T030 [P] Create `artifacts/screenshots/` and `artifacts/console/` directories; confirm they exist for Playwright MCP failure artifact capture per the constitution; add `artifacts/` to `.gitignore` if not already present
- [X] T031 [P] Run all Vitest unit tests with `npm test`; confirm all tests pass (T004–T005 store foundations, T008 router guard, T013 snapshot, T014 store actions, T022 allTimeStanding, T026 roster); fix any regressions
- [X] T032 Run the automated Playwright e2e suite via `npx playwright test` (which executes the test files from T010, T015, T020, T023, T027); on any failure, capture a full-page screenshot via `browser_take_screenshot` to `./artifacts/screenshots/<timestamp>-failure.png` and console output via `browser_console_messages` to `./artifacts/console/<timestamp>.log` before debugging; confirm all 5 user story acceptance criteria pass *(F3 fix: run automated suite, use MCP tools only for failure artifact capture)*
- [X] T033 [P] Verify responsive layout at 375px (mobile) and 768px (tablet) viewports: Club tab list, All-Time leaderboard, tournament detail, and name prompt all usable without horizontal scrolling; fix any overflow in `styles.css`
- [X] T034 Execute the manual validation checklist from `specs/002-tournament-history/quickstart.md`; confirm all checklist items pass
- [X] T035 [P] Performance validation for SC-006: seed 52 `TournamentSnapshot` fixtures into `backgammon:archive` in localStorage (up to 20 players, 200 games each); open Club tab via Playwright MCP; use `browser_evaluate` with `performance.now()` to measure archive list render time and `deriveAllTimeStandings()` compute time; confirm archive renders in <100ms and All-Time standings compute in <50ms; remove fixture data after test

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately; T001–T003 can run in parallel
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user story phases
  - T004 [P] and T005 [P] can run in parallel (write tests first)
  - T006, T007 depend on T004/T005 failing (confirm tests fail, then implement)
  - T008 [P] write router guard test (can run alongside T004/T005)
  - T009 depends on T008 failing
- **Phase 3 (US1)**: Depends on Phase 2 — T010 (e2e test write) first; T011 after T010 failing; T012 after T011
- **Phase 4 (US2)**: Depends on Phase 2 — T013, T014, T015 can all start in parallel; T016 after T013; T017 after T014 + T016; T018 after T014 + T016; T019 after T017 + T018
- **Phase 5 (US3)**: Depends on Phase 4 (needs endTournament to create archive data) — T020 first, then T021
- **Phase 6 (US4)**: Depends on Phase 5 (extends club.js) — T022 [P] and T023 [P] in parallel; T024 after T022; T025 after T023 + T024
- **Phase 7 (US5)**: Unit tests (T026, T028) depend on Phase 2 only; e2e test (T027) depends on US2 for archive precondition — T026 [P] and T027 [P] in parallel; T028 after T026; T029 after T028
- **Phase 8 (Polish)**: Depends on all story phases complete

### User Story Dependencies

- **US1 (P1)**: Foundational complete
- **US2 (P1)**: Foundational complete (US1 can run in parallel)
- **US3 (P2)**: US2 complete (needs archive data from endTournament)
- **US4 (P2)**: US3 complete (extends club.js)
- **US5 unit test (T026)**: Phase 2 only — T028 after T026 failing; T029 after T028
- **US5 e2e test (T027)**: US2 complete — requires `endTournament()` to set up the archive precondition *(F2 fix)*

---

## Parallel Execution Examples

### Phase 2 — Parallel within Foundational

```
T004 [P] — Write store tests (archive+roster loadFromStorage)
T005 [P] — Write store tests (name validation)
T008 [P] — Write router guard unit tests  ← NEW (C1 fix)
  ↓ (all fail confirmed)
T006 — Implement store state shape + loadFromStorage + getState + resetForTesting
T007 — Implement initTournament name validation
T009 — Implement router guard + new routes  (depends on T008 failing)
```

### Phase 4 — Parallel within US2

```
T013 [P] — Write snapshot unit tests
T014 [P] — Write store endTournament unit tests
T015 [P] — Write US2 Playwright e2e tests
  ↓ (all three fail confirmed)
T016 — Create tournamentSnapshot.js  (depends on T013)
T017 + T018 (can run in parallel) — endTournament + initTournament auto-archive  (depend on T014 + T016)
T019 — End Tournament button + explicit navigation to #/start  (depends on T017 + T018)  ← F1 fix
```

### US4 + US5 — Cross-phase Parallel

```
US4 Phase:                     US5 Phase (unit tests independent):
T022 [P] Write allTime tests   T026 [P] Write roster unit tests
T023 [P] Write US4 e2e tests   T027 [P] Write US5 e2e tests (needs US2 for setup)
T024 Create allTimeStanding    T028 Update store addPlayer roster
T025 Update club.js            T029 Update playerRegistration datalist
```

---

## Implementation Strategy

### MVP First (US1 + US2 only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (name prompt)
4. Complete Phase 4: US2 (end + archive)
5. **STOP and VALIDATE**: Named tournaments work end-to-end; archive survives refresh
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → router guard + store in place
2. US1 → App requires tournament name → Test independently → Deploy
3. US2 → Archive completes; End Tournament works → Test independently → Deploy
4. US3 → Club tab with archive list → Test independently → Deploy
5. US4 → All-Time leaderboard → Test independently → Deploy
6. US5 → Roster suggestions → Test independently → Deploy

---

## Notes

- [P] tasks = different files or no dependency on incomplete tasks; can run simultaneously
- [USN] label maps task to user story for traceability
- Tests MUST be written, run, and observed to FAIL before the corresponding implementation task starts
- Per constitution: any Playwright test failure during MCP execution requires artifact capture (screenshot + console log) BEFORE debugging
- `tests/e2e/` directory is the Playwright testDir per `playwright.config.js`
- `npx serve . --listen 4173` serves the app for Playwright tests
- Run `npm test` for Vitest unit tests; `npx playwright test` for e2e suite
- `tests/router.test.js` is introduced in T008 (Phase 2); not listed in plan.md project structure but required by the constitution's TDD gate *(U2 note)*

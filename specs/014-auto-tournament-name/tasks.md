# Tasks: Auto-Name Tournament by Date and Time

**Input**: Design documents from `/specs/014-auto-tournament-name/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Tests are MANDATORY per the project constitution (TDD non-negotiable). Test tasks appear before and block their corresponding implementation tasks. Tests MUST be observed to fail before implementation begins.

**E2E Tests**: Playwright MCP MUST be used to run all e2e tests against `npx serve .`. On any failure, capture artifacts before debugging: screenshot via `browser_take_screenshot` (fullPage) → `./artifacts/screenshots/<timestamp>-failure.png` and console log via `browser_console_messages` → `./artifacts/console/<timestamp>.log`.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story this task belongs to (US1–US4)

---

## Phase 1: Setup

**Purpose**: No new project infrastructure is required — all structure already exists. This phase confirms test file locations.

- [X] T001 Verify `tests/utils.test.js` exists (create empty if absent) for `generateTournamentName` unit tests
- [X] T002 Verify `tests/e2e/` directory exists and check existing Playwright config in `playwright.config.js` for artifact capture (screenshots/console on failure)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `generateTournamentName()` is the core utility used by every user story. It MUST be complete and tested before any story implementation begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests ⚠️ WRITE FIRST (TDD)

- [X] T003 Write failing unit tests for `generateTournamentName(date)` in `tests/utils.test.js` covering: zero-padded hours (09:05), 24-hour time (14:30), midnight (00:00), single-digit day (Mar 7 not Mar 07), English weekday/month names, full format assembly

### Implementation

- [X] T004 Implement `generateTournamentName(date = new Date())` in `src/utils.js` — pure function using `getHours().padStart`, `getMinutes().padStart`, `toLocaleDateString('en-US', {weekday:'long'})`, `toLocaleDateString('en-US', {month:'short'})`, `getDate()`, `getFullYear()` — export alongside existing utilities; run tests until green

**Checkpoint**: `generateTournamentName()` passes all unit tests — user story implementation can now begin.

---

## Phase 3: User Story 1 — Tournament Named Automatically When Started (Priority: P1) 🎯 MVP

**Goal**: When the user starts a new tournament, a date/time name is generated automatically and the app proceeds directly to the live view — no name prompt shown.

**Independent Test**: Serve the app; navigate when no tournament exists; click "Start Tournament" on the `/start` view; verify you land on the live view with a correctly formatted date/time name displayed, no text input ever shown.

### Tests ⚠️ WRITE FIRST (TDD)

- [X] T005 Write failing unit test for `initTournament()` (no arguments) in `tests/store/store.test.js`: assert returned tournament `name` matches `/^\d{2}:\d{2}\. \w+, \w+ \d+, \d{4}$/`
- [X] T006 Update existing `initTournament` unit tests in `tests/store/store.test.js` that currently pass a string name argument — change all calls to `initTournament()` and update name assertions to match the auto-format regex; run to confirm existing tests now fail (expected — implementation not changed yet)

### Implementation

- [X] T007 Update `initTournament()` in `src/store/store.js`: remove `name` parameter, remove "name required" / "name too long" validation, call `generateTournamentName()` to obtain the name; import `generateTournamentName` from `../utils.js`; run unit tests until T005 and T006 pass
- [X] T008 Replace the text input form in `src/views/namePrompt.js` with a "Start Tournament" button: remove `<input>`, `<label>`, form submission handler, and `[data-error]` element; add a button that calls `initTournament()` and sets `window.location.hash = '#/live'`; preserve `render()`, `onMount()`, `onUnmount()` exports

**Checkpoint**: User Story 1 is fully functional — start tournament → auto-named → live view shown; all unit tests pass.

---

## Phase 4: User Story 2 — User Can Still End a Tournament Manually (Priority: P1)

**Goal**: End Tournament continues to work exactly as before; the only difference is the archived name is auto-generated.

**Independent Test**: Start a tournament (auto-named), add a player, start a match, end the tournament via the hamburger menu → app returns to the start view; archived entry visible in Club history.

### Tests ⚠️ WRITE FIRST (TDD)

- [X] T009 Write e2e test for US2 acceptance scenarios in `tests/e2e/014-auto-tournament-name.spec.js`: (a) start tournament → end via hamburger → confirm app navigates to `/start`; (b) start → end → navigate to `/#/club` → confirm archived entry shows a name matching `HH:mm. dddd, MMM d, yyyy` format; run via Playwright MCP and confirm tests fail before US2 implementation

### Implementation

- [X] T010 No store implementation changes required — `endTournament()` in `src/store/store.js` is unchanged; verify by running the e2e test via Playwright MCP; capture screenshot/console artifacts on any failure to `./artifacts/`

**Checkpoint**: User Story 2 e2e tests pass — End Tournament works correctly with auto-generated name preserved in archive.

---

## Phase 5: User Story 3 — Reset Tournament Retains Current Name (Priority: P1)

**Goal**: When the user resets a tournament, the tournament name is preserved — no prompt, no new name generated — and the app returns to the live view.

**Independent Test**: Start a tournament (note the auto-generated name), trigger Reset Tournament via hamburger → app shows the live view with the same tournament name, players and matches cleared.

### Tests ⚠️ WRITE FIRST (TDD)

- [X] T011 Write failing unit test for `resetTournament()` in `tests/store/store.test.js`: after reset, `getState().tournament.name` equals the name from before the reset, and `getState().players` is empty, `getState().matches` is empty
- [X] T012 Update existing `resetTournament` unit tests in `tests/store/store.test.js` that assert `getState().tournament === null` after reset — change assertions to expect tournament to remain non-null with preserved name; run to confirm these tests now fail (expected)

### E2E Tests ⚠️ WRITE FIRST (TDD)

- [X] T015 Write e2e test for US3 acceptance scenarios in `tests/e2e/014-auto-tournament-name.spec.js`: start tournament → note name → trigger Reset via hamburger → confirm app is on live view → confirm tournament name shown is unchanged → confirm player/match list is empty; run via Playwright MCP and **confirm tests fail before T013/T014**; capture artifacts on failure

### Implementation

- [X] T013 Update `resetTournament()` in `src/store/store.js`: remove `tournament: null` from the new state spread — keep `state.tournament` intact; add `persist(KEYS.tournament, state.tournament)` after state update; keep existing `localStorage.removeItem` calls for players and matches; run unit tests until T011 and T012 pass
- [X] T014 Update the `reset-tournament` action handler in `src/router.js`: change `window.location.hash = '#/start'` to `window.location.hash = '#/live'`; re-run T015 e2e tests and confirm pass

**Checkpoint**: User Story 3 e2e and unit tests all pass — Reset preserves name and stays on live view.

---

## Phase 6: User Story 4 — Archived Tournament Shows Auto-Generated Name in History (Priority: P2)

**Goal**: After a tournament is ended, its auto-generated date/time name appears correctly in the Club archive list.

**Independent Test**: Create a tournament, add players and matches, end it, navigate to `/#/club` → archived entry shows the correctly formatted date/time name.

### Tests ⚠️ WRITE FIRST (TDD)

- [X] T016 Write e2e test for US4 acceptance scenario in `tests/e2e/014-auto-tournament-name.spec.js`: full flow — start tournament → add 2 players → start match → record game → end tournament → navigate to `/#/club` → confirm archived entry name matches `HH:mm. dddd, MMM d, yyyy` format; run via Playwright MCP and confirm test status; capture artifacts on failure

### Implementation

- [X] T017 No additional implementation required — US4 is delivered as a natural consequence of US1 (auto-name) + US2 (end archives with current name); verify by running e2e test T016 via Playwright MCP

**Checkpoint**: All 4 user stories fully functional and e2e-verified.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T018 [P] Run full Vitest unit test suite (`npm test`) — confirm all tests pass including updated `initTournament` and `resetTournament` tests; fix any remaining failures
- [X] T019 [P] Run full Playwright e2e suite via Playwright MCP — confirm no regressions in existing features (012, 013, etc.); capture artifacts on any failure to `./artifacts/screenshots/` and `./artifacts/console/`
- [X] T020 Review `src/models/tournament.js` — `createTournament(name)` validation is now only reachable with a valid auto-generated name; leave guard in place as safety net (no change needed)
- [X] T021 Confirm `src/views/namePrompt.js` has no dead code left after T008 (no unused imports, no leftover error-message logic); clean up if needed
- [X] T022 Write e2e test for FR-008 backward compatibility: seed `localStorage` with a legacy archive entry using a manually typed name (e.g. `"Club Night"`) before page load, navigate to `/#/club`, confirm the entry renders with its original name unchanged alongside any new auto-named entries

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — core feature, MVP
- **US2 (Phase 4)**: Depends on Phase 2 — no store changes; e2e only
- **US3 (Phase 5)**: Depends on Phase 2 and Phase 3 (needs auto-named tournament to test reset)
- **US4 (Phase 6)**: Depends on Phase 3 and Phase 4 (needs working start + end)
- **Polish (Phase 7)**: Depends on all story phases complete

### User Story Dependencies

- **US1 (P1)**: Start after Phase 2 — no story dependencies
- **US2 (P1)**: Start after Phase 2 — End Tournament logic is unchanged and independent of US1; however, the US2 e2e test (T009) navigates through tournament creation, so T009 must be *run and verified* after Phase 3 (US1) completes namePrompt.js changes
- **US3 (P1)**: Start after Phase 3 (US1) — Reset test relies on auto-named tournament existing
- **US4 (P2)**: Start after Phase 3+4 — naturally delivered by US1+US2

### Within Each User Story

- Test tasks MUST be written and observed to FAIL before corresponding implementation tasks
- Unit tests before store changes; e2e tests confirm end-to-end flow
- Run `npm test` after each unit test/implementation pair
- Run Playwright MCP after each e2e test addition

### Parallel Opportunities

- T001 and T002 (Phase 1) can run in parallel
- T005 and T006 (Phase 3 tests) are sequential — both modify `tests/store/store.test.js`
- T011 and T012 (Phase 5 tests) are sequential — both modify `tests/store/store.test.js`
- T018 and T019 (Phase 7) can run in parallel

---

## Parallel Example: Phase 3 (US1)

```
# Parallel test-writing step:
T005: Write failing test for initTournament() no-arg behavior
T006: Update existing initTournament tests to remove name arg

# Then sequential implementation:
T007: Update initTournament() in store.js    → unblocks T008
T008: Repurpose namePrompt.js               → start after T007
```

---

## Implementation Strategy

### MVP (User Story 1 Only — Phases 1–3)

1. Complete Phase 1: Setup verification
2. Complete Phase 2: `generateTournamentName()` — foundation
3. Complete Phase 3: `initTournament()` change + `namePrompt.js` repurpose
4. **STOP and VALIDATE**: Start a tournament in browser — auto-name displayed, no prompt
5. All unit tests passing

### Incremental Delivery

1. Phases 1–3 → **MVP**: tournament auto-named on start
2. Phase 4 → End Tournament regression-verified
3. Phase 5 → Reset retains name
4. Phase 6 → Archive history confirmed
5. Phase 7 → Full regression pass, no regressions

---

## Notes

- [P] tasks = different files or independent concerns, no blocking dependencies between them
- All e2e tests use Playwright MCP browser tools against `npx serve .`
- Failure artifacts MUST be saved before any debugging: `browser_take_screenshot` + `browser_console_messages`
- `initTournament()` signature change is the highest-risk task — existing store tests will break until T007 is complete (expected)
- `resetTournament()` change is additive — tournament entity preserved, behaviour otherwise identical

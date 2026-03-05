# Tasks: Match-Mode Tournament Nights

**Input**: Design documents from `/specs/003-match-mode/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/store-api.md ✅, quickstart.md ✅

**Tests**: MANDATORY per constitution (TDD non-negotiable). Test tasks appear before and block their implementation tasks. Tests MUST be observed to fail before implementation begins.

**E2E Tests**: Playwright e2e tests cover all US1–US4 acceptance scenarios. Run via Playwright MCP (`browser_navigate`, `browser_click`, `browser_snapshot`, etc.) against locally served app (`npx serve .`). On any failure: save full-page screenshot to `./artifacts/screenshots/<timestamp>-failure.png` and console log to `./artifacts/console/<timestamp>.log` before debugging.

**Organisation**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no cross-task dependencies)
- **[Story]**: User story this task belongs to (US1–US4)

---

## Phase 1: Setup

**Purpose**: Artifact directories and Playwright failure-capture configuration

- [X] T001 Create `artifacts/screenshots/` and `artifacts/console/` directories at repo root
- [X] T002 Update `playwright.config.js` to capture failure screenshots to `./artifacts/screenshots/<timestamp>-failure.png` and console logs to `./artifacts/console/<timestamp>.log` on any test failure

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Match model, standings derivation, store extensions, and snapshot update — shared by all user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Write failing Vitest tests for `createMatch`, `isMatchComplete`, and `matchWinner` in `tests/models/match.test.js` — cover: valid creation, player uniqueness check, target ≥ 1, isMatchComplete returns false when below target and true when at/above, matchWinner returns correct playerId
- [X] T004 [P] Write failing Vitest tests for `deriveMatchStandings(players, matches)` in `tests/models/matchStanding.test.js` — cover: ranks by match wins DESC, tiebreaker by total points DESC, abandoned matches excluded, zero-win players included at bottom
- [X] T005 [P] Write failing Vitest tests for new store match actions in `tests/store/store.test.js` — cover: `startMatch` (valid, duplicate player error, FR-012 busy-player error, target < 1 error), `recordMatchGame` (game added, auto-complete when target reached, error on completed match), `abandonMatch` (status set, no win credited, player freed), `selectMatch`, `endTournament` archives from matches not games, `getState` returns match-derived standings; also cover updated `removePlayer`: throws `'Cannot remove a player with an active match'` when player has status `active` match, succeeds when player has no active matches (FR-009 unit test — required by TDD gate)
- [X] T006 Implement `src/models/match.js` — export `createMatch(player1Id, player2Id, targetScore)`, `isMatchComplete(match)`, `matchWinner(match)` (depends on T003 failing)
- [X] T007 Implement `src/models/matchStanding.js` — export `deriveMatchStandings(players, matches)` returning `Standing[]` sorted by matchWins DESC then totalPoints DESC; only `complete` matches counted (depends on T004 failing)
- [X] T008 Extend `src/store/store.js`: add `KEYS.matches`, add `matches: []` and `selectedMatchId: null` to state; add `startMatch(p1Id, p2Id, target)`, `recordMatchGame(matchId, gameData)` (with auto-complete via `isMatchComplete`/`matchWinner`), `abandonMatch(matchId)`, `selectMatch(matchId|null)`; update `getState` to return `standings: deriveMatchStandings(...)` and `matches: [...]`; update `persistAll` and `loadFromStorage` for `matches` key; update `_archiveCurrentTournament` and `endTournament` to archive from matches; remove `games` from active state (depends on T005 failing, T006, T007)
- [X] T009 [P] Write failing Vitest tests for updated `createSnapshot` in `tests/models/tournamentSnapshot.test.js` — cover: accepts `(tournament, players, matches)` signature, derives `finalStandings` using `deriveMatchStandings`, sets `winnerName` from rank-1 standing, sets `gameCount` to total games across all matches, embeds `matches` field in snapshot output
- [X] T010 Update `src/models/tournamentSnapshot.js`: change signature to `createSnapshot(tournament, players, matches)`, import and use `deriveMatchStandings` for `finalStandings`, compute `gameCount` from `matches.flatMap(m => m.games).length`, add `matches` field to output (depends on T009 failing, T007)

**Checkpoint**: Match model, standings, store actions, and snapshot all unit-tested and implemented. User story work can begin.

---

## Phase 3: User Story 1 — Create and Play a Match (Priority: P1) 🎯 MVP

**Goal**: A user can start a match between two players with a target score, record games within it, and have the match auto-complete when the target is reached.

**Independent Test**: Start a match (Alice vs Bob, target 5). Record games until Alice's score reaches 5. Verify match status = complete, Alice = winner, game log is visible and locked.

- [X] T011 [P] [US1] Write failing Playwright e2e tests for US1 acceptance scenarios in `tests/e2e/us1-create-match.test.js` — cover: match created with correct initial score (AC1), auto-complete on reaching target (AC2), gammon×cube points applied (AC3), completed match is read-only (AC4)
- [X] T012 [US1] Implement `src/views/matchDetail.js` — renders match header (player names, target, running scores), game recording form (player selects, result type, cube value, submit), game log table, auto-complete banner when match is done, form hidden when complete; listens on `state:matches:changed` (depends on T008)
- [X] T013 [US1] Add `/match` route to `src/router.js` pointing to `matchDetail.js`; add `/match` to `UNGUARDED_ROUTES` consideration (guarded — requires active tournament); if `selectedMatchId` is null when `/match` is entered, redirect to `/players` (depends on T012)
- [X] T014 [US1] Run US1 e2e tests via Playwright MCP against `npx serve .`; capture failure artifacts if any; fix failures (depends on T011, T012, T013)

**Checkpoint**: US1 complete. A single match can be started, played, and auto-completed.

---

## Phase 4: User Story 2 — Manage Multiple Simultaneous Matches (Priority: P2)

**Goal**: An organiser sees all active/completed matches on a hub screen, can start multiple simultaneous matches, add players mid-night, and abandon matches.

**Independent Test**: Start two simultaneous matches. Verify independent scores. Add a player mid-night. Attempt to add a busy player to a third match — expect error. Abandon one match — verify no win credited.

- [X] T015 [P] [US2] Write failing Playwright e2e tests for US2 acceptance scenarios in `tests/e2e/us2-match-hub.test.js` — cover: hub shows active and completed matches with live scores (AC1), independent scores (AC2), ad-hoc player add (AC3), start-match blocked with < 2 players (AC4), FR-012 busy-player blocked, FR-009 removal blocked during active match, abandonment removes match without win
- [X] T016 [US2] Implement `src/views/matchHub.js` — player list section with add-player form (datalist from roster), active matches list (each card shows players, score X–Y of target, "Enter" button), completed matches list (winner badge), "Start Match" form (player 1 select, player 2 select, target score input, submit); disables Start Match when < 2 players; shows inline error for FR-012 violation; listens on `state:players:changed`, `state:matches:changed` (depends on T008)
- [X] T017 [US2] Update `src/router.js`: point `/players` route to `matchHub.js`; redirect `/record` hash to `/players` (depends on T016)
- [X] T018 [US2] Update `removePlayer` in `src/store/store.js` to throw `'Cannot remove a player with an active match'` if player is in any match with `status === 'active'`; remove old game-based guard (depends on T008)
- [X] T019 [US2] Run US2 e2e tests via Playwright MCP; capture failure artifacts if any; fix failures (depends on T015, T016, T017, T018)

**Checkpoint**: US2 complete. Multi-match hub functional with all enforcement rules.

---

## Phase 5: User Story 3 — Night Leaderboard (Priority: P3)

**Goal**: The Leaderboard tab shows players ranked by match wins (primary) and total match points (tiebreaker), updated live as matches complete.

**Independent Test**: Complete two matches; Alice wins both. View leaderboard — Alice rank 1 with 2 wins. Add tiebreaker scenario: Alice and Bob both 1 win but different points — verify correct order.

- [X] T020 [P] [US3] Write failing Playwright e2e tests for US3 acceptance scenarios in `tests/e2e/us3-night-leaderboard.test.js` — cover: match wins ranked correctly (AC1), points tiebreaker (AC2), zero-win player at bottom (AC3), leaderboard updates without page refresh after match completes; also cover `#/history` view in match mode: games grouped by match with match header (player names, target, status), individual game rows within each group
- [X] T021 [US3] Update `src/views/leaderboard.js` to call `deriveMatchStandings` (via `getState().standings`): update column headers to show "Match Wins" and "Points"; remove game-level win/loss columns; retain round-robin schedule panel if present (depends on T007)
- [X] T022 [US3] Update `src/views/gameHistory.js` to read from `getState().matches`: group games by match with a match header (player names, target, status); render individual game rows within each match group (depends on T008)
- [X] T023 [US3] Run US3 e2e tests via Playwright MCP; capture failure artifacts if any; fix failures (depends on T020, T021, T022)

**Checkpoint**: US3 complete. Live match-based leaderboard working.

---

## Phase 6: User Story 4 — All-Time Leaderboard Backward Compatibility (Priority: P4)

**Goal**: The Club tab all-time table renders correctly whether archives were created before or after match-mode was introduced.

**Independent Test**: Seed one legacy archive (has `games` field, no `matches`) and one match-based archive. Open Club tab — all-time table renders both without errors, legacy winner credited correctly.

- [X] T024 [P] [US4] Write failing Vitest tests for `deriveAllTimeStandings` with mixed archive types in `tests/models/allTimeStanding.test.js` — cover: legacy snapshot (no matches field) renders correctly, match-based snapshot (has matches) renders correctly, mixed archive renders both without error
- [X] T025 [P] [US4] Write failing Playwright e2e tests for US4 acceptance scenarios in `tests/e2e/us4-backward-compat.test.js` — cover: mixed archive renders all-time table (AC1), legacy winner credited (AC2)
- [X] T026 [US4] Update `src/models/allTimeStanding.js` if needed: verify `deriveAllTimeStandings` handles match-based snapshots (uses `finalStandings` which is already correctly populated by updated `createSnapshot`); add guard for snapshots with neither `games` nor `matches` fields (depends on T024 failing, T010)
- [X] T027 [US4] Update `src/views/club.js` tournament detail panel: when `snapshot.matches` exists render a match list (player names, result, score); when absent (legacy) render the existing game list (depends on T008, T010)
- [X] T028 [US4] Run US4 tests (Vitest + Playwright MCP); capture failure artifacts if any; fix failures (depends on T024, T025, T026, T027)

**Checkpoint**: US4 complete. All four user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T029 Update `index.html` nav: remove `/record` link; verify `/players` link label reads "Tonight" or "Matches" to reflect hub purpose; verify all nav links are correct
- [X] T030 [P] Update existing e2e suites in `tests/e2e/` (smoke.spec.js and any 002-feature tests) that reference `/record`, player registration selectors, or game recording flows — update to reflect new matchHub and matchDetail views
- [X] T031 [P] Verify responsive layout: matchHub and matchDetail have no horizontal scroll at 375px and 768px; all interactive elements (Start Match button, Enter button, game record form submit) meet ≥ 44×44px touch target; fix any `styles.css` overflow or sizing issues
- [X] T032 Run full Vitest suite (`npm test`); confirm all tests pass; fix any regressions
- [X] T033 Run full Playwright suite via MCP; confirm all tests pass; save failure artifacts to `./artifacts/screenshots/` and `./artifacts/console/` for any failures; fix failures
- [X] T034 [P] Remove retired view files `src/views/playerRegistration.js` and `src/views/recordGame.js`; confirm no remaining imports reference them

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundation (Phase 2)**: Depends on Setup — **blocks all user stories**
- **US1 (Phase 3)**: Depends on Foundation
- **US2 (Phase 4)**: Depends on Foundation; integrates with US1 (matchDetail must exist before matchHub links to it)
- **US3 (Phase 5)**: Depends on Foundation; independent of US1/US2 for model layer, but leaderboard view benefits from matchHub existing
- **US4 (Phase 6)**: Depends on Foundation (specifically T010 snapshot update)
- **Polish (Phase 7)**: Depends on all user stories complete

### Within Each Phase

- Tests marked [P] within a phase can be written in parallel
- Implementation tasks follow: model → store → view → e2e run
- Each e2e run task (T014, T019, T023, T028) blocks the next phase's work until passing

### Parallel Opportunities

```
Phase 2 parallel writes: T003, T004, T005, T009 (all test files, different paths)
Phase 3 parallel:        T011 (e2e test) alongside T012 (view implementation)
Phase 4 parallel:        T015 (e2e test) alongside T016 (view implementation)
Phase 5 parallel:        T020 (e2e test) alongside T021+T022 (view updates)
Phase 6 parallel:        T024+T025 (tests) alongside setup work
Polish parallel:         T030, T031, T034 (different files, independent)
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Phase 1: Setup (T001–T002)
2. Phase 2: Foundation (T003–T010)
3. Phase 3: US1 (T011–T014)
4. **STOP**: Verify a single match can be created, played, and completed
5. Demo: match detail view with auto-complete

### Incremental Delivery

1. Foundation → US1 → demo single-match flow
2. Add US2 → multi-match hub, simultaneous matches, player enforcement
3. Add US3 → live night leaderboard
4. Add US4 → backward-compat club tab
5. Polish → clean up, responsive, full suite green

---

## Notes

- `[P]` = different files, no blocking dependencies between those tasks
- Tests MUST be observed to fail (red) before implementation (green)
- Playwright e2e tasks run via MCP browser tools — not just `npx playwright test` in shell
- `state.schedule` (round-robin) is untouched — interaction with match mode is out of scope
- Legacy `backgammon:games` localStorage key: do NOT write it for new tournaments; do NOT delete it from old data; `loadFromStorage` should simply ignore it

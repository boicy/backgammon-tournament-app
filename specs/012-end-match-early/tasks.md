# Tasks: End Match Early (Partial Completion)

**Input**: Design documents from `/specs/012-end-match-early/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Tests are MANDATORY per the project constitution (TDD non-negotiable). Test tasks MUST appear before and block their corresponding implementation tasks. Tests MUST be observed to fail before implementation begins.

**E2E Tests**: Playwright e2e tests MUST be included covering all acceptance scenarios. The Playwright config MUST capture failure artifacts automatically: full-page screenshot to `./artifacts/screenshots/<timestamp>-failure.png` and console log to `./artifacts/console/<timestamp>.log`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify Playwright artifact capture is configured before any e2e work begins.

- [X] T001 Verify `playwright.config.js` captures screenshots to `./artifacts/screenshots/` and console logs to `./artifacts/console/` on failure; add config if missing

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Fix a latent bug in `deriveMatchStandings()` — the loss filter incorrectly counts both players as losing when `winnerId` is `null` (which occurs for tied early-ended matches). This must be correct before any standings tests pass.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests for Standings Null-Winner Fix ⚠️ WRITE FIRST (TDD)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T002 Write failing unit tests for `deriveMatchStandings()` with `winnerId: null` in `tests/models/matchStanding.test.js`: a complete match with null winnerId (tied early-end) gives neither player a win or loss, but both players retain their earned match points; run `npm test` and confirm tests fail

### Implementation for Foundational Fix

- [X] T003 Fix loss guard in `deriveMatchStandings()` in `src/models/matchStanding.js`: add `&& m.winnerId !== null` to the loss filter so tied early-ended matches do not count as a loss for either player; run `npm test` and confirm T002 tests pass and no regressions

**Checkpoint**: `deriveMatchStandings()` correctly handles null `winnerId` — user story implementation can now begin.

---

## Phase 3: User Story 1 - Manually End an Active Match (Priority: P1) 🎯 MVP

**Goal**: A user can end an active match before the target score is reached. With 1+ games recorded, the leader is declared winner and the match is marked complete with `endedEarly: true`. The overflow button on active match cards triggers this with an adaptive confirmation. History view labels the match "Ended Early".

**Independent Test**: Start a tournament, add two players, start a match, record one game (P1 wins), click ⋯ overflow on the active card, confirm → match moves to completed zone on live view, appears with "Ended Early" label in history, and P1 appears as winner in standings.

### Tests for User Story 1 ⚠️ WRITE FIRST (TDD)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T004 Write failing unit tests for `earlyMatchWinner()` in `tests/models/match.test.js`: returns `player1Id` when P1 leads, returns `player2Id` when P2 leads, returns `null` when tied (e.g., P1=2 P2=2), returns `null` when no games recorded; run `npm test` and confirm tests fail
- [X] T005 Write failing unit tests for `endMatchEarly()` in `tests/store/store.test.js` (games path): throws `'Match not found'` for unknown id; throws `'Match is not active'` for completed/abandoned match; throws `'Match is not active'` for a match that was already naturally completed (i.e., `addGame` set `status: 'complete'` when target was reached); with games where P1 leads — sets `status: 'complete'`, `endedEarly: true`, `winnerId: player1Id`, `completedAt` truthy; with games where P2 leads — sets `winnerId: player2Id`; emits `state:matches:changed`; emits `state:standings:changed`; persists to localStorage; run `npm test` and confirm tests fail

### Implementation for User Story 1

- [X] T006 [P] Implement `earlyMatchWinner(match)` in `src/models/match.js`: returns `player1Id` if P1 accumulated match points > P2, returns `player2Id` if P2 > P1, returns `null` if equal; run `npm test` and confirm T004 tests pass
- [X] T007 Add `endMatchEarly(matchId)` action to `src/store/store.js` (depends on T006 — must run after T006 completes): import `earlyMatchWinner` from `../models/match.js`; if `match.games.length === 0` set `status: 'abandoned'`; if `match.games.length >= 1` set `status: 'complete'`, `endedEarly: true`, `winnerId: earlyMatchWinner(match)`, `completedAt: Date.now()`; persist, emit `state:matches:changed` and `state:standings:changed`; run `npm test` and confirm T005 tests pass
- [X] T008 [US1] Update `open-overflow` handler in `src/views/liveView.js`: import `endMatchEarly` from `../store/store.js`; verify `computeScore` helper exists in `liveView.js` before using it (use or alias the existing scoring utility if named differently); replace current `window.confirm('Abandon this match?')` + `abandonMatch` call with: compute scores via `computeScore(match)`, build adaptive message (games: "End match early? [P1] X – Y [P2]. [Leader] will be declared winner." or "Scores are tied — no winner will be declared." / no games: "No games recorded. Abandon this match? No scores will be saved."), then on confirm call `endMatchEarly(matchId)` and `refreshActiveZone()`; do NOT remove the `abandon-match` action handler here — that cleanup is scoped to T019
- [X] T009 [P] [US1] Update `matchStatusLabel` in `src/views/gameHistory.js`: change function to accept the full match object; return `'Ended Early'` when `match.endedEarly` is truthy; update all call sites to pass the match object; add `badge-ended-early` CSS class to badge rendering when `match.endedEarly`
- [X] T010 [P] [US1] Add `.badge-ended-early` style to `styles.css` alongside existing badge styles: amber/warning background (`#f59e0b`) with white text, matching existing badge sizing
- [X] T011 [US1] Write e2e tests for US1 acceptance scenarios in `tests/e2e/012-end-match-early.spec.js`: (a) start match → record 1 game (P1 wins) → overflow confirm → match moves to completed zone; (b) overflow cancel → match stays active; (c) navigate to `/#/history` → match shows "Ended Early" label; ensure Playwright config captures screenshots/console on failure
- [X] T012 [US1] Run US1 e2e tests via Playwright MCP (`browser_navigate`, `browser_click`, `browser_snapshot`); on any failure capture `browser_take_screenshot` to `./artifacts/screenshots/<timestamp>-failure.png` and `browser_console_messages` to `./artifacts/console/<timestamp>.log` before investigating

**Checkpoint**: US1 fully functional — active match can be ended early, leader wins, history shows "Ended Early" label.

---

## Phase 4: User Story 2 - Abandoned Match with No Impact on Standings (Priority: P2)

**Goal**: When "End Match" is triggered on a match with zero games, the match is abandoned (no scores, no standings impact). The confirmation message warns: "No games recorded. Abandon this match? No scores will be saved."

**Independent Test**: Start a match, record zero games, click ⋯ overflow, confirm → match disappears from live view; standings unchanged; match does not appear in history's completed section.

### Tests for User Story 2 ⚠️ WRITE FIRST (TDD)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T013 Write failing unit tests for `endMatchEarly()` zero-games path in `tests/store/store.test.js`: with zero games recorded — sets `status: 'abandoned'`, `winnerId` is explicitly `null` (use strict `=== null` assertion); does NOT set `endedEarly`; match does not contribute to standings; emits `state:matches:changed`; run `npm test` and confirm new tests fail

### Implementation for User Story 2

- [X] T014 [US2] Verify `endMatchEarly()` zero-games branch in `src/store/store.js` satisfies T013 (the `games.length === 0` path should already be implemented from T007); run `npm test` and confirm T013 tests pass
- [X] T015 [US2] Write e2e tests for US2 scenarios in `tests/e2e/012-end-match-early.spec.js`: (a) start match → zero games → overflow confirm → match removed from active zone; (b) standings unchanged after abandon; (c) abandoned match does not appear with "Ended Early" label
- [X] T016 [US2] Run US2 e2e tests via Playwright MCP; capture failure artifacts before investigating if any fail

**Checkpoint**: US1 and US2 both functional — early-end with and without games handled correctly.

---

## Phase 5: User Story 3 - Partial Result Reflected in Standings (Priority: P3)

**Goal**: Points earned in a partially completed match are counted in standings. A tied early-ended match gives neither player a win or loss, but both retain earned points.

**Independent Test**: Start match, record 3 games (P1 wins 2, P2 wins 1), end match early → navigate to Standings → P1 has 1 win and appropriate match points; P2 has 0 wins, 1 loss, match points from their 1 game win.

### Validation Tests for User Story 3

> **NOTE: Implementation for US3 is already complete via T007 (endMatchEarly) and T003 (matchStanding fix). These are validation e2e tests — write and run them to confirm the existing implementation satisfies acceptance scenarios.**

- [X] T017 Write e2e tests for US3 scenarios in `tests/e2e/012-end-match-early.spec.js`: (a) end match early P1 leading → leaderboard shows P1 credited with match points; (b) end match early tied → no winner in standings, both players retain earned points, neither gets a win or loss entry

### Implementation for User Story 3

- [X] T018 [US3] Run US3 e2e tests via Playwright MCP; the standings derivation relies on T003 (matchStanding fix) already being in place; capture failure artifacts if any fail; confirm `deriveMatchStandings` correctly attributes points from early-ended matches in live test

**Checkpoint**: All three user stories functional — partial results count in standings.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, cleanup, and full suite confirmation.

- [X] T019 [P] Confirm `abandon-match` action handler in `src/views/liveView.js` is either removed (if unused) or updated to call `endMatchEarly` for consistency; search codebase for any remaining direct `abandonMatch` calls from UI
- [X] T020 [P] Verify backward compatibility: load app with pre-existing localStorage data (matches without `endedEarly` field); confirm `matchStatusLabel` treats `undefined` as falsy and shows `'Complete'` not `'Ended Early'`
- [X] T021 Run full Vitest unit test suite via `npm test`; confirm 0 regressions across all 289 existing tests plus new tests
- [X] T022 Run full Playwright e2e suite via `npx playwright test`; confirm all existing 140 tests still pass plus new 012 tests; capture artifacts on any failure before investigating

---

## Dependencies & Execution Order

### Phase Mapping to plan.md

| Tasks Phase | Plan Phase | Plan Steps |
|-------------|------------|------------|
| Phase 1: Setup | — | T001 (config only) |
| Phase 2: Foundational | Plan Phase A (A3–A4) | matchStanding null-winner fix |
| Phase 3: US1 | Plan Phase A (A1–A2) + B + C | earlyMatchWinner → endMatchEarly → UI + history |
| Phase 4: US2 | Plan Phase B (zero-games path) | endMatchEarly abandoned branch |
| Phase 5: US3 | Plan Phase D | Playwright e2e validation |
| Phase 6: Polish | — | Cleanup + full suite |

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories (standings correctness)
- **US1 (Phase 3)**: Depends on Phase 2 — delivers core feature (MVP)
- **US2 (Phase 4)**: Depends on Phase 3 (T007 implements both paths in one function)
- **US3 (Phase 5)**: Depends on Phase 2 (matchStanding fix) and Phase 3 (endMatchEarly impl)
- **Polish (Phase 6)**: Depends on all story phases

### User Story Dependencies

- **US1 (P1)**: Requires Phase 2 complete — no other story dependency
- **US2 (P2)**: Requires T007 (endMatchEarly zero-games path already implemented with T007)
- **US3 (P3)**: Requires T003 (matchStanding fix) + T007 (endMatchEarly)

### Within Each User Story

- Tests (TDD) MUST be written and FAIL before implementation
- Model functions before store actions
- Store actions before UI handlers
- UI changes before e2e tests
- e2e write before e2e run

### Parallel Opportunities Within US1

- T006 (`earlyMatchWinner` in match.js) and T007 (`endMatchEarly` in store.js) — T006 must finish before T007 since T007 imports `earlyMatchWinner`
- T009 (gameHistory.js) and T010 (styles.css) can run in parallel with each other, after T008 (liveView)
- T004 and T005 (test writing) can run in parallel with each other

---

## Parallel Example: User Story 1

```bash
# Step 1 — Write both test files in parallel (T004 + T005):
Task: "earlyMatchWinner() unit tests in tests/models/match.test.js"
Task: "endMatchEarly() store tests in tests/store/store.test.js"

# Step 2 — Implement model function (T006), then store action (T007):
Task: "earlyMatchWinner() in src/models/match.js"
# → then
Task: "endMatchEarly() in src/store/store.js"

# Step 3 — UI changes in parallel (T009 + T010 after T008):
Task: "gameHistory.js matchStatusLabel update"
Task: ".badge-ended-early in styles.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational matchStanding fix (T002–T003)
3. Complete Phase 3: User Story 1 (T004–T012)
4. **STOP and VALIDATE**: End match early with 1 game → confirm winner declared, history label, standings updated
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → standings correctness guaranteed
2. US1 → core "end match early" flow working (MVP)
3. US2 → zero-game abandon via same overflow action
4. US3 → standing verification (largely free, relies on earlier work)
5. Polish → regression check + cleanup

---

## Notes

- [P] tasks = different files, no dependencies between them
- [Story] label maps task to specific user story for traceability
- TDD: always run `npm test` after writing tests to confirm RED before implementing
- `window.confirm` is the correct confirmation mechanism (matches existing pattern in liveView)
- `endedEarly` field is additive — existing localStorage data without it is backward-compatible
- The `abandon-match` data-action in liveView (lines ~494-501) duplicates `open-overflow` logic; review during T019
- Commit after each logical group (e.g., after RED tests, after GREEN implementation)

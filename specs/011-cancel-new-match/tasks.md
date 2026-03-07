# Tasks: Cancel New Match Creation (011)

**Input**: Design documents from `/specs/011-cancel-new-match/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ui-contract.md ✅

**Tests**: E2E Playwright tests MUST be written before implementation (TDD). Tests MUST be observed to fail before implementation begins.

**E2E Tests**: All acceptance scenarios covered by `tests/e2e/us11-cancel-new-match.test.js`. Playwright config MUST capture failure artifacts automatically: full-page screenshot to `./artifacts/screenshots/<timestamp>-failure.png` and console log to `./artifacts/console/<timestamp>.log`.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in all descriptions

---

## Phase 1: Setup

**Purpose**: Ensure Playwright failure artifact directories exist and create e2e test file scaffold.

- [X] T001 Ensure `./artifacts/screenshots/` and `./artifacts/console/` directories exist for Playwright failure capture (create if missing)
- [X] T002 Create e2e test file `tests/e2e/us11-cancel-new-match.test.js` with import boilerplate, `beforeEach` setup (navigate to `/`, start tournament, add 3 players), and empty `describe` blocks for US1, US2, US3

---

## Phase 3: User Story 1 — Cancel During Player Selection (Priority: P1) 🎯 MVP

**Goal**: A dedicated Cancel button is present at every step of the new match creation flow. Activating it closes the form and resets all selections.

**Independent Test**: Open new match form → pick P1 → press Cancel → verify form closes, no match started, pick state cleared. Repeat at step 2 and confirm step.

### Tests for User Story 1 ⚠️ WRITE FIRST (TDD)

> **Write these tests FIRST and confirm they FAIL before implementing**

- [X] T003 [US1] Write e2e tests in `tests/e2e/us11-cancel-new-match.test.js` for Cancel button visibility: assert `[data-action="cancel-new-match"]` is present at pick step 1, pick step 2, and confirm step
- [X] T004 [US1] Write e2e tests in `tests/e2e/us11-cancel-new-match.test.js` for cancel behaviour: (a) cancel at step 0 — form closes; (b) cancel at step 1 after picking P1 — form closes, P1 cleared; (c) cancel at confirm step — form closes, both players and target cleared
- [X] T005 [US1] Run US1 e2e tests via Playwright MCP (`browser_navigate` to `http://localhost:3000`, execute test interactions) and confirm all T003–T004 tests FAIL (red phase)

### Implementation for User Story 1

- [X] T006 [US1] Add `[data-action="cancel-new-match"]` Cancel button to the pick grid HTML (rendered at pick step 1 and pick step 2) in `src/views/liveView.js`
- [X] T007 [US1] Add `[data-action="cancel-new-match"]` Cancel button to the confirm step HTML in `src/views/liveView.js`
- [X] T008 [US1] Implement `case 'cancel-new-match':` handler in the delegated click handler in `src/views/liveView.js`: set `_pickStep = null`, `_selectedP1 = null`, `_selectedP2 = null`, `_newMatchExpanded = false`, then call `refreshNewMatchZone()`
- [X] T009 [US1] Run US1 e2e tests via Playwright MCP and confirm all T003–T004 tests PASS; on any failure capture screenshot via `browser_take_screenshot` to `./artifacts/screenshots/<timestamp>-failure.png` and console via `browser_console_messages` to `./artifacts/console/<timestamp>.log`

**Checkpoint**: US1 fully functional. Cancel button visible at every step, form closes and resets cleanly on activation.

---

## Phase 4: User Story 2 — Deselect a Player to Go Back One Step (Priority: P2)

**Goal**: At pick step 2, the user can deselect P1 to return to step 1 without closing the form. At the confirm step, deselecting either player returns to step 1 and clears the target.

**Independent Test**: Pick P1 → deselect P1 → verify form returns to step 1, form still open, P1 cleared. Then pick P1 + P2 → at confirm → deselect P1 → verify step 1, target cleared.

### Tests for User Story 2 ⚠️ WRITE FIRST (TDD)

- [X] T010 [US2] Write e2e tests in `tests/e2e/us11-cancel-new-match.test.js` for step-back deselect: (a) pick P1 → assert deselect affordance present on P1 badge at step 2; (b) deselect P1 at step 2 → assert form returns to step 1, P1 cleared, form still open
- [X] T011 [US2] Write e2e tests in `tests/e2e/us11-cancel-new-match.test.js` for confirm-step deselect: (a) P1+P2 at confirm → deselect P1 → assert `_pickStep` returns to step 1, target cleared; (b) P1+P2 at confirm → deselect P2 → same expected outcome
- [X] T012 [US2] Run US2 e2e tests via Playwright MCP and confirm T010–T011 tests FAIL (red phase)

### Implementation for User Story 2

- [X] T013 [US2] Add deselect affordance (button with `[data-action="deselect-player"]` and the P1 player's `data-player-id`) to the P1 badge rendered at pick step 2 in `src/views/liveView.js`
- [X] T014 [US2] Extend the `case 'deselect-player':` handler in `src/views/liveView.js` to cover `_pickStep === 2`: set `_selectedP1 = null`, `_pickStep = 1`, then call `refreshNewMatchForm()` (it reads `_pickStep` to render the correct step)
- [X] T015 [US2] Update the `case 'deselect-player':` handler for `_pickStep === 'confirm'` in `src/views/liveView.js` to reset `_selectedP1 = null`, `_selectedP2 = null`, `_selectedTarget = 7` (default), `_pickStep = 1`, then call `refreshNewMatchForm()` (it reads `_pickStep` to render the correct step)
- [X] T016 [US2] Run US2 e2e tests via Playwright MCP and confirm T010–T011 tests PASS; on any failure capture screenshot to `./artifacts/screenshots/<timestamp>-failure.png` and console to `./artifacts/console/<timestamp>.log`

**Checkpoint**: US1 and US2 both fully functional. Users can cancel entirely or step back one step during player selection.

---

## Phase 5: User Story 3 — Fresh State on Re-open (Priority: P3)

**Goal**: Closing the new match form via the toggle button resets all pick state. Re-opening always starts at step 1 with no players pre-selected.

**Independent Test**: Pick P1 → toggle form closed → toggle form open → assert step 1, P1 not selected.

### Tests for User Story 3 ⚠️ WRITE FIRST (TDD)

- [X] T017 [US3] Write e2e tests in `tests/e2e/us11-cancel-new-match.test.js`: (a) pick P1 → toggle form closed via `[data-action="toggle-new-match"]` → assert pick state reset; (b) re-open form → assert step 1, no prior selections shown
- [X] T018 [US3] Run US3 e2e tests via Playwright MCP and confirm they FAIL (red) or document if they already PASS due to existing toggle-close reset logic — PASSED immediately (existing toggle-close logic already correct)

### Implementation for User Story 3

- [X] T019 [US3] Verify the `toggle-new-match` close branch in `src/views/liveView.js` sets `_selectedP1 = null`, `_selectedP2 = null`, and `_pickStep = null` before closing; add any missing resets — verified correct, no changes needed
- [X] T020 [US3] Run US3 e2e tests via Playwright MCP and confirm T017 tests PASS; on any failure capture artifacts to `./artifacts/screenshots/` and `./artifacts/console/`

**Checkpoint**: All three user stories functional. Users have explicit cancel, step-back, and guaranteed-fresh re-open.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T021 [P] Verify Cancel button styling follows pill shape and consistent sizing from feature 009-button-style-consistency in `src/views/liveView.js` (check CSS classes match `.btn-primary`, `.btn-sm` or equivalent conventions) — uses `.btn.btn-secondary.btn-sm`
- [X] T021b [P] Verify Cancel button meets 44×44px minimum touch target at every step (pick step 1, pick step 2, confirm step) using Playwright snapshot — inspect computed height/width of `[data-action="cancel-new-match"]`
- [X] T022 Run full Playwright e2e suite via Playwright MCP (`npx playwright test`) and confirm zero regressions across all existing test files; capture failure artifacts if any failures occur — 152 passed
- [X] T023 Run full Vitest unit test suite (`npm test`) and confirm all 289 tests still pass — 289 passed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 3)**: Depends on Setup (T001–T002)
- **US2 (Phase 4)**: Depends on US1 complete — deselect at confirm step interacts with confirm step HTML added in US1
- **US3 (Phase 5)**: Can start after Setup — independent of US1/US2 implementation (toggle-close logic is separate)
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Starts after Setup — no story dependencies
- **US2 (P2)**: Confirm step deselect depends on confirm step HTML from US1 (T006–T007); start US2 after US1 complete
- **US3 (P3)**: Independent of US1/US2; can be worked in parallel with US1 if desired

### Within Each User Story

1. Write tests → confirm FAIL → implement → confirm PASS
2. All test tasks for a story MUST fail before any implementation task begins
3. Each story is complete when all its Playwright tests pass

### Parallel Opportunities

- T001 and T002 can run in parallel (different concerns)
- T006 and T007 can run in parallel (different HTML sections in liveView.js — pick grid vs confirm step)
- T013, T014, T015 within US2 can be done in a single pass (all in same function in liveView.js)
- T022 and T023 (Polish) can run in parallel (different test runners)

---

## Parallel Example: User Story 1

```bash
# Write tests in parallel (same file, different describe blocks):
T003: Cancel button visibility tests
T004: Cancel behaviour tests (can be written simultaneously in same file)

# Implementation in parallel (different HTML sections):
T006: Cancel button in pick grid HTML
T007: Cancel button in confirm step HTML
# Then T008 (handler) after T006+T007
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 3: US1 (T003–T009)
3. **STOP and VALIDATE**: All US1 Playwright tests pass, no regressions
4. Delivers: explicit Cancel button at every step — the core issue request

### Incremental Delivery

1. Setup → US1 (Cancel button) → **demo**: explicit exit at any step
2. Add US2 (Step-back) → **demo**: correct mis-tap without full cancel
3. Add US3 (Fresh re-open) → **demo**: stale state impossible
4. Polish → **release**

---

## Notes

- All implementation is in `src/views/liveView.js` — be careful not to break existing delegated event handler structure
- The `refreshNewMatchZone()` / re-render pattern must match existing code conventions in liveView.js
- Existing `[data-action="deselect-player"]` tests in other e2e files must continue to pass — do not break confirm-step deselect
- Existing `[data-action="toggle-new-match"]` behavior must be preserved for all existing tests
- [P] tasks = different files or independent sections — safe to work simultaneously
- Each story labeled [USN] for full traceability to spec.md

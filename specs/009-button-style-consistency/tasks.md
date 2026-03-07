# Tasks: Consistent Action Button Styling

**Input**: Design documents from `specs/009-button-style-consistency/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, quickstart.md ✅

**Tests**: Playwright e2e tests are MANDATORY per constitution. Test tasks appear before and block their corresponding implementation tasks. Tests MUST be observed to fail before implementation begins. No Vitest unit tests required (no business logic changes).

**E2E Tests**: Playwright MCP used for all test execution. Failure artifacts: screenshot → `./artifacts/screenshots/<timestamp>-failure.png`, console log → `./artifacts/console/<timestamp>.log`.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

---

## Phase 1: Setup

**Purpose**: Confirm baseline state before making changes.

- [x] T001Serve app locally with `npx serve .` and confirm it loads without errors; verify all three views (Live, History, Club) are accessible before touching any files

---

## Phase 2: User Story 1 — Uniform Button Size (Priority: P1) 🎯 MVP

**Goal**: All tappable controls share uniform height (44px min), consistent padding, and fill the full width of their container. Root fix: add missing `btn` base class to `liveView.js` buttons.

**Independent Test**: Expand Add Player form, New Match form, and a Record Game inline form. All submit buttons should be visually identical in height and fill their container. Verify via Playwright computed style check and screenshot.

### E2E Tests for User Story 1 ⚠️ WRITE FIRST (TDD)

> **Write these tests first, run via Playwright MCP, and confirm they FAIL before implementing T003–T008.**
> On any test failure during this phase, save artifacts: `browser_take_screenshot` → `./artifacts/screenshots/<timestamp>-failure.png` and `browser_console_messages` → `./artifacts/console/<timestamp>.log`

- [x] T002 [US1] Write Playwright e2e tests for all US1 acceptance scenarios in `tests/e2e/us9-button-size.test.js`:
  - Navigate to Live view; start a tournament with 2 players; expand Add Player form
  - Assert Save/Add submit button has `btn` class: `expect(await locator.getAttribute('class')).toContain('btn')`
  - Assert Save/Add submit button has `btn-full` class
  - Assert Start Match submit button has `btn` class and `btn-full` class
  - Assert Record Game toggle button has `btn` class and `btn-full` class
  - Assert Save Game (submit-game) button has `btn` class and `btn-full` class
  - Assert computed height of all action buttons is ≥44px (via `page.evaluate`)
  - Run via Playwright MCP (`browser_navigate` → `browser_snapshot` → `browser_evaluate`) and confirm tests FAIL

### Implementation for User Story 1

- [x] T003 [US1] In `src/views/liveView.js` renderGameForm (~line 95): change `class="btn-primary"` → `class="btn btn-primary btn-full"` on the Save button; change `class="btn-secondary"` → `class="btn btn-secondary btn-full"` on the Cancel button
- [x] T004 [US1] In `src/views/liveView.js` renderActiveCard (~line 121): change `class="btn-primary btn-sm"` → `class="btn btn-primary btn-full"` on the Record Game toggle button (remove `btn-sm`)
- [x] T005 [US1] In `src/views/liveView.js` roster render (~line 163): change `class="btn-danger btn-sm"` → `class="btn btn-danger btn-sm"` on the Remove player button (retain `btn-sm` for inline list use)
- [x] T006 [US1] In `src/views/liveView.js` Add Player form (~lines 186 and 523, both render paths): change `class="btn-primary btn-sm"` → `class="btn btn-primary btn-full"` (remove `btn-sm`)
- [x] T007 [US1] In `src/views/liveView.js` New Match toggle (~lines 208, 224, 253, all three expanded/collapsed render paths): change `class="live-new-match__toggle btn-secondary"` → `class="live-new-match__toggle btn btn-secondary btn-full"`
- [x] T008 [US1] In `src/views/liveView.js` Start Match submit (confirm step, ~line 235): change `class="btn-primary"` → `class="btn btn-primary btn-full"`
- [x] T020 [US1] In `src/views/namePrompt.js` (~line 27): add `btn-full` to the Start tournament submit button — change `class="btn btn-primary"` → `class="btn btn-primary btn-full"` (app-wide scope per FR-001)
- [x] T009 [US1] Run US1 e2e tests via Playwright MCP (`browser_navigate` to `http://localhost:3000`, interact to expand each form section, run assertions); confirm all US1 tests pass and capture a full-page screenshot of the Live view showing consistent button sizes

**Checkpoint**: All action buttons on the Live view are the same height, same padding, and full-width. User Story 1 is independently verified.

---

## Phase 3: User Story 2 — Rounded Style Matching Lozenges (Priority: P2)

**Goal**: All tappable controls have a pill/rounded shape (`border-radius: 9999px`) visually matching the rounded player name lozenge buttons in the pick grid.

**Independent Test**: Open pick-player grid (new match flow) and compare pick-player buttons (`.pick-btn`) against action buttons (`.btn`). Both should have the same computed `border-radius` (≥100px). Verify via Playwright computed style assertion and screenshot.

### E2E Tests for User Story 2 ⚠️ WRITE FIRST (TDD)

> **Write these tests first, run via Playwright MCP, and confirm they FAIL before implementing T011–T014.**

- [x] T010 [US2] Write Playwright e2e tests for all US2 acceptance scenarios in `tests/e2e/us9-button-rounding.test.js`:
  - Navigate to Live view with 2 players
  - Assert that `.btn` (any action button) has computed `border-radius` ≥ 100px (pill): `page.evaluate(() => parseFloat(getComputedStyle(el).borderRadius) > 100)`
  - Assert that `.pick-btn` (player pick button in grid) has the same computed border-radius as `.btn`
  - Open inline record-game form: assert pick-winner buttons (`.pick-btn`) have same border-radius as Save button (`.btn`)
  - Assert deselect pills (`.pick-pill`) have same border-radius as action buttons
  - Run via Playwright MCP and confirm tests FAIL (current `border-radius` is 8px = `--radius-md`)

### Implementation for User Story 2

- [x] T011 [US2] In `styles.css` `:root` Radii block (after `--radius-lg: 12px`): add `--radius-pill: 9999px;`
- [x] T012 [US2] In `styles.css` `.btn` selector (~line 307): change `border-radius: var(--radius-md)` → `border-radius: var(--radius-pill)` (depends on T011)
- [x] T013 [US2] In `styles.css` `.pick-btn` selector (~line 1809): change `border-radius: var(--radius-md)` → `border-radius: var(--radius-pill)` (depends on T011)
- [x] T014 [US2] In `styles.css` `.pick-pill` selector (~line 1851): change `border-radius: var(--radius-md)` → `border-radius: var(--radius-pill)` (depends on T011)
- [x] T019 [US2] In `styles.css` `.live-card__overflow-btn` selector (~line 1652): change `border-radius: var(--radius-sm)` → `border-radius: var(--radius-pill)` so the overflow trigger (⋯) matches the pill rounding of all other controls (depends on T011)
- [x] T015 [US2] Run US2 e2e tests via Playwright MCP; confirm all US2 tests pass; capture full-page screenshot of Live view in pick-player step showing pill-shaped buttons matching lozenge style

**Checkpoint**: All tappable controls have pill-shaped rounding visually matching the player name lozenges. User Story 2 is independently verified.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Full regression, mobile viewport verification, and visual review across all views.

- [x] T016 Run the full Playwright e2e suite (`npx playwright test`) via Playwright MCP; confirm all 119 existing tests still pass; if any fail, capture artifacts (`browser_take_screenshot` → `./artifacts/screenshots/<timestamp>-failure.png`, `browser_console_messages` → `./artifacts/console/<timestamp>.log`) before investigating
- [x] T017 Playwright MCP — use `browser_resize` to set viewport to 320×667; navigate through Live, History, and Club views; capture full-page screenshots via `browser_take_screenshot`; verify no button overflow, clipping, or unreadable text
- [x] T018 Playwright MCP — navigate to Live view with an active match; use `browser_take_screenshot` (fullPage) to capture the final consistent button layout as a reference screenshot; save to `./artifacts/screenshots/009-final-live-view.png`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (US1)**: Depends on Phase 1 — tests T002 must be written and FAIL before T003–T008; T009 must pass before Phase 3
- **Phase 3 (US2)**: Depends on Phase 2 completion — tests T010 must be written and FAIL before T011–T014; T015 must pass before Phase 4
- **Phase 4 (Polish)**: Depends on Phase 2 + Phase 3 completion

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 1. No dependency on US2.
- **US2 (P2)**: Can start after Phase 1. No functional dependency on US1 (CSS changes are independent of the HTML class fixes). Can be done in parallel with US1 if desired.

### Within Each User Story

1. Write e2e test → run → confirm FAIL
2. Implement CSS/HTML changes sequentially (same-file edits cannot be parallelized)
3. Run e2e test → confirm PASS

### Parallel Opportunities

- US1 and US2 are in different files (`liveView.js` vs `styles.css`) and can proceed in parallel once T002 and T010 (tests) are written
- T011–T014 are all in `styles.css` — must be done sequentially (same file)
- T003–T008 are all in `src/views/liveView.js` — must be done sequentially (same file)

---

## Parallel Example: US1 + US2 (if working concurrently)

```text
Prerequisite: T001 (app serves) + T002 (US1 tests written/failing) + T010 (US2 tests written/failing)

Then simultaneously:
  Thread A (US1 — liveView.js): T003 → T004 → T005 → T006 → T007 → T008 → T009
  Thread B (US2 — styles.css):  T011 → T012 → T013 → T014 → T015

Merge: T016 (full regression) → T017 (320px) → T018 (screenshot)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T001: Confirm app loads
2. T002: Write US1 tests, confirm FAIL
3. T003–T008: Fix button classes in `liveView.js`
4. T009: Run US1 tests, confirm PASS
5. **STOP and VALIDATE**: All action buttons same size and full-width ✅

### Full Delivery (Both Stories)

1. Complete MVP (US1 above)
2. T010: Write US2 tests, confirm FAIL
3. T011–T014: CSS token + border-radius updates
4. T015: Run US2 tests, confirm PASS
5. T016–T018: Regression + mobile + screenshot

---

## Notes

- All `liveView.js` button fixes are in the same file — edit sequentially, not in parallel
- All `styles.css` radius changes are in the same file — edit sequentially
- The `btn-sm` modifier is intentionally retained on the Remove Player button (inline list row use)
- The hamburger menu danger buttons (`menu-item-danger`) require no changes — already full-width with correct height
- `namePrompt.js` requires one change: add `btn-full` to the Start button (T020)
- `club.js`, `gameHistory.js`, `leaderboard.js` require no changes
- Verify tests fail before implementing — this is non-negotiable per the constitution

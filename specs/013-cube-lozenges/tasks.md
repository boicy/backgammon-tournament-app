# Tasks: Cube Value Lozenge Selector

**Input**: Design documents from `/specs/013-cube-lozenges/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**Tests**: Tests are MANDATORY per the project constitution (TDD non-negotiable). Test tasks MUST appear before and block their corresponding implementation tasks. Tests MUST be observed to fail before implementation begins.

**E2E Tests**: Playwright e2e tests MUST be executed via the Playwright MCP browser tools (`browser_navigate`, `browser_click`, `browser_snapshot`, etc.) against the locally served app. On any test failure, BEFORE investigating or fixing, capture:
- Screenshot: `browser_take_screenshot` (fullPage) → `./artifacts/screenshots/<timestamp>-failure.png`
- Console log: `browser_console_messages` → `./artifacts/console/<timestamp>.log`

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

---

## Phase 1: Setup

**Purpose**: Verify artifact directories exist before e2e testing begins.

- [x] T001 Ensure `./artifacts/screenshots/` and `./artifacts/console/` directories exist (create with `mkdir -p`)

---

## Phase 2: User Story 1 — Cube Value Lozenge Selector (Priority: P1) 🎯 MVP

**Goal**: Replace the `<select data-cube-value>` dropdown with 7 tappable lozenge buttons (1, 2, 4, 8, 16, 32, 64). Default selection is 1. Tapping a lozenge selects it and deselects the others. The selected value is submitted with the game record.

**Independent Test**: Start a match, open the inline game recording form, and confirm: (1) no `<select>` dropdown for cube value, (2) 7 lozenge buttons are visible, (3) value 1 is pre-highlighted, (4) tapping 4 highlights it and deselects 1, (5) submitting records the correct multiplied score.

### Tests for User Story 1 ⚠️ WRITE FIRST (TDD)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T002 [P] [US1] Write failing unit tests for cube lozenge rendering in `tests/views/liveView.test.js`:
  - **Pre-step**: Add `export` keyword to `gameFormHtml(match, players)` in `src/views/liveView.js` so it is importable in tests (one-word change; the function is already a pure HTML-returning function suitable for unit testing)
  - `gameFormHtml()` renders exactly 7 `[data-action="pick-cube-value"]` buttons
  - `data-cube-value` attributes are "1", "2", "4", "8", "16", "32", "64"
  - The button with `data-cube-value="1"` has class `pick-btn--selected` by default
  - No `<select data-cube-value>` element exists in the rendered HTML

- [x] T003 [P] [US1] Write failing Playwright e2e tests for cube lozenge interaction in `tests/e2e/us1-cube-lozenges.spec.js`:
  - Scenario 1: All 7 cube value buttons visible (no dropdown) when game recording form opens
  - Scenario 2: Value "1" lozenge has `pick-btn--selected` class on form open (default state)
  - Scenario 3: Tapping cube value "4" gives it `pick-btn--selected` and removes it from "1"
  - Scenario 4: Submitting with cube value "2" and a gammon win records 4 match points (2×2). Note: boundary cube value coverage (1, 4, 8, 16, 32, 64) is delegated to the existing `tests/models/game.test.js` unit tests, which remain unchanged.

> Run `npm test` and `npx playwright test tests/e2e/us1-cube-lozenges.spec.js` — all 4 new tests MUST be RED before proceeding

### Implementation for User Story 1

- [x] T004 [US1] Add `let _selectedCubeValue = 1;` module-level state variable in `src/views/liveView.js` alongside `_selectedWinner`; reset `_selectedCubeValue = 1` in all locations where `_selectedWinner` is reset (form open, form cancel, successful submit)

- [x] T005 [US1] Replace `<label class="live-form__label">Cube <select ...>` with `<div class="live-form__label">Cube <div class="cube-pick-grid">` containing 7 `<button>` elements in `gameFormHtml()` in `src/views/liveView.js`:
  - Each button: `class="pick-btn [pick-btn--selected if value===_selectedCubeValue]"`, `type="button"`, `data-action="pick-cube-value"`, `data-cube-value="N"`, text content = N
  - Values in order: 1, 2, 4, 8, 16, 32, 64

- [x] T006 [US1] Add `.cube-pick-grid` CSS class in `styles.css`:
  - `display: flex; flex-wrap: wrap; gap: var(--space-sm);`
  - Buttons inherit `.pick-btn` styles (no additional overrides needed)

- [x] T007 [US1] Add `pick-cube-value` action handler in the click handler in `src/views/liveView.js`:
  - Parse `parseInt(target.dataset.cubeValue, 10)` → set `_selectedCubeValue`
  - Toggle `pick-btn--selected` in-place on all `.cube-pick-grid` buttons within the matching card (same DOM-toggle pattern as `pick-winner` handler — do NOT re-render the card)

- [x] T008 [US1] Update the submit handler in `src/views/liveView.js`:
  - Replace `parseInt(card.querySelector('[data-cube-value]')?.value ?? '1', 10)` with `_selectedCubeValue`

**Checkpoint**: Run `npm test` (unit) — T002 tests must be GREEN. Run Playwright MCP against `npx serve` — T003 scenarios must be GREEN. Capture screenshot and console log via MCP on any failure before debugging.

---

## Phase 3: User Story 2 — Visual Language Consistency (Priority: P2)

**Goal**: Verify the cube lozenge buttons share the same visual style as the player-picker lozenges, and that all 7 buttons remain reachable on a narrow mobile screen without horizontal scrolling.

**Independent Test**: On a 375px-wide viewport (iPhone SE), open the game recording form and verify all 7 cube value buttons are visible and tappable without horizontal scroll. Visually confirm selected/unselected states match the player-picker lozenge style.

### Tests for User Story 2 ⚠️ WRITE FIRST (TDD)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T009 [US2] Write failing Playwright e2e test for narrow viewport in `tests/e2e/us2-cube-visual.spec.js`:
  - Set viewport to 375×812 (iPhone SE)
  - Open game recording form
  - Assert all 7 `[data-action="pick-cube-value"]` buttons are visible (`isVisible()`)
  - Assert no horizontal scrollbar on `.cube-pick-grid` (scrollWidth <= clientWidth)

> Run `npx playwright test tests/e2e/us2-cube-visual.spec.js` — test MUST be RED before proceeding

### Implementation for User Story 2

- [x] T010 [US2] Verify `.cube-pick-grid` in `styles.css` wraps correctly at 375px:
  - Confirm `flex-wrap: wrap` is present (already added in T006)
  - If buttons overflow at 375px, adjust `gap` or button `padding` — keep touch target ≥44px (`min-height: var(--touch-target)` is inherited from `.pick-btn`)
  - No separate CSS file needed — adjust existing `.cube-pick-grid` rule

**Checkpoint**: Run Playwright MCP at 375px viewport — T009 scenario must be GREEN. Capture screenshot via `browser_take_screenshot` to visually confirm wrapping looks correct.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T011 [P] Run full unit test suite: `npm test` — confirm all existing tests still pass plus new cube lozenge tests
- [x] T012 [P] Run full Playwright e2e suite via Playwright MCP against `npx serve` — confirm all previously passing e2e tests still pass plus new cube lozenge tests; capture artifacts on any failure before debugging
- [x] T013 Remove any leftover `<select data-cube-value>` references from comments or dead code in `src/views/liveView.js`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on Phase 1. Tests (T002, T003) written and failing before implementation (T004–T008) begins
- **US2 (Phase 3)**: Depends on Phase 2 completion (relies on `.cube-pick-grid` from T006)
- **Polish (Phase 4)**: Depends on Phases 2 and 3 complete

### User Story Dependencies

- **US1 (P1)**: Blocked only by Phase 1 — no dependency on US2
- **US2 (P2)**: US2 verification depends on US1 CSS from T006 (`.cube-pick-grid` must exist)

### Within Each User Story

- T002 and T003 are parallel (different test files) — MUST fail before T004 begins
- T004 must complete before T005 (state variable needed before HTML template)
- T005 and T006 are parallel (different files) — both needed before T007
- T007 must complete before T008 (handler must exist before submit reads state)

### Parallel Opportunities

- T002 (unit tests) and T003 (e2e tests) can be written simultaneously
- T005 (HTML template) and T006 (CSS) can be implemented simultaneously
- T011 (unit suite) and T012 (e2e suite) can be run simultaneously in Polish phase

---

## Parallel Example: User Story 1

```
# Write tests in parallel (T002 + T003 simultaneously):
Task: "Write failing unit tests for cube lozenge rendering in tests/views/liveView.test.js"
Task: "Write failing Playwright e2e tests in tests/e2e/us1-cube-lozenges.spec.js"

# Then implement HTML + CSS in parallel (T005 + T006 simultaneously):
Task: "Replace <select> with lozenge buttons in gameFormHtml() in src/views/liveView.js"
Task: "Add .cube-pick-grid CSS in styles.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Write tests T002 + T003 — verify RED
3. Complete T004 → T005 + T006 → T007 → T008 — make tests GREEN
4. **STOP and VALIDATE**: Playwright MCP session confirms all 4 e2e scenarios pass
5. Ship — US1 alone is the complete core feature

### Incremental Delivery

1. Phase 1 (Setup) → Phase 2 (US1 tests + impl) → Validate MVP
2. Phase 3 (US2 viewport test + CSS tweak) → Validate responsive
3. Phase 4 (Polish) → Full suite green → PR

---

## Notes

- [P] tasks = different files, no shared state, safely parallelizable
- Cube lozenge interaction MUST use in-place DOM class toggle (NOT card re-render) — see research.md Decision 3
- `_selectedCubeValue` resets to 1 on form close — same lifecycle as `_selectedWinner`
- No changes to `game.js`, `store.js`, or any model — scoring logic is unchanged
- Selector for e2e: `[data-action="pick-cube-value"][data-cube-value="N"]`
- On Playwright MCP failure: ALWAYS save artifacts first (`browser_take_screenshot` + `browser_console_messages`) before investigating

# Tasks: Record Game UX — Winner Tap-Select & Prominent Save

**Input**: Design documents from `/specs/008-record-game-ux/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ui-contract.md ✅, quickstart.md ✅

**Tests**: MANDATORY per constitution (TDD non-negotiable). Test tasks appear before and block their corresponding implementation tasks. Tests MUST be observed to fail before implementation begins.

**E2E Tests**: Playwright e2e tests MUST be run via the Playwright MCP browser tools against the locally served app. On any failure, capture artifacts BEFORE debugging:
- Screenshot: `browser_take_screenshot` (fullPage) → `./artifacts/screenshots/<timestamp>-failure.png`
- Console: `browser_console_messages` → `./artifacts/console/<timestamp>.log`

**Organization**: Grouped by user story. US1 (winner buttons) and US2 (prominent save) are independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup

**Purpose**: Locate all existing usages to be changed before touching any implementation.

- [ ] T001 Grep `src/views/liveView.js` for all references to `data-game-winner` and `[data-game-winner]`; grep `tests/e2e/` for all files that call `.selectOption` on `[data-game-winner]`; record findings so the change list is known before any code is modified

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add ephemeral state variable and CSS skeleton that both user stories depend on.

**⚠️ CRITICAL**: Complete before any user story implementation.

- [ ] T002 [P] Add `let _selectedWinner = null;` module-level ephemeral state variable to `src/views/liveView.js`, immediately after the existing `let _selectedTarget = 7;` line; also add `_selectedWinner = null;` reset inside the `render()` function alongside the other state resets
- [ ] T003 [P] Add `.pick-winner-grid` CSS rule to `styles.css` after the existing `.pick-target-grid` block: `display: flex; gap: 0.5rem; margin-bottom: 0.75rem;` with each child `flex: 1 1 0; min-width: 0;` so the two buttons share the full width equally

**Checkpoint**: `_selectedWinner` exists in module scope; `.pick-winner-grid` is defined in CSS.

---

## Phase 3: User Story 1 — Tap to Select Game Winner (Priority: P1) 🎯 MVP

**Goal**: Replace the `[data-game-winner]` `<select>` with two tap-target buttons; one per player; single selection with toggle-off; submit blocked if no winner chosen.

**Independent Test**: Open an active match card → expand inline form → confirm two buttons with player names appear, no `<select>`; tap one → it highlights; tap same → deselects; tap Save with no selection → inline error appears; tap a player → tap Save → score updates and form collapses.

### Tests for User Story 1 ⚠️ WRITE FIRST (TDD)

> Write these tests FIRST. Run `npm test` and confirm they FAIL before implementing.

- [ ] T004 [P] [US1] Write failing Vitest unit tests for winner-pick interactions in `tests/views/liveView.test.js` inside a new `describe('liveView — winner pick buttons')` block:
  - Test 1: expanded game form contains two `[data-action="pick-winner"]` buttons (not a `[data-game-winner]` select)
  - Test 2: tapping a winner button sets `pick-btn--selected` on it; other button has no selected class
  - Test 3: tapping the other winner button switches selection
  - Test 4: tapping the already-selected button deselects it (both buttons lose `pick-btn--selected`)
  - Test 5: clicking `[data-action="submit-game"]` with no winner selected shows `[data-game-error]` and does NOT call `recordMatchGame`

- [ ] T005 [P] [US1] Write failing Playwright e2e tests for US1 + US2 in `tests/e2e/us8-record-game-ux.test.js` — use `import { test, expect } from './fixtures.js'`; include a `setupTournament` + `startMatch` helper (same pattern as us2/us7 tests); write tests for all 9 scenarios:
  - AC1: two `[data-action="pick-winner"]` buttons visible, no `[data-game-winner]` select; also assert `[data-result-type]` and `[data-cube-value]` selects are still present (FR-009)
  - AC2: tapping Player A selects it; Player B unselected
  - AC3: tapping Player B switches selection
  - AC4: tapping selected button deselects (toggle-off)
  - AC5: Submit with no winner shows `[data-game-error]`; score unchanged
  - AC6: Submit with winner records game; score updates; form collapses
  - AC7: Save button height >= 48px; width equals container width; button has class `btn-primary` (verifies CTA colour is applied — higher-contrast visual appearance verified manually via quickstart.md) **(US2 — this test gates T012)**
  - AC8: Winner state resets to null when form closes and reopens (no button selected)
  - AC9: Add a player named `"Bartholomew Nightingale"` (24 chars); start a match vs `"Alice"`; expand game form; assert both `[data-action="pick-winner"]` buttons are visible and their `boundingBox().width` does not exceed the card's `boundingBox().width` (SC-004 long-name layout)

### Implementation for User Story 1

- [ ] T006 [US1] In `src/views/liveView.js`, locate `gameFormHtml(match, players)` (or the equivalent inline HTML template for the game form inside `renderMatchCard()`); replace the `<select data-game-winner>…</select>` block with a `.pick-winner-grid` div containing two buttons:
  ```html
  <div class="pick-winner-grid">
    <button class="pick-btn${_selectedWinner === p1Id ? ' pick-btn--selected' : ''}" type="button"
            data-action="pick-winner" data-winner-id="${escapeHtml(p1Id)}">${escapeHtml(p1Name)}</button>
    <button class="pick-btn${_selectedWinner === p2Id ? ' pick-btn--selected' : ''}" type="button"
            data-action="pick-winner" data-winner-id="${escapeHtml(p2Id)}">${escapeHtml(p2Name)}</button>
  </div>
  <span data-game-error style="display:none;color:var(--color-danger,#ef4444);font-size:0.85rem;"></span>
  ```
  The initial render bakes `_selectedWinner` into the class attributes (null on first open → no selected class). Subsequent winner clicks are handled via direct DOM class-toggle in T007 — no full re-render needed. If the card re-renders (e.g. score update), the current `_selectedWinner` value will be correctly baked in again.

- [ ] T007 [US1] Add a `pick-winner` branch to the delegated click handler in `src/views/liveView.js` (inside the `if (action === …)` chain, alongside `pick-player`, `pick-target`, etc.):
  - Find the clicked button's `data-winner-id` value
  - If `_selectedWinner === clickedId` → set `_selectedWinner = null` (toggle off)
  - Else → set `_selectedWinner = clickedId`
  - Toggle `pick-btn--selected` class directly on the two winner buttons within `target.closest('.live-card')` (scope to the card to avoid touching other cards); also clear any visible `[data-game-error]` within that card
  - Do NOT re-render the full card (direct class toggle avoids stale DOM issues)

- [ ] T008 [US1] Update the `submit-game` branch in the delegated click handler in `src/views/liveView.js`:
  - If `_selectedWinner === null`: find `[data-game-error]` within the card, set its `textContent = 'Please select a winner'`, set `style.display = ''`; return early (do not submit)
  - Else: read result type from `[data-result-type]` select, cube value from `[data-cube-value]` select; call `recordMatchGame(matchId, _selectedWinner, resultType, cubeValue)`; set `_selectedWinner = null`

- [ ] T009 [US1] Add `_selectedWinner = null` reset in `src/views/liveView.js` in both the **open** and **close** branches of the `record-game` toggle handler, so the state is always clean when the form opens or closes (same pattern as `_selectedTarget = 7` resets in 007)

- [ ] T010 [US1] Run `npm test`; confirm all new US1 Vitest unit tests pass (and no regressions); if any test fails, diagnose and fix before proceeding

- [ ] T011 [US1] Run `npx playwright test tests/e2e/us8-record-game-ux.test.js` and verify AC1–AC6 + AC8 scenarios pass; on any failure: capture `browser_take_screenshot` (fullPage) → `./artifacts/screenshots/<timestamp>-failure.png` and `browser_console_messages` → `./artifacts/console/<timestamp>.log` before debugging

**Checkpoint**: US1 fully functional — winner selected via tap buttons; submit blocked without winner; score updates correctly.

---

## Phase 4: User Story 2 — Prominent Save / Record Button (Priority: P2)

**Goal**: Make the `[data-action="submit-game"]` button full-width and at least 48px tall as a clear primary CTA.

**Independent Test**: Expand an inline game form → measure the save button height (≥ 48px) and confirm it spans the full width of the form.

**Pre-implementation test**: T005/AC7 (written in Phase 3) covers this story's measurable acceptance criteria — height, width, and `btn-primary` class. Confirm T005/AC7 is FAILING before starting T012.

### Implementation for User Story 2

- [ ] T012 [US2] Add CSS in `styles.css` targeting the submit button within the game form — after the `.pick-winner-grid` block:
  ```css
  .live-card__form [data-action="submit-game"],
  [data-game-form] [data-action="submit-game"] {
    width: 100%;
    min-height: 48px;
    font-size: 1rem;
    font-weight: 600;
    margin-top: 0.5rem;
  }
  ```
  Ensure the `btn-primary` amber colour already applied to this button continues to apply (no override needed — just size).

- [ ] T013 [US2] Run `npx playwright test tests/e2e/us8-record-game-ux.test.js` filtering to the AC7 size test; verify save button height ≥ 48px and full-width; on any failure capture artifacts before debugging

**Checkpoint**: US1 + US2 both complete. Winner tap-select works; save button is a prominent CTA.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Update 6 existing e2e test files that used `selectOption` on the now-removed `[data-game-winner]` select; verify full suite.

- [x] T014 [P] Update `tests/e2e/us2-inline-recording.test.js`: replace every `card.locator('[data-game-winner]').selectOption({ label: winnerName })` (and `selectOption({ index: 0 })`) with `card.locator('[data-action="pick-winner"]').filter({ hasText: winnerName }).click()` or `card.locator('[data-action="pick-winner"]').first().click()` for index-0 cases

- [x] T015 [P] Update `tests/e2e/us3-night-leaderboard.test.js`: in `playMatchToCompletion()` helper and any inline recording steps, replace `card.locator('[data-game-winner]').selectOption({ label: winner })` with `card.locator('[data-action="pick-winner"]').filter({ hasText: winner }).click()`

- [x] T016 [P] Update `tests/e2e/us4-visual-refresh.test.js`: replace `page.locator('[data-game-winner]').first().selectOption({ index: 0 })` with `page.locator('[data-action="pick-winner"]').first().click()` (or filter by player name if available)

- [x] T017 [P] Update `tests/e2e/us5-standings-live.test.js`: replace `page.locator('[data-game-winner]').first().selectOption({ index: 0 })` with `page.locator('[data-action="pick-winner"]').first().click()`

- [x] T018 [P] Update `tests/e2e/t034-validation.test.js`: replace any `[data-game-winner]` selectOption call with the appropriate pick-winner click

- [x] T019 [P] Update `tests/e2e/us4-all-time-leaderboard.test.js`: replace any `[data-game-winner]` selectOption call with the appropriate pick-winner click

- [x] T020 Run `npx playwright test` (full suite); confirm all 110+ tests pass; on any failure capture `browser_take_screenshot` → `./artifacts/screenshots/<timestamp>-failure.png` and `browser_console_messages` → `./artifacts/console/<timestamp>.log` before debugging

- [x] T021 Run `npm test` (full Vitest suite); confirm 282+ tests pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)**: No dependencies — start immediately
- **Foundational (T002, T003)**: Depends on T001 completion; T002 and T003 run in parallel
- **US1 Phase (T004–T011)**: Depends on T002 + T003; T004 and T005 can run in parallel with each other; T006–T009 run sequentially (same file); T010 after T006–T009; T011 after T010
- **US2 Phase (T012–T013)**: Depends on US1 phase completion; T012 before T013
- **Polish (T014–T021)**: T014–T019 can all run in parallel; T020 after T014–T019; T021 can run alongside T020

### Within US1

```
T004 ─┐
      ├─► T006 → T007 → T008 → T009 → T010 → T011
T005 ─┘
```

T004 and T005 are written first (TDD), confirmed failing, then T006–T009 implement to make them pass.

---

## Parallel Opportunities

```bash
# Phase 2 — run together:
T002  # _selectedWinner state in liveView.js
T003  # .pick-winner-grid CSS in styles.css

# US1 tests — write together before any implementation:
T004  # Vitest unit tests
T005  # Playwright e2e tests

# Polish — update all 6 helper files in parallel:
T014  # us2-inline-recording.test.js
T015  # us3-night-leaderboard.test.js
T016  # us4-visual-refresh.test.js
T017  # us5-standings-live.test.js
T018  # t034-validation.test.js
T019  # us4-all-time-leaderboard.test.js
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. T001: Identify change scope
2. T002–T003: Add state variable and CSS (foundational)
3. T004–T005: Write failing tests (TDD red)
4. T006–T009: Implement winner buttons (TDD green)
5. T010–T011: Verify tests pass
6. **STOP and validate**: Winner tap-select works end-to-end

### Full Delivery

1. MVP above → then T012–T013 (US2 save button CTA)
2. T014–T019 (update existing e2e helpers)
3. T020–T021 (full suite verification)

---

## Notes

- `_selectedWinner` state is reset to `null` on form open, form close, and after submit — never leaks between cards
- Direct class-toggle on existing DOM elements (T007) is preferred over full re-render to avoid stale reference bugs (lesson from 007)
- The `[data-game-winner]` select is removed entirely — do not leave it as a hidden fallback
- `escapeHtml()` MUST be applied to player names and IDs before inserting into innerHTML
- Only one game form can be open at a time (`_expandedCardId` constraint) so `_selectedWinner` is a scalar, not a map

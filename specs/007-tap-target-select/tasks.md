# Tasks: Tap-to-Select Target Score Grid (007)

**Input**: Design documents from `/specs/007-tap-target-select/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: TDD non-negotiable. E2e tests MUST be written and OBSERVED TO FAIL before implementation.

**E2E Tests**: Playwright MCP. Failure artifacts written to `./artifacts/screenshots/` and `./artifacts/console/`.

---

## Phase 1: Setup (Orientation)

**Purpose**: Read current code before touching anything.

- [x] T001 Read the confirm-step branch of `newMatchFormHtml()` in `src/views/liveView.js` (lines ~197–260) to understand the exact `<input type="number" data-start-target>` markup being replaced
- [x] T002 [P] Read the ephemeral-state block at the top of `src/views/liveView.js` (lines ~12–20) to confirm `_selectedTarget` is NOT yet present
- [x] T003 [P] Read `tests/e2e/us7-new-match-form.test.js` to understand current AC structure before rewriting
- [x] T004 [P] Run `grep -rn "data-start-target\|fill.*target\|start-target" tests/e2e/` to locate all 11 e2e helper files that use `input[data-start-target]`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add `_selectedTarget` state before any rendering or handler changes.

**⚠️ CRITICAL**: State variable must exist before confirm-step HTML and pick-target handler are added.

- [x] T005 Add `let _selectedTarget = 7;` to the ephemeral-state block in `src/views/liveView.js` (after `_selectedP2`); also reset `_selectedTarget = 7` inside `render()` alongside the existing resets for `_pickStep`/`_selectedP1`/`_selectedP2`

**Checkpoint**: `_selectedTarget` is declared and resets on re-render — foundational state is ready.

---

## Phase 3: User Story 1 — Tap Target Grid (Priority: P1) 🎯 MVP

**Goal**: Replace `<input type="number">` target field with a 10-button tap grid (3–21 odd values); default 7 pre-selected; reuses `.pick-btn`/`.pick-btn--selected` CSS from 006.

**Independent Test**: Start app, open new-match form, pick two players → confirm step shows 10 target buttons with 7 highlighted. Tap 11 → 11 highlighted, 7 not. Tap Start → match card shows target 11.

### Tests for User Story 1 ⚠️ WRITE FIRST (TDD)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T006 [US1] Rewrite `tests/e2e/us7-new-match-form.test.js`:
  - **AC1**: Confirm step shows 10 `[data-action="pick-target"]` buttons with values 3,5,7,9,11,13,15,17,19,21; button "7" has `.pick-btn--selected` class; input `[data-start-target]` is NOT present
  - **AC2**: Tap "11" → button "11" has `.pick-btn--selected`; button "7" does NOT; tap Start → active card visible (match started with target 11)
  - **AC3**: Reopen form → button "7" is pre-selected again (reset on toggle-close)
  - **AC4**: Tap Start without changing selection → match starts with default target 7
- [x] T007 [US1] Run `tests/e2e/us7-new-match-form.test.js` via Playwright MCP (`browser_navigate` → interact → assert) and confirm tests FAIL (expected: `[data-action="pick-target"]` not found). On any unexpected error, capture artifacts before investigating: `browser_take_screenshot` (fullPage) → `./artifacts/screenshots/<timestamp>-failure.png`; `browser_console_messages` → `./artifacts/console/<timestamp>.log`

### Implementation for User Story 1

- [x] T008 [US1] Update `newMatchFormHtml()` confirm step in `src/views/liveView.js`: replace `<label>Target <input type="number" data-start-target ...></label>` with a `<div class="pick-target-grid">` containing 10 `<button>` elements, each with `data-action="pick-target"` and `data-target-value="${v}"`, applying `pick-btn--selected` to the button whose value equals `_selectedTarget`
- [x] T009 [US1] Add `pick-target` case to the event-delegation click handler in `src/views/liveView.js`: read `dataset.targetValue`, set `_selectedTarget = Number(value)`, call `refreshNewMatchForm()` (same pattern as `pick-player`)
- [x] T010 [US1] Update the `toggle-new-match` close branch in `src/views/liveView.js` to reset `_selectedTarget = 7` alongside the existing `_pickStep`/`_selectedP1`/`_selectedP2` resets
- [x] T011 [US1] Update the `start-match-form` submit handler in `src/views/liveView.js`: replace `parseInt(form.querySelector('[data-start-target]').value, 10)` (or equivalent) with `_selectedTarget`
- [x] T012 [US1] Add `.pick-target-grid` rule to `styles.css` (5-column grid; place after `.pick-start-form` block):
  ```css
  .pick-target-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  ```
- [x] T013 [US1] Run `tests/e2e/us7-new-match-form.test.js` via Playwright MCP and confirm all 4 ACs pass. On any failure, capture artifacts BEFORE debugging: `browser_take_screenshot` (fullPage) → `./artifacts/screenshots/<timestamp>-failure.png`; `browser_console_messages` → `./artifacts/console/<timestamp>.log`

### E2E Helper Updates for User Story 1

> **Purpose**: All 11 helper files that call `fill(target)` on `input[data-start-target]` must switch to the pick-target pattern (or omit if using default 7). Helpers using `target = 1` (not in preset) must switch to default (omit) or use `3`.

- [x] T014 [P] [US1] Using the file list from T004, update the first half of the e2e test files that contain `fill` calls on `input[data-start-target]`: for each inline `startMatch`/`recordGame` style helper, replace `await page.locator('input[data-start-target]').fill(...)` with a `pick-target` click — `await page.locator('[data-action="pick-target"]').filter({ hasText: String(target) }).click()` — or omit the step entirely when relying on the default 7; replace any `target = 1` usage with `3` (smallest preset)
- [x] T015 [P] [US1] Using the file list from T004, update the remaining e2e test files that contain `fill` calls on `input[data-start-target]` (same pattern as T014): replace each fill call with a `pick-target` button click or omit for default-7 cases; use `3` as a substitute for any `target = 1`
- [x] T016 [US1] Run the full Playwright suite via Playwright MCP and confirm all tests pass. On any failure, capture artifacts BEFORE debugging: `browser_take_screenshot` (fullPage) → `./artifacts/screenshots/<timestamp>-failure.png`; `browser_console_messages` → `./artifacts/console/<timestamp>.log`

**Checkpoint**: US1 complete — target grid works end-to-end; all e2e helpers updated; full suite green.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T017 [P] Update unit test in `tests/views/liveView.test.js`: in the confirm-step assertion, replace `querySelectorAll('input[data-start-target]')` (or number-input check) with an assertion that 10 `[data-action="pick-target"]` buttons are present and the button with `data-target-value="7"` has class `pick-btn--selected`
- [x] T018 Run `npm test` (Vitest) and confirm all unit tests pass
- [x] T019 Run quickstart.md verification steps: serve app with `npx serve . --listen 3456`, open `http://localhost:3456`, manually verify the 7 scenarios described in `specs/007-tap-target-select/quickstart.md`
- [x] T020 Run full Playwright suite one final time via Playwright MCP to confirm no regressions. On any failure, capture artifacts BEFORE debugging: `browser_take_screenshot` (fullPage) → `./artifacts/screenshots/<timestamp>-failure.png`; `browser_console_messages` → `./artifacts/console/<timestamp>.log`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — read-only orientation; run immediately
- **Foundational (Phase 2)**: Requires Phase 1 complete (state var must exist before confirm HTML and handler)
- **US1 (Phase 3)**: Requires Phase 2 complete; tests before implementation (T006–T007 before T008–T012)
- **Polish (Phase 4)**: Requires Phase 3 complete (unit test update assumes pick-target buttons exist)

### Within Phase 3

- T006–T007: Write + fail e2e tests first (TDD gate)
- T008–T012: Implementation (can be done sequentially; all touch `liveView.js` or `styles.css`)
- T013: Verify new tests pass
- T014–T015: Helper updates (can run in parallel — different files)
- T016: Full suite validation

### Parallel Opportunities

- T001–T004 (orientation reads): all in parallel
- T014–T015 (helper updates): in parallel — different test files, no shared state

---

## Parallel Example: User Story 1

```bash
# Orientation (Phase 1) — all in parallel:
Task: "Read confirm-step branch of newMatchFormHtml()"
Task: "Read ephemeral-state block"
Task: "Read us7-new-match-form.test.js"
Task: "Grep for data-start-target in tests/e2e/"

# Helper updates (Phase 3, after T013) — in parallel:
Task: "Update first half of e2e files from T004 grep list (T014)"
Task: "Update remaining e2e files from T004 grep list (T015)"
```

---

## Implementation Strategy

### MVP (Single Pass)

This feature has one user story. The full delivery is:

1. Phase 1: Orient (reads only)
2. Phase 2: Add `_selectedTarget` state (1 edit)
3. Phase 3: Write failing tests → implement → verify → update helpers → full suite
4. Phase 4: Unit test update + final validation

### Notes

- [P] tasks touch different files — safe to parallelize
- `pick-target` pattern is identical to `pick-player` — copy handler structure exactly
- Default 7 is preserved across all helper updates — only non-default targets need explicit clicks
- Do NOT add a number-input fallback — the input is removed entirely
- Commit after T013 (core feature working), then again after T016 (helpers done), then after T020 (final)

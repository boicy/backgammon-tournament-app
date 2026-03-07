# Implementation Plan: Cube Value Lozenge Selector

**Branch**: `013-cube-lozenges` | **Date**: 2026-03-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/013-cube-lozenges/spec.md`

## Summary

Replace the `<select>` cube multiplier dropdown in the inline game recording form with seven tappable lozenge buttons (values 1, 2, 4, 8, 16, 32, 64), visually matching the existing player-picker and winner-picker pattern. Change is contained to `liveView.js`, `styles.css`, and their corresponding tests. No data model changes.

## Technical Context

**Language/Version**: Vanilla JavaScript ES2022+ (native ES modules), HTML5, CSS3
**Primary Dependencies**: None (production)
**Storage**: localStorage — no changes
**Testing**: Vitest 3.x (unit); Playwright MCP (e2e)
**Target Platform**: Browser — static app served via `npx serve`
**Project Type**: Web application (static, client-only)
**Performance Goals**: Single-tap selection with in-place DOM class toggle (no re-render)
**Constraints**: No frameworks; no bundler; touch targets ≥44×44px
**Scale/Scope**: Single-screen change in liveView.js

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| **Simplicity gate** | PASS | Reuses existing `.pick-btn` CSS pattern; no new dependencies |
| **TDD gate** | PASS | Unit tests for `gameFormHtml` cube rendering written before implementation |
| **E2E gate** | PASS | Playwright e2e tests cover all 4 acceptance scenarios; executed via Playwright MCP |
| **Static gate** | PASS | No server-side component introduced |
| **Integrity gate** | PASS | `game.js` scoring unchanged; `calculateMatchPoints` and `VALID_CUBE_VALUES` unmodified |

**Post-design re-check**: All gates still pass. No complexity violations.

## Project Structure

### Documentation (this feature)

```text
specs/013-cube-lozenges/
├── plan.md              # This file
├── research.md          # Phase 0 output ✅
├── data-model.md        # Phase 1 output ✅
└── tasks.md             # Phase 2 output (/speckit.tasks) ✅
```

### Source Code (repository root)

```text
src/
└── views/
    └── liveView.js          # Primary change: _selectedCubeValue state + lozenge HTML + click handler

styles.css                   # Add .cube-pick-grid layout class

tests/
├── views/
│   └── liveView.test.js     # Unit tests: cube lozenge rendering, default selected=1, reset
└── e2e/
    └── us1-cube-lozenges.spec.js   # New: Playwright e2e for all 4 acceptance scenarios
```

**Structure Decision**: Single-project layout (existing). All changes are within the existing `src/` and `tests/` tree. No new directories required.

## Implementation Design

### Change 1 — Module-level state (`liveView.js`)

Add alongside existing ephemeral state variables:
```
let _selectedCubeValue = 1;
```

Reset to `1` in all places where `_selectedWinner` is reset (form close, cancel, submit success).

### Change 2 — `gameFormHtml()` HTML template (`liveView.js`)

Replace:
```html
<label class="live-form__label">Cube
  <select class="live-form__select" data-cube-value>
    <option value="1">1</option>
    ...
    <option value="64">64</option>
  </select>
</label>
```

With:
```html
<div class="live-form__label">Cube
  <div class="cube-pick-grid">
    <!-- 7 buttons: values 1, 2, 4, 8, 16, 32, 64 -->
    <!-- selected class applied to _selectedCubeValue on initial render -->
  </div>
</div>
```

Each button uses `data-action="pick-cube-value"` and `data-cube-value="N"`. The button matching `_selectedCubeValue` receives `pick-btn--selected` on initial render.

### Change 3 — Click handler (`liveView.js`)

Add `pick-cube-value` action handler:
- Read `dataset.cubeValue`, parse to integer
- Update `_selectedCubeValue`
- Toggle `pick-btn--selected` in-place across the 7 buttons within the card's `.cube-pick-grid` (same DOM-toggle pattern as winner picker)

### Change 4 — Submit handler (`liveView.js`)

Replace:
```js
const cubeValue = parseInt(card.querySelector('[data-cube-value]')?.value ?? '1', 10);
```

With:
```js
const cubeValue = _selectedCubeValue;
```

### Change 5 — CSS (`styles.css`)

Add `.cube-pick-grid`:
- `display: flex; flex-wrap: wrap; gap: var(--space-sm);`
- Individual buttons use `.pick-btn` (inherited styles, no override needed)

### Change 6 — Unit tests (`tests/views/liveView.test.js`)

**Pre-step**: Export `gameFormHtml(match, players)` from `liveView.js` (add `export` keyword at line 63). The function is already a pure HTML-returning helper; exporting it enables isolated unit testing without going through `render()`.

New test cases (written before implementation, must observe RED before GREEN):
1. `gameFormHtml` renders exactly 7 cube value buttons
2. Default state: button with `data-cube-value="1"` has `pick-btn--selected` class; others do not
3. After `_selectedCubeValue` is set to `4`, button with `data-cube-value="4"` has `pick-btn--selected`
4. No `<select data-cube-value>` element exists in the rendered HTML

### Change 7 — E2E tests (`tests/e2e/us1-cube-lozenges.spec.js`)

New Playwright e2e test file covering all 4 acceptance scenarios from spec.md:
1. All 7 cube value buttons are visible (no dropdown)
2. Value "1" is pre-selected (has `pick-btn--selected`) when form opens
3. Tapping a cube button selects it and deselects all others
4. Submitting with a non-1 cube value records the correct multiplied score

Executed via Playwright MCP browser tools (`browser_navigate`, `browser_snapshot`, `browser_click`, etc.) against `npx serve`-hosted app. On test failure, artifacts saved via `browser_take_screenshot` and `browser_console_messages`.

## Selector Reference (for e2e tests)

| Element | Selector |
|---------|----------|
| Cube pick grid | `.cube-pick-grid` |
| Individual cube button | `[data-action="pick-cube-value"][data-cube-value="N"]` |
| Selected cube button | `.cube-pick-grid .pick-btn--selected` |
| Submit game | `[data-action="submit-game"]` |

## Complexity Tracking

> No violations — no entry required.

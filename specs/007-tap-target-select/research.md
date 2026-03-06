# Research: Tap-to-Select Target Score Grid (007)

**Input**: plan.md Technical Context
**Status**: Complete — no NEEDS CLARIFICATION items

## No Unknowns

This feature is a direct extension of 006-tap-to-select. All architectural decisions are already resolved:

- **Pattern**: Same `data-action` event delegation used for `pick-player`/`deselect-player` in 006. A new `pick-target` action follows the identical pattern.
- **State**: One new module-level variable `let _selectedTarget = 7;` in `liveView.js`. Same reset/restore pattern as `_pickStep`/`_selectedP1`/`_selectedP2`.
- **CSS**: `.pick-btn` and `.pick-btn--selected` from 006 can be reused without modification. A `.pick-target-grid` rule sets the column count (5 columns fits 10 buttons on 375px with comfortable touch targets).
- **E2E helper impact**: All 11 helper files that do `fill(target)` on `input[data-start-target]` need to be updated. Since the number input is removed, helpers that pass `target = 1` must switch to a preset value. The simplest fix: helpers that only need "some match" use the default (omit the target click entirely) or use `3` (the smallest preset). Helpers testing specific scores can use any preset value.

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Column count for target grid | 5 columns (2 rows of 5) | 10 buttons ÷ 5 = 2 rows; fits 375px width with 44px min-height buttons and gap |
| Default pre-selected value | 7 | Matches existing default; most common club-night target |
| Non-preset target support | Not supported | Out of scope per spec; only 3–21 odd values needed |
| Step flow | Keep as 3-step (P1 → P2 → confirm+target) | Target grid in confirm step; no 4th step needed |
| Helper update strategy | Use default (7) where `target=1` was used for convenience | 1 is not in preset list; tests that don't care about score should omit target click |

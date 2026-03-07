# UI Contract: Cancel New Match Creation (011)

Defines the DOM interface for this feature — selectors and `data-action` attributes used by implementation and Playwright tests.

## New Actions

| `data-action` | Element | When Present | Effect |
|---------------|---------|--------------|--------|
| `cancel-new-match` | `<button>` | Every pick step (1, 2, confirm) while form is open | Closes form, resets all selections |

## Modified Actions

| `data-action` | Element | Changed Behaviour |
|---------------|---------|-------------------|
| `deselect-player` | `<button>` | Previously only at confirm step. Now also rendered at pick step 2 for the selected P1. At confirm step, deselect now resets to step 1 (previously may have returned to step 2). |

## Selector Reference

| Selector | Description |
|----------|-------------|
| `[data-action="cancel-new-match"]` | Cancel button (all steps) |
| `[data-action="deselect-player"]` | Deselect control at step 2 and confirm step |
| `.live-new-match--expanded` | New match section when open |
| `.pick-grid` | Player pick grid (steps 1 & 2) |
| `.pick-confirm` | Confirm screen (step 3) |

## Unchanged Selectors (referenced by existing e2e tests)

These existing selectors MUST NOT change:

| Selector | Description |
|----------|-------------|
| `[data-action="toggle-new-match"]` | Open/close toggle for new match form |
| `[data-action="pick-player"]` | Player pick buttons in grid |
| `[data-action="pick-target"]` | Target preset buttons |
| `button[type="submit"]` with text "Start" | Submit/start match button |
| `.pick-pill` | Selected player pills at confirm step |

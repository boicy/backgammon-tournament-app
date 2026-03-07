# UI Contract: Record Game UX

This document defines the DOM selectors and behaviour contracts for the game-recording inline form after the 008 redesign. All Playwright e2e tests and Vitest DOM tests MUST use these selectors.

---

## Winner Selection Buttons

### Container

| Selector | `[data-winner-grid]` or `.pick-winner-grid` |
|----------|---------------------------------------------|
| Location | Top of the expanded inline game form, inside `[data-game-form]` |
| Contains | Exactly 2 winner buttons — one per player |

### Individual Winner Button

| Attribute | Value | Notes |
|-----------|-------|-------|
| `data-action` | `"pick-winner"` | Delegated click handler key |
| `data-winner-id` | `{playerId}` | The player ID this button selects |
| Text content | Player's name | Rendered via `escapeHtml(player.name)` |
| Class (unselected) | `pick-btn` | Consistent with 006/007 pick patterns |
| Class (selected) | `pick-btn pick-btn--selected` | Applied when this player is `_selectedWinner` |

**Behaviour**:
- Tap unselected button → becomes selected; other button loses `pick-btn--selected`.
- Tap selected button → deselects (both buttons lose `pick-btn--selected`).
- Only one button may have `pick-btn--selected` at a time.

**Removed selector** (DO NOT USE after 008): `[data-game-winner]` (`<select>` element)

---

## Submit / Save Button

| Selector | `[data-action="submit-game"]` |
|----------|-------------------------------|
| Type | `<button type="submit">` or `<button type="button">` |
| Width | 100% of form width |
| Min height | 48px |
| Styling | `btn-primary` amber CTA style |
| Disabled state | Never disabled — validation shows error message instead |

**Behaviour**:
- If `_selectedWinner` is null → show inline error, do not submit.
- If `_selectedWinner` is set → call `recordMatchGame(matchId, selectedWinner, resultType, cubeValue)`; reset `_selectedWinner = null`; collapse form.

---

## Inline Error Message

| Selector | `[data-game-error]` |
|----------|----------------------|
| Visibility | Hidden by default (`display: none` or empty); shown when submission attempted with no winner |
| Content | e.g. `"Please select a winner"` |
| Cleared | When a winner button is tapped, or form closes |

---

## Unchanged Selectors (still present)

| Selector | Purpose |
|----------|---------|
| `[data-action="record-game"]` | Toggle button to expand/collapse the form |
| `[data-result-type]` | Result type `<select>` (standard/gammon/backgammon) |
| `[data-cube-value]` | Cube value `<select>` |
| `[data-game-form]` | Wrapper for the entire inline form (`data-expanded` attr) |

---

## Layout

```
[data-game-form]
  └── .pick-winner-grid          (2-column flex/grid, full-width)
        ├── [data-action="pick-winner"][data-winner-id="p1Id"]  "Alice"
        └── [data-action="pick-winner"][data-winner-id="p2Id"]  "Bob"
  └── [data-game-error]          (inline error, hidden by default)
  └── .form-row                  (result type + cube value selectors)
  └── [data-action="submit-game"]  (full-width primary CTA)
```

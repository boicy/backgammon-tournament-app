# Tap-to-Select Players Design

## Problem

Starting a new match requires picking two players from `<select>` dropdowns. On mobile, this is clunky — native select pickers obscure the screen and require multiple taps. With small rosters (4-8 players), a tap-grid is faster and more satisfying.

## Design

Replace the two dropdown selects with a 2-column grid of player name buttons. Selection is a 3-step flow:

### Step 1: Pick Player 1

Tap "+ New Match" to expand. A grid of player name buttons appears with the prompt "Pick Player 1:". Each button is styled as `btn-secondary`.

### Step 2: Pick Player 2

After tapping a name, that button gets `btn-primary` (selected) styling and becomes disabled. Prompt changes to "Pick Player 2:". Remaining players stay tappable.

### Step 3: Confirm & Start

Both players shown as selected pills with "vs" between them. Unselected players hide. Target input and Start button appear. Tapping either pill deselects that player and returns to the appropriate pick step.

## Visual Reference

```
STEP 1                           STEP 2
Pick Player 1:                   Pick Player 2:

┌──────────┬────────┐            ┌══════════┬────────┐
│  Alice   │  Bob   │            ║  Alice   ║  Bob   │
├──────────┼────────┤            ├══════════╬────────┤
│  Carol   │  Dave  │            ║ (muted)  ║ Carol  │
├──────────┼────────┤            ├══════════╬────────┤
│  Eve     │        │            ║          ║  Eve   │
└──────────┴────────┘            └══════════╩────────┘

STEP 3
  [Alice]  vs  [Bob]
  Target: [ 7 ]  [Start]
```

## Architecture

Pure view change. No store, model, or routing changes.

### Files changed

- `src/views/liveView.js` — replace `newMatchFormHtml()` and event handling
- `styles.css` — add player-pick grid and confirmation row styles
- `tests/e2e/us7-new-match-form.test.js` — update to tap-to-select

### New ephemeral state (module-level in liveView)

- `_pickStep` — `null | 1 | 2 | 'confirm'`
- `_selectedP1` — player ID or null
- `_selectedP2` — player ID or null

### Event delegation

Handle `data-action="pick-player"` with `data-player-id` on the container click listener:

- `_pickStep === 1` — set `_selectedP1`, advance to step 2
- `_pickStep === 2` — set `_selectedP2`, advance to confirm
- `_pickStep === 'confirm'` and tapped a selected pill — deselect, go back

### Form submission

Unchanged — reads P1/P2 IDs and target, calls `startMatch()`. Pulls from `_selectedP1`/`_selectedP2` instead of `<select>` values.

### Error handling

- Same player picked twice: impossible (button disabled after selection)
- Fewer than 2 players: "+ New Match" stays disabled (unchanged)

### What doesn't change

Store, models, router, other views, match cards, game recording.

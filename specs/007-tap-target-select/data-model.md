# Data Model: Tap-to-Select Target Score Grid (007)

## No Persistent Data Changes

This feature introduces no new stored entities. All six `localStorage` keys remain unchanged.

## New Ephemeral View State

One module-level variable is added to `src/views/liveView.js`:

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `_selectedTarget` | `number` | `7` | The currently selected target score in the new-match form. Reset to `7` whenever the form is toggled closed or `render()` is called. |

## Preset Values

The target grid renders exactly these 10 values (odd numbers 3–21):

```
[3, 5, 7, 9, 11, 13, 15, 17, 19, 21]
```

No other values are rendered or accepted via this UI.

## State Transitions

```
Form closed
  → toggle-new-match (open) → _selectedTarget = 7 (reset to default)
  → pick-target (any value) → _selectedTarget = picked value
  → submit start-match-form → uses _selectedTarget; resets to 7
  → toggle-new-match (close) → _selectedTarget = 7 (reset to default)
```

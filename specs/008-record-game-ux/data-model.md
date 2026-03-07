# Data Model: Record Game UX — Winner Tap-Select & Prominent Save

## Persistent Entities (unchanged)

No changes to the persisted data model. The `Game` entity recorded to localStorage is identical to the current model.

### Game (existing — no changes)

| Field | Type | Description |
|-------|------|-------------|
| `winnerId` | string (player ID) | ID of the player who won this game |
| `matchPoints` | number | Calculated: resultTypeMultiplier × cubeValue |
| `resultType` | `'standard'` \| `'gammon'` \| `'backgammon'` | How the game was won |
| `cubeValue` | number (1/2/4/8/16/32/64) | Doubling cube value at game end |

The `winnerId` was previously sourced from `[data-game-winner].value` (a `<select>`). After this feature it is sourced from `_selectedWinner` (module-level ephemeral state). The value written to the store is identical — only the UI input mechanism changes.

---

## Ephemeral UI State (new)

Module-level variable added to `liveView.js`, alongside existing ephemeral state (`_expandedCardId`, `_selectedP1`, `_selectedP2`, `_selectedTarget`, etc.).

### _selectedWinner

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `_selectedWinner` | `string \| null` | `null` | Player ID of the currently selected winner, or null if no selection. |

**Lifecycle**:
- Set to `null` when the inline game form expands (Record Game tapped to open).
- Set to a player ID when the director taps a winner button.
- Toggled back to `null` if the director taps the already-selected winner button (deselect).
- Set to `null` when the form closes (Record Game tapped to close, or game submitted).

**Scope**: Single value — valid because only one inline game form can be open at a time (single-form constraint, `_expandedCardId`).

---

## State Transitions

```
Form closed
    │
    ▼ tap Record Game (open)
_selectedWinner = null
    │
    ├─ tap Player A button ──────────────────► _selectedWinner = playerAId
    │                                               │
    │                                               ├─ tap Player A again ─► _selectedWinner = null
    │                                               │
    │                                               └─ tap Player B ────────► _selectedWinner = playerBId
    │
    ├─ tap Record Game (close) ──────────────► _selectedWinner = null, form closed
    │
    └─ tap Save (winner null) ───────────────► blocked, show inline error, no state change

_selectedWinner = playerAId or playerBId
    │
    └─ tap Save ──────────────────────────────► game recorded, _selectedWinner = null, form closed
```

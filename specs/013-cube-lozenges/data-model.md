# Data Model: 013-cube-lozenges

## Summary

No data model changes. This feature is a pure UI interaction change — the cube value was already stored as a number on each game record and that structure is unchanged.

---

## Existing Entity: Game Record (unchanged)

| Field | Type | Valid Values | Notes |
|-------|------|-------------|-------|
| `winnerId` | string (UUID) | any player ID | unchanged |
| `resultType` | string | `"standard"`, `"gammon"`, `"backgammon"` | unchanged |
| `cubeValue` | integer | 1, 2, 4, 8, 16, 32, 64 | unchanged — user now selects via lozenge instead of dropdown |
| `matchPoints` | integer | derived | `resultTypeMultiplier × cubeValue` — unchanged |
| `sequence` | integer | ≥1 | unchanged |

**Key constraint**: `cubeValue` must be a member of `{1, 2, 4, 8, 16, 32, 64}`. Enforced by `calculateMatchPoints()` in `game.js` (throws on invalid value). This validation is unchanged.

---

## New Ephemeral UI State: `_selectedCubeValue`

This is module-level ephemeral state in `liveView.js` — it is never persisted to localStorage.

| Variable | Type | Default | Lifecycle |
|----------|------|---------|-----------|
| `_selectedCubeValue` | integer | `1` | Initialised at `1`; updated on cube lozenge tap; reset to `1` when the game recording form closes (same lifecycle as `_selectedWinner`) |

**Reset trigger**: Form close (cancel button, or successful game submission) resets `_selectedCubeValue` to `1`.

---

## localStorage Keys (unchanged)

No new keys. No changes to existing key shapes.

| Key | Status |
|-----|--------|
| `backgammon:tournament` | unchanged |
| `backgammon:players` | unchanged |
| `backgammon:matches` | unchanged — game records within matches are unaffected |
| `backgammon:archive` | unchanged |
| `backgammon:roster` | unchanged |
| `backgammon:schedule` | unchanged |

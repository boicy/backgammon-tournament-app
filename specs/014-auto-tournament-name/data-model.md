# Data Model: Auto-Name Tournament by Date and Time

**Feature**: 014-auto-tournament-name
**Date**: 2026-03-07

---

## Changed Entities

### Tournament

No schema change — the `name` field remains a `string`. The change is **behavioural**: the value is now generated automatically at creation time rather than supplied by the user.

```
Tournament {
  id:     string (UUID)         — unique identifier, unchanged
  name:   string                — was: user-entered; now: auto-generated as "HH:mm. dddd, MMM d, yyyy"
  date:   string (ISO-8601)     — creation timestamp, unchanged
  status: "active"              — unchanged
}
```

**Constraints**:
- `name` is generated once at creation and never changed thereafter (not editable by user).
- On Reset Tournament, the tournament entity (including `name`) is preserved unchanged; only `players`, `matches`, `selectedMatchId`, and `schedule` are cleared.
- On End Tournament, the tournament is archived with its auto-generated `name` — no change to archive schema.

---

## No New Entities

This feature introduces no new entities, no new localStorage keys, and no changes to the archive, roster, matches, or players schemas.

---

## localStorage Impact

| Key | Change |
|---|---|
| `backgammon:tournament` | Written at creation with auto-generated name; preserved (re-persisted) on reset |
| `backgammon:players` | Cleared on reset (unchanged behaviour) |
| `backgammon:matches` | Cleared on reset (unchanged behaviour) |
| `backgammon:archive` | Unchanged — archived snapshots retain whatever name was set at creation |
| `backgammon:roster` | Unchanged |

---

## State Lifecycle: `state.tournament` Under Reset

**Before this feature**:
```
resetTournament() → state.tournament = null → router sends to #/start → namePrompt shown
```

**After this feature**:
```
resetTournament() → state.tournament preserved (name intact) → router sends to #/live → live view shown
```

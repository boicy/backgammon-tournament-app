# Data Model: Backgammon Tournament Tracker

**Branch**: `001-tournament-tracker` | **Date**: 2026-03-04

---

## Entities

### Tournament

Represents the overall evening event. Only one active tournament exists at a time.

| Field    | Type                     | Constraints                          |
|----------|--------------------------|--------------------------------------|
| id       | string (UUID)            | Required. `crypto.randomUUID()`      |
| name     | string                   | Required. Non-empty. Max 100 chars.  |
| date     | string (ISO 8601)        | Required. Set at creation.           |
| status   | `"active"` \| `"complete"` | Required. Default: `"active"`.     |

**State transitions**:
- `active` → `complete`: Organizer marks tournament done (future feature; for MVP, `active` is the only state used).
- Reset action: Clears all data (tournament, players, games) and creates a new Tournament record.

**localStorage key**: `backgammon:tournament`

---

### Player

A tournament participant. Performance statistics (wins, losses, match points) are computed from Game records — never stored on the Player entity.

| Field | Type          | Constraints                                                          |
|-------|---------------|----------------------------------------------------------------------|
| id    | string (UUID) | Required. `crypto.randomUUID()`                                      |
| name  | string        | Required. Non-empty. Max 50 chars. Unique within tournament (case-insensitive). |

**Validation rules**:
- Duplicate names (case-insensitive) are rejected.
- A player cannot be removed if any recorded Game references their id.

**localStorage key**: `backgammon:players` (stored as a JSON array)

---

### Game

A single completed backgammon game. The authoritative record for all scoring and standings computation.

| Field       | Type                                        | Constraints                                                              |
|-------------|---------------------------------------------|--------------------------------------------------------------------------|
| id          | string (UUID)                               | Required. `crypto.randomUUID()`                                          |
| player1Id   | string (UUID → Player)                      | Required. Must reference an existing Player.                             |
| player2Id   | string (UUID → Player)                      | Required. Must reference an existing Player. Must differ from player1Id. |
| winnerId    | string (UUID → Player)                      | Required. Must equal player1Id or player2Id.                             |
| resultType  | `"standard"` \| `"gammon"` \| `"backgammon"` | Required.                                                               |
| cubeValue   | `1 \| 2 \| 4 \| 8 \| 16 \| 32 \| 64`       | Required. Default: `1` (cube not used).                                  |
| matchPoints | integer                                     | Required. Computed and stored: `resultTypeMultiplier × cubeValue`. See scoring table below. |
| timestamp   | integer (Unix epoch ms)                     | Required. `Date.now()` at record time.                                   |
| sequence    | integer                                     | Required. Monotonically increasing within the tournament. Used for display ordering. |

**Scoring formula**:

| resultType  | multiplier | cubeValue=1 | cubeValue=2 | cubeValue=4 | cubeValue=8 | cubeValue=16 | cubeValue=32 | cubeValue=64 |
|-------------|-----------|-------------|-------------|-------------|-------------|--------------|--------------|--------------|
| standard    | 1         | 1           | 2           | 4           | 8           | 16           | 32           | 64           |
| gammon      | 2         | 2           | 4           | 8           | 16          | 32           | 64           | 128          |
| backgammon  | 3         | 3           | 6           | 12          | 24          | 48           | 96           | 192          |

`matchPoints = resultTypeMultiplier × cubeValue`

**Validation rules**:
- `player1Id ≠ player2Id`
- `winnerId ∈ { player1Id, player2Id }`
- `cubeValue ∈ { 1, 2, 4, 8, 16, 32, 64 }`
- Both players must exist in the current player list.

**Deletion**: A game can be deleted. Standings are recalculated from remaining games after deletion.

**localStorage key**: `backgammon:games` (stored as a JSON array, ordered by sequence)

---

### Standing *(derived — never stored)*

A computed ranking entry. Always derived fresh from the current Player and Game arrays. Never persisted to localStorage.

| Field       | Type          | Derivation                                                             |
|-------------|---------------|------------------------------------------------------------------------|
| playerId    | string (UUID) | From Player.                                                          |
| name        | string        | From Player.name.                                                     |
| matchPoints | integer       | Sum of `game.matchPoints` for all games where `game.winnerId = playerId`. |
| wins        | integer       | Count of games where `game.winnerId = playerId`.                      |
| losses      | integer       | Count of games where the player is the loser.                         |
| gamesPlayed | integer       | `wins + losses`.                                                      |
| rank        | integer       | Position in sorted standings (1 = highest).                           |

**Sort order**: Descending by `matchPoints`. Tiebreaker: ascending by `losses` (fewer losses ranks higher). If both equal, players share the rank (both shown as tied).

---

## Relationships

```
Tournament (1) ──── (many) Player
Tournament (1) ──── (many) Game
Player     (1) ──── (many) Game  [as player1 or player2]
Player     (1) ──── (many) Game  [as winner]
Game       ────────────────────► Standing [derived]
```

---

## localStorage Schema

```js
// Key: "backgammon:tournament"
{
  "id": "uuid",
  "name": "Friday Night Backgammon",
  "date": "2026-03-04T00:00:00.000Z",
  "status": "active"
}

// Key: "backgammon:players"
[
  { "id": "uuid", "name": "Alice" },
  { "id": "uuid", "name": "Bob" }
]

// Key: "backgammon:games"
[
  {
    "id": "uuid",
    "player1Id": "uuid",
    "player2Id": "uuid",
    "winnerId": "uuid",
    "resultType": "gammon",
    "cubeValue": 4,
    "matchPoints": 8,
    "timestamp": 1741046400000,
    "sequence": 1
  }
]
```

---

## Integrity Constraints (enforced by model layer)

1. A Player with `gamesPlayed > 0` MUST NOT be deletable.
2. `Game.matchPoints` MUST equal `resultTypeMultiplier(resultType) × cubeValue` at all times.
3. Standing computation MUST iterate all Games in the current store — never use a cached intermediate value.
4. A reset operation MUST clear all three localStorage keys atomically (no partial state).

---

## Test Coverage Requirements (TDD — Integrity Gate)

The following combinations MUST have unit tests written before implementation:

- **Scoring formula**: All 21 combinations (3 result types × 7 cube values) must be tested via `calculateMatchPoints(resultType, cubeValue)`.
- **Standing derivation**: Test with 0 games, 1 game, multiple games per player, tied match points (verify tiebreaker), deleted game recalculation.
- **Player validation**: Duplicate name (same case), duplicate name (different case), empty name, name at max length.
- **Game validation**: `player1Id === player2Id`, `winnerId` not in game, invalid `cubeValue`, missing required fields.

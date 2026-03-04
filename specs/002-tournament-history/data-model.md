# Data Model: Named Tournaments & History

**Branch**: `002-tournament-history` | **Date**: 2026-03-04

Extends the data model from `specs/001-tournament-tracker/data-model.md`. Unchanged entities (Player, Game, Standing) are not repeated here.

---

## Updated Entities

### Tournament *(updated)*

The `name` field is now required and must be non-empty. No other fields change.

| Field  | Type                       | Constraints                          |
|--------|----------------------------|--------------------------------------|
| id     | string (UUID)              | Required. `crypto.randomUUID()`      |
| name   | string                     | **Required. Non-empty. Max 100 chars.** (was optional placeholder in 001) |
| date   | string (ISO 8601)          | Required. Set at creation.           |
| status | `"active"` \| `"complete"` | Required. Default: `"active"`.       |

**Validation rules** (new):
- Name must be non-empty (whitespace-only rejected).
- Name max 100 characters.
- Duplicate tournament names are allowed — date distinguishes them in the archive.

**localStorage key**: `backgammon:tournament` — unchanged.

---

## New Entities

### TournamentSnapshot

An immutable record of a completed tournament captured at the moment it is archived. Written once; never mutated.

| Field          | Type                  | Constraints                                                    |
|----------------|-----------------------|----------------------------------------------------------------|
| id             | string (UUID)         | Required. Copied from the archived Tournament.id.              |
| name           | string                | Required. Copied from Tournament.name.                         |
| date           | string (ISO 8601)     | Required. Copied from Tournament.date.                         |
| archivedAt     | integer (Unix epoch ms) | Required. `Date.now()` at the moment of archiving.          |
| players        | Player[]              | Required. Full copy of the player array at archive time.       |
| games          | Game[]                | Required. Full copy of the game array at archive time.         |
| finalStandings | Standing[]            | Required. Pre-computed via `deriveStandings(players, games)` at archive time. |
| winnerName     | string \| null        | Required. Name of the player ranked first in finalStandings; `null` if standings are empty. |
| gameCount      | integer               | Required. `games.length`. Stored for fast list rendering.      |

**Invariants**:
- `players`, `games`, `finalStandings` are deep copies — no shared references with active tournament state.
- A snapshot is created only when the tournament has ≥1 player AND ≥1 game (FR-014).
- Once stored, the snapshot object is never modified.

**localStorage key**: `backgammon:archive` (array of TournamentSnapshot, ordered by `archivedAt` ascending; newest is last).

---

### PlayerRoster

A persistent, deduplicated list of all player name strings encountered across all tournaments.

| Field | Type     | Constraints                                      |
|-------|----------|--------------------------------------------------|
| names | string[] | Required. Deduplicated (case-insensitive). Ordered by first-seen. |

**Invariants**:
- Deduplication is case-insensitive: adding "alice" when "Alice" exists is a no-op.
- Names are stored in their original capitalisation (first occurrence wins for storage; display uses most recent tournament — see AllTimeStanding).
- Roster is additive only — names are never removed.
- Updated immediately when a player is added via `addPlayer()`.

**localStorage key**: `backgammon:roster` (stored as a JSON array of strings).

---

### AllTimeStanding *(derived — never stored)*

A computed cross-tournament ranking entry. Derived on demand by `deriveAllTimeStandings()`. Never persisted.

| Field              | Type    | Derivation                                                                                  |
|--------------------|---------|---------------------------------------------------------------------------------------------|
| name               | string  | Player name. Taken from the most recent tournament the player participated in.              |
| tournamentWins     | integer | Count of tournaments where this player's `finalStandings[0].name` (case-insensitive) matches. |
| cumulativePoints   | integer | Sum of `matchPoints` earned as winner across all tournaments (archived + active).            |
| tournamentsPlayed  | integer | Count of tournaments (archived + active) where the player appears in any Standing entry.     |
| rank               | integer | Position in sorted All-Time standings (1 = highest).                                        |

**Sort order**: Descending by `tournamentWins`. Tiebreaker: descending by `cumulativePoints`.

**Player identity rule**: Two player names from different tournaments are the same person if and only if `name.trim().toLowerCase()` matches. The display name shown in the All-Time leaderboard is taken from the most recent tournament in which they appear.

---

## Relationships

```
TournamentSnapshot (1) ──── (copy) Player[]
TournamentSnapshot (1) ──── (copy) Game[]
TournamentSnapshot (1) ──── (derived+stored) Standing[]  [finalStandings]

Tournament (active) + TournamentSnapshot[] + Player[] + Game[]
  → AllTimeStanding[]  [derived on demand by deriveAllTimeStandings()]

addPlayer(name) → PlayerRoster (append if new)
```

---

## localStorage Schema (complete — all 5 keys)

```js
// Key: "backgammon:tournament"  (unchanged from 001 — name field now required)
{
  "id": "uuid",
  "name": "April Club Night",
  "date": "2026-04-01T00:00:00.000Z",
  "status": "active"
}

// Key: "backgammon:players"  (unchanged)
[
  { "id": "uuid", "name": "Alice" },
  { "id": "uuid", "name": "Bob" }
]

// Key: "backgammon:games"  (unchanged)
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

// Key: "backgammon:archive"  (NEW)
[
  {
    "id": "uuid",
    "name": "March Club Night",
    "date": "2026-03-04T00:00:00.000Z",
    "archivedAt": 1741132800000,
    "players": [
      { "id": "uuid", "name": "Alice" },
      { "id": "uuid", "name": "Bob" }
    ],
    "games": [
      {
        "id": "uuid",
        "player1Id": "uuid",
        "player2Id": "uuid",
        "winnerId": "uuid",
        "resultType": "standard",
        "cubeValue": 1,
        "matchPoints": 1,
        "timestamp": 1741046400000,
        "sequence": 1
      }
    ],
    "finalStandings": [
      { "playerId": "uuid", "name": "Alice", "matchPoints": 1, "wins": 1, "losses": 0, "gamesPlayed": 1, "rank": 1 },
      { "playerId": "uuid", "name": "Bob",   "matchPoints": 0, "wins": 0, "losses": 1, "gamesPlayed": 1, "rank": 2 }
    ],
    "winnerName": "Alice",
    "gameCount": 1
  }
]

// Key: "backgammon:roster"  (NEW)
["Alice", "Bob", "Charlie"]
```

---

## Integrity Constraints

1. A `TournamentSnapshot` MUST only be created when `players.length >= 1` AND `games.length >= 1`.
2. `TournamentSnapshot.finalStandings` MUST equal `deriveStandings(snapshot.players, snapshot.games)` at the time of creation.
3. `TournamentSnapshot.winnerName` MUST equal `finalStandings[0].name` when standings are non-empty, or `null` when empty.
4. `TournamentSnapshot.gameCount` MUST equal `snapshot.games.length`.
5. `PlayerRoster` entries MUST be deduplicated case-insensitively before appending.
6. `AllTimeStanding` MUST always include the active tournament's in-progress results without requiring archiving (FR-010).
7. `endTournament()` MUST NOT archive a tournament with 0 players or 0 games — data is discarded silently (FR-014).

---

## Test Coverage Requirements (TDD)

### tournamentSnapshot.test.js

- `createSnapshot(tournament, players, games)`:
  - Returns a snapshot with correct id, name, date, archivedAt, players copy, games copy.
  - `finalStandings` equals `deriveStandings(players, games)`.
  - `winnerName` equals first-ranked player's name; `null` when standings empty.
  - `gameCount` equals `games.length`.
  - Snapshot players/games are deep copies — mutating originals does not affect snapshot.
- `snapshotWinner(snapshot)`:
  - Returns name of first-ranked player; `null` for empty standings.

### allTimeStanding.test.js

- `deriveAllTimeStandings(archive, activeTournament, activePlayers, activeGames)`:
  - Single archived tournament, no active games → correct wins, points, tournamentsPlayed.
  - Two archived tournaments, different winners → both players ranked correctly.
  - Two players with same tournament wins → tiebreaker: higher cumulativePoints ranks first.
  - Active tournament's in-progress results included without archiving.
  - Player names matched case-insensitively ("Alice" + "alice" → merged, one entry).
  - Player in only some tournaments → tournamentsPlayed reflects participation subset.
  - Empty archive + no active games → returns standings with 0 wins (FR-015 pre-archive state).
  - Display name taken from most recent tournament occurrence.

### store.test.js *(additions)*

- `endTournament()`:
  - With 1+ players and 1+ games: appends snapshot to archive; clears active tournament.
  - With 0 games: discards without archiving; clears active tournament.
  - With 0 players: discards without archiving; clears active tournament.
  - Emits `state:archive:changed` and `state:reset`.
- `initTournament(name)` auto-archive:
  - When called with active tournament that has players + games: archives first, then creates new tournament.
  - When called with empty active tournament: skips archiving.
- `addPlayer(name)` roster update:
  - New name added to roster.
  - Existing name (same case): roster unchanged.
  - Existing name (different case): roster unchanged.
- `loadFromStorage()`:
  - Loads `backgammon:archive` and `backgammon:roster` in addition to existing keys.
  - Handles missing archive key (defaults to `[]`).
  - Handles missing roster key (defaults to `[]`).

# Data Model: Match-Mode Tournament Nights

**Branch**: `003-match-mode` | **Date**: 2026-03-05

---

## localStorage Keys

| Key | Status | Description |
|-----|--------|-------------|
| `backgammon:tournament` | Unchanged | Active tournament metadata |
| `backgammon:players` | Unchanged | Players registered for the active night |
| `backgammon:matches` | **NEW** | Active night's match array (replaces `backgammon:games`) |
| `backgammon:games` | Retired (active use) | Flat game array — still present in legacy archives; no longer written for new tournaments |
| `backgammon:archive` | Unchanged | Array of `TournamentSnapshot` objects |
| `backgammon:roster` | Unchanged | Persistent player name suggestions |

---

## Entities

### Tournament (unchanged)

```js
{
  id: string,         // crypto.randomUUID()
  name: string,       // e.g. "March Club Night"
  date: string,       // ISO 8601
  status: 'active'
}
```

### Player (unchanged)

```js
{
  id: string,         // crypto.randomUUID()
  name: string        // display name, unique within the night
}
```

### Match (NEW)

```js
{
  id: string,             // crypto.randomUUID()
  player1Id: string,      // ref → Player.id
  player2Id: string,      // ref → Player.id
  targetScore: number,    // integer >= 1
  status: 'active' | 'complete' | 'abandoned',
  winnerId: string|null,  // null until complete
  startedAt: number,      // Date.now()
  completedAt: number|null,
  games: Game[]           // ordered list, embedded
}
```

**Validation rules**:
- `player1Id !== player2Id`
- `targetScore >= 1`
- Neither player may appear in another match with `status: 'active'`
- Games may only be added when `status === 'active'`

**State transitions**:
```
active → complete    (auto, when either player's cumulative points >= targetScore)
active → abandoned   (manual, organiser action; no win/loss credited)
```

### Game (within a Match — unchanged shape)

```js
{
  id: string,           // crypto.randomUUID()
  player1Id: string,    // same as parent match
  player2Id: string,
  winnerId: string,
  resultType: 'standard' | 'gammon' | 'backgammon',
  cubeValue: 1|2|4|8|16|32|64,
  matchPoints: number,  // resultType × cubeValue
  timestamp: number,    // Date.now()
  sequence: number      // 1-based within the match
}
```

### TournamentSnapshot (extended)

```js
{
  // --- Unchanged fields ---
  id: string,
  name: string,
  date: string,
  archivedAt: number,
  players: Player[],
  finalStandings: Standing[],   // derived from match data
  winnerName: string|null,

  // --- Changed field ---
  gameCount: number,            // total games across all matches

  // --- New field ---
  matches: MatchSummary[],      // completed + abandoned matches

  // --- Legacy field (absent in new snapshots) ---
  // games: Game[]               // only present in pre-003 snapshots
}
```

`MatchSummary` (what gets archived per match):
```js
{
  id: string,
  player1Id: string,
  player2Id: string,
  targetScore: number,
  status: 'complete' | 'abandoned',
  winnerId: string|null,
  startedAt: number,
  completedAt: number|null,
  games: Game[]
}
```

### Standing (unchanged shape — used in finalStandings)

```js
{
  rank: number,
  name: string,
  matchPoints: number,   // total points scored across all matches (for all games)
  wins: number,          // match wins (changed semantic: was game wins, now match wins)
  losses: number         // match losses (changed semantic: was game losses, now match losses)
}
```

> **Backward compatibility note**: `wins`/`losses` in pre-003 snapshots referred to individual game wins/losses. In 003+ snapshots they refer to match wins/losses. `deriveAllTimeStandings` only reads `matchPoints` and `finalStandings[0].name`, so it is unaffected by this semantic change.

---

## In-Memory State (store.js)

```js
state = {
  tournament: Tournament | null,
  players: Player[],
  matches: Match[],             // NEW — replaces games[]
  selectedMatchId: string|null, // NEW — drives #/match view
  schedule: null,               // kept (round-robin, existing feature)
  archive: TournamentSnapshot[],
  roster: string[],
}
```

---

## Derived Data

### `deriveMatchStandings(players, matches)` → `Standing[]`

Pure function. Only considers `complete` matches.

```
for each player:
  wins  = count of complete matches where winnerId === player.id
  losses = count of complete matches where player participated AND winnerId !== player.id
  points = sum of matchPoints for all games in all matches where winnerId === player.id

sort: wins DESC, then points DESC
```

### `isMatchComplete(match)` → `boolean`

```
p1Points = sum(game.matchPoints for game where game.winnerId === match.player1Id)
p2Points = sum(game.matchPoints for game where game.winnerId === match.player2Id)
return p1Points >= match.targetScore || p2Points >= match.targetScore
```

### `matchWinner(match)` → `string|null`

Returns the `playerId` of the first player to reach `targetScore`, or `null` if neither has.

---

## Migration / Backward Compatibility

- Old archives (`games` field, no `matches` field): read correctly by `deriveAllTimeStandings` — no migration needed.
- New archives (`matches` field, no top-level `games` field): read correctly by the same function via `finalStandings`.
- The Club tab archive detail view detects the archive format by checking for `snapshot.matches` and renders appropriately.

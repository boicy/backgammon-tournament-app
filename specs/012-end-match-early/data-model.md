# Data Model: 012-end-match-early

## Existing Entities (unchanged shape except Match)

### Match (modified)

```
{
  id:          string  (UUID)
  player1Id:   string  (player UUID)
  player2Id:   string  (player UUID)
  targetScore: number  (integer >= 1)
  status:      'active' | 'complete' | 'abandoned'
  winnerId:    string | null   (null = no winner; for early-ended tied or 0-game abandon)
  startedAt:   number  (Date.now() timestamp)
  completedAt: number | null
  games:       Game[]
  endedEarly:  boolean         ← NEW FIELD (default false / omitted for existing records)
}
```

**New field**: `endedEarly: true` is set only when `endMatchEarly()` is called and games have been recorded. Matches created before this feature will have `endedEarly` as `undefined`, which is falsy — backward-compatible.

**Status transitions**:
```
active ──record games──► complete   (natural: target score reached, endedEarly omitted/false)
active ──endMatchEarly (1+ games)──► complete   (endedEarly: true, winnerId = leader or null if tied)
active ──endMatchEarly (0 games)──► abandoned   (endedEarly omitted, winnerId null — same as current abandonMatch)
active ──abandonMatch──► abandoned  (existing path, unchanged)
```

### Game (unchanged)

```
{
  id:          string
  player1Id:   string
  player2Id:   string
  winnerId:    string
  resultType:  'standard' | 'gammon' | 'backgammon'
  cubeValue:   1 | 2 | 4 | 8 | 16 | 32 | 64
  matchPoints: number   (resultType multiplier × cubeValue)
  sequence:    number
  playedAt:    number
}
```

### Standing (derived — updated logic)

Derived by `deriveMatchStandings(players, matches)` in `src/models/matchStanding.js`.

**Current loss logic** (has latent bug):
```js
losses = completed.filter(
  m => (m.player1Id === player.id || m.player2Id === player.id) && m.winnerId !== player.id
).length
```

**Fixed loss logic** (this feature):
```js
losses = completed.filter(
  m => (m.player1Id === player.id || m.player2Id === player.id)
    && m.winnerId !== player.id
    && m.winnerId !== null      // ← guard: tied early-end = no loss for either player
).length
```

**No change to win logic** — `m.winnerId === player.id` already handles null correctly (null ≠ any playerId).

---

## New Model Function

### `earlyMatchWinner(match)` — `src/models/match.js`

```
Input:  match (Match object with games[])
Output: string | null
  - playerId of leader by accumulated match points
  - null if tied (both equal, including 0-0)
```

Logic mirrors `matchWinner()` but uses `>` instead of `>=` (no target score check):
```js
if (p1Points > p2Points) return match.player1Id;
if (p2Points > p1Points) return match.player2Id;
return null;  // tie or no games
```

---

## New Store Action

### `endMatchEarly(matchId)` — `src/store/store.js`

```
Input:  matchId (string)
Throws: 'Match not found' | 'Match is not active'
Side effects:
  - If match.games.length === 0:
      → same as abandonMatch: status = 'abandoned', winnerId = null
  - If match.games.length >= 1:
      → status = 'complete', endedEarly = true,
        winnerId = earlyMatchWinner(match),
        completedAt = Date.now()
  → persist matches to localStorage
  → emit 'state:matches:changed'
  → emit 'state:standings:changed'
```

---

## No localStorage Key Changes

All data is stored under the existing `backgammon:matches` key. The new `endedEarly` field is additive and backward-compatible with existing stored match records (missing field reads as `undefined`, which is falsy).

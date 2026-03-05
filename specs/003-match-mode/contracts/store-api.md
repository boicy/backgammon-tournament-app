# Store API Contract: Match-Mode

**Branch**: `003-match-mode` | **Date**: 2026-03-05

All functions are exported from `src/store/store.js`.

---

## State shape (getState)

```js
getState() → {
  tournament: Tournament | null,
  players: Player[],
  matches: Match[],
  selectedMatchId: string | null,
  standings: Standing[],       // derived: deriveMatchStandings(players, matches)
  schedule: object[] | null,   // unchanged
  archive: TournamentSnapshot[],
  roster: string[],
}
```

---

## Actions

### Unchanged actions

| Action | Signature | Notes |
|--------|-----------|-------|
| `initTournament` | `(name: string) → void` | Same behaviour; auto-archives if matches exist (not games) |
| `addPlayer` | `(name: string) → void` | Unchanged |
| `removePlayer` | `(playerId: string) → void` | Throws if player has active match |
| `endTournament` | `() → void` | Archives from matches, not games |

### New actions

#### `startMatch(player1Id, player2Id, targetScore)`

```
Preconditions:
  - tournament !== null
  - player1Id and player2Id are valid, distinct player IDs
  - neither player has a match with status 'active'
  - targetScore >= 1

Effect:
  - creates a Match with status 'active', games: []
  - appends to state.matches
  - persists to backgammon:matches
  - emits 'state:matches:changed'

Throws:
  - 'Player not found'
  - 'Players must be different'
  - 'Player already in an active match' (FR-012)
  - 'Target score must be at least 1'
```

#### `recordMatchGame(matchId, gameData)`

```
Preconditions:
  - match exists with status 'active'
  - gameData.player1Id and player2Id match the match's players
  - gameData.winnerId is one of the two players

Effect:
  - creates a Game (via createGame), embeds it in match.games
  - if isMatchComplete(match): sets status 'complete', winnerId, completedAt
  - persists to backgammon:matches
  - emits 'state:matches:changed'
  - emits 'state:standings:changed'

Throws:
  - 'Match not found'
  - 'Match is not active'
  - 'Invalid player for this match'
  - (plus createGame validation errors)
```

#### `abandonMatch(matchId)`

```
Preconditions:
  - match exists with status 'active'

Effect:
  - sets match.status = 'abandoned'
  - persists to backgammon:matches
  - emits 'state:matches:changed'
  - emits 'state:standings:changed'

Throws:
  - 'Match not found'
  - 'Match is not active'
```

#### `selectMatch(matchId | null)`

```
Effect:
  - sets state.selectedMatchId
  - does NOT persist (session UI state only)
  - emits 'state:selectedMatch:changed'
```

---

## Event Bus Events

| Event | Payload | When |
|-------|---------|------|
| `state:matches:changed` | `{ matches }` | After startMatch, recordMatchGame, abandonMatch |
| `state:standings:changed` | `{ standings }` | After recordMatchGame, abandonMatch |
| `state:selectedMatch:changed` | `{ matchId }` | After selectMatch |
| `state:players:changed` | `{ players }` | After addPlayer, removePlayer (unchanged) |
| `state:reset` | — | After initTournament, endTournament (unchanged) |

---

## Route → View contract

| Route | View file | Reads from state |
|-------|-----------|-----------------|
| `#/start` | `namePrompt.js` | — |
| `#/players` | `matchHub.js` | `players`, `matches`, `standings` |
| `#/match` | `matchDetail.js` | `selectedMatchId`, `matches`, `players` |
| `#/leaderboard` | `leaderboard.js` | `standings` (match-based) |
| `#/history` | `gameHistory.js` | `matches` (all games across all matches) |
| `#/club` | `club.js` | `archive` (unchanged) |
| `#/record` | — | Redirects to `#/players` |

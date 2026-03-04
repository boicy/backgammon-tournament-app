# Contract: Store API (Updated)

**Branch**: `002-tournament-history` | **Date**: 2026-03-04

Extends the store contract from `specs/001-tournament-tracker/contracts/store-api.md`. Unchanged actions and events are not repeated. This document describes only additions and modifications.

---

## Updated Read Interface

### `getState() → AppState` *(updated)*

Returns a snapshot of current application state, now including archive and roster.

```js
// Returns (additions shown with NEW marker):
{
  tournament: Tournament | null,
  players:    Player[],
  games:      Game[],
  standings:  Standing[],            // unchanged — always freshly computed
  archive:    TournamentSnapshot[],  // NEW — copy of archived tournaments
  roster:     string[],              // NEW — copy of persistent player name list
}
```

`archive` is ordered by `archivedAt` ascending (index 0 = oldest). Callers must not cache the returned object between event cycles.

---

## Updated Actions

### `initTournament(name: string) → void` *(updated)*

Creates a new active tournament. If the currently active tournament has ≥1 player AND ≥1 game, it is automatically archived before the new tournament is created.

**Preconditions**: `name` must be non-empty and ≤100 characters (whitespace-only rejected).
**Postconditions**:
- If current tournament was archiveable: snapshot appended to archive; `backgammon:archive` persisted; roster updated with any new player names.
- Active tournament, players, and games reset; new Tournament record created with `status: "active"`.
- `backgammon:tournament`, `backgammon:players`, `backgammon:games` written to localStorage.
**Emits**: `state:archive:changed` (only if auto-archived), `state:reset`
**Throws**: `Error("Tournament name is required")` | `Error("Tournament name too long")`

---

### `addPlayer(name: string) → void` *(updated)*

Adds a player to the tournament. Additionally updates the persistent roster if the name is new.

**Preconditions**: Tournament must exist. Name must be non-empty, ≤50 chars, and unique within the tournament (case-insensitive).
**Postconditions**: Player appended to players array; localStorage updated. If the name (normalised to lowercase) is not already in `state.roster`, it is appended to `state.roster` and `backgammon:roster` is persisted.
**Emits**: `state:players:changed`
**Throws**: `Error("Player name already exists")` | `Error("Player name is required")`

---

## New Actions

### `endTournament() → void`

Archives the active tournament (if it has ≥1 player AND ≥1 game) and clears all active tournament data. If the active tournament has no players or no games, the data is discarded without archiving.

**Preconditions**: None (safe to call at any time; gracefully handles empty or null tournament).
**Postconditions**:
- If archiveable: `TournamentSnapshot` created and appended to `state.archive`; `backgammon:archive` persisted.
- Active tournament, players, and games set to null/empty; `backgammon:tournament`, `backgammon:players`, `backgammon:games` cleared from localStorage.
**Emits**: `state:archive:changed` (if archived), `state:reset`
**Does not throw**: Silently discards non-archiveable tournaments.

---

## Event Bus Contract (additions)

| Event                    | When emitted                                   | Typical subscriber |
|--------------------------|------------------------------------------------|--------------------|
| `state:archive:changed`  | Tournament archived (via `endTournament()` or auto-archive in `initTournament()`) | Club view |

Existing events (`state:players:changed`, `state:games:changed`, `state:standings:changed`, `state:reset`, `state:schedule:changed`) are unchanged.

---

## Updated `loadFromStorage()` Behaviour

`loadFromStorage()` now reads two additional localStorage keys:

```js
state = {
  tournament: ...,   // backgammon:tournament
  players: ...,      // backgammon:players
  games: ...,        // backgammon:games
  schedule: null,    // not persisted
  archive: ...,      // NEW — backgammon:archive (defaults to [] if missing)
  roster: ...,       // NEW — backgammon:roster (defaults to [] if missing)
};
```

---

## New Model Functions

### `createSnapshot(tournament, players, games) → TournamentSnapshot`

Pure function. Creates an immutable snapshot record.

```js
// Returns:
{
  id:             tournament.id,
  name:           tournament.name,
  date:           tournament.date,
  archivedAt:     Date.now(),
  players:        deepCopy(players),
  games:          deepCopy(games),
  finalStandings: deriveStandings(players, games),
  winnerName:     finalStandings[0]?.name ?? null,
  gameCount:      games.length,
}
```

**Throws**: None. Caller is responsible for ensuring `players.length >= 1` and `games.length >= 1`.

---

### `deriveAllTimeStandings(archive, activeTournament, activePlayers, activeGames) → AllTimeStanding[]`

Pure function. Derives the cross-tournament All-Time leaderboard.

```js
// Parameters:
archive:          TournamentSnapshot[],
activeTournament: Tournament | null,
activePlayers:    Player[],
activeGames:      Game[],

// Returns:
AllTimeStanding[]  // sorted: tournamentWins DESC, cumulativePoints DESC
```

**Identity rule**: Players are matched across tournaments using `name.trim().toLowerCase()`.

**Active tournament handling**: If `activeTournament !== null`, the active tournament's current standings are computed from `activePlayers` and `activeGames` and merged into the result. Tournament wins from the active tournament are NOT counted (a tournament win is only credited when a tournament is archived). However, cumulative match points from the active tournament ARE included (per FR-010: "reflects the current active tournament's in-progress results").

**Empty archive**: Returns current players with 0 wins and 0 archived points (plus any in-progress points from active tournament).

---

## View Module Contract *(unchanged)*

All views export `render(container)`, `onMount(container)`, `onUnmount()`. The new `namePrompt.js` and `club.js` views follow the same contract. See `specs/001-tournament-tracker/contracts/store-api.md` for the full contract.

---

## Router Guard Contract

The router checks `getState().tournament === null` before rendering any view. If null, it navigates to `#/start` (namePrompt view) regardless of the requested route. This guard prevents the players, record, leaderboard, history, and club views from rendering without an active tournament context (club still renders correctly, but the active tournament stats section requires a non-null tournament).

Exception: `#/start` itself and `#/club` are valid even without an active tournament.

# Contract: Store API

**Branch**: `001-tournament-tracker` | **Date**: 2026-03-04

The store is the single source of truth for all tournament state. Views interact with state exclusively through the store's exported functions. Direct state mutation from outside the store is prohibited.

---

## Read Interface

### `getState() → AppState`

Returns a snapshot of current application state including derived standings.

```js
// Returns:
{
  tournament: Tournament | null,
  players: Player[],
  games: Game[],
  standings: Standing[]   // always freshly computed — never stale
}
```

Standings are derived on every call. Callers must not cache the returned object between event cycles.

---

## Write Interface (Actions)

### `initTournament(name: string) → void`

Creates a new tournament with the given name and today's date. Clears any existing tournament, player, and game data.

**Preconditions**: None.
**Postconditions**: localStorage cleared; new Tournament record created with `status: "active"`.
**Emits**: `state:reset`

---

### `addPlayer(name: string) → void`

Adds a player to the tournament.

**Preconditions**: Tournament must exist. Name must be non-empty, ≤50 chars, and unique (case-insensitive).
**Postconditions**: Player appended to players array; localStorage updated.
**Emits**: `state:players:changed`
**Throws**: `Error("Player name already exists")` | `Error("Player name is required")`

---

### `removePlayer(playerId: string) → void`

Removes a player from the tournament.

**Preconditions**: Player must exist. Player must have zero recorded games.
**Postconditions**: Player removed from players array; localStorage updated.
**Emits**: `state:players:changed`
**Throws**: `Error("Cannot remove a player with recorded games")`

---

### `recordGame(gameData: GameInput) → void`

Records the result of a completed game.

```js
// GameInput shape:
{
  player1Id:  string,                                     // UUID of first player
  player2Id:  string,                                     // UUID of second player (≠ player1Id)
  winnerId:   string,                                     // must equal player1Id or player2Id
  resultType: "standard" | "gammon" | "backgammon",
  cubeValue:  1 | 2 | 4 | 8 | 16 | 32 | 64              // default: 1
}
```

**Preconditions**: Both players must exist. `player1Id ≠ player2Id`. `winnerId ∈ { player1Id, player2Id }`. `cubeValue` must be a valid value.
**Postconditions**: Game appended to games array with computed `matchPoints` and `sequence`; localStorage updated.
**Emits**: `state:games:changed`, `state:standings:changed`
**Throws**: `Error("Invalid game data: <reason>")`

---

### `deleteGame(gameId: string) → void`

Removes a recorded game. Standings are automatically recalculated.

**Preconditions**: Game must exist.
**Postconditions**: Game removed from games array; localStorage updated; standings recomputed on next `getState()` call.
**Emits**: `state:games:changed`, `state:standings:changed`
**Throws**: `Error("Game not found")`

---

### `resetTournament() → void`

Clears all tournament data. Equivalent to starting a fresh evening.

**Preconditions**: None.
**Postconditions**: All three localStorage keys cleared; in-memory state reset to empty.
**Emits**: `state:reset`

---

## Event Bus Contract

Views subscribe to state events via `eventBus.on(event, handler)` in `onMount()` and unsubscribe in `onUnmount()`.

| Event                     | When emitted                                  | Typical subscriber   |
|---------------------------|-----------------------------------------------|----------------------|
| `state:players:changed`   | Player added or removed                       | Player list view, Record Game view (player dropdowns) |
| `state:games:changed`     | Game recorded or deleted                      | Game history view    |
| `state:standings:changed` | Game recorded or deleted (standings affected) | Leaderboard view     |
| `state:reset`             | Tournament reset or re-initialized            | All views            |

---

## View Module Contract

Every view module in `src/views/` MUST export these three functions:

```js
// Renders the full view into `container` (replaces innerHTML)
export function render(container: HTMLElement): void

// Called after render(). Subscribes to eventBus events. Attaches delegated event listeners.
export function onMount(container: HTMLElement): void

// Called before navigating away. Unsubscribes all eventBus listeners attached in onMount().
export function onUnmount(): void
```

**Invariant**: `onMount` is always called after `render`. `onUnmount` is always called before the next `render`. A view must not leak event listeners across navigation cycles.

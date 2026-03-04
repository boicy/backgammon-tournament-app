# Research: Backgammon Tournament Tracker

**Branch**: `001-tournament-tracker` | **Date**: 2026-03-04

---

## Decision 1: Test Runner

**Decision**: Vitest with `jsdom` environment

**Rationale**: Vitest requires Vite as a transitive peer dependency, but Vite is only used at test-run time — it never touches production files. The production deployment remains plain HTML/CSS/JS with no build step. Vitest offers first-class ESM support, a `describe/it/expect` API ideal for TDD, a watch mode that works with native ES modules today, and a `jsdom` environment for testing localStorage and DOM APIs. Configuration is 6 lines.

**Setup**:
```json
// package.json
{
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```
```js
// vitest.config.js
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
  },
});
```

**Alternatives considered**:
- `node:test` (built-in): Zero deps, but no watch mode for ESM, `assert`-based API is less ergonomic for TDD
- Jest: Still marks ESM support experimental in 2025 (`--experimental-vm-modules` flag required); heavier config
- Web Test Runner (`@web/test-runner`): Runs in a real browser — most faithful, but requires a browser binary and is heavier setup for this project's scale

---

## Decision 2: Application Architecture

**Decision**: Centralized module-private store + pub/sub event bus + hash router + view modules

**Rationale**: For a 4-view vanilla JS SPA with shared state across views, a single source of truth with explicit mutations is the right level of complexity. A pub/sub bus (Comment node EventTarget) decouples the store from views and allows targeted re-renders. Hash routing requires zero server configuration and preserves the current view on page refresh.

**Architecture**:
- `store/store.js`: Module-private `let state`, exported named action functions (the only way to mutate state), `getState()` for reads
- `store/eventBus.js`: Comment node as EventTarget (DevTools-visible, scoped, no `document` pollution)
- `router.js`: Hash-based (`#/route`), calls `view.onUnmount()` → `view.render(container)` → `view.onMount(container)`
- `views/*.js`: Each exports `render(container)`, `onMount(container)`, `onUnmount()`. Event delegation on container (not individual elements) to survive re-renders
- `models/*.js`: Pure functions only — no DOM, no store imports. Entity factories + validation + scoring computation

**State mutation pattern**: Spread/immutable updates (`{ ...state, games: [...state.games, newGame] }`). Cheap at this scale (max 20 players, 200 games) and makes the data flow auditable.

**Standings**: Always derived by calling `deriveStandings(players, games)` on read. Never stored. Eliminates stale computed value bugs entirely.

**Rendering**: Full `innerHTML` replacement per view on navigation. Leaderboard uses targeted `<tbody>` update on `state:standings:changed` events to avoid disrupting in-progress interactions.

**XSS**: All user-generated strings escaped via `escapeHtml()` before insertion into `innerHTML`.

**Alternatives considered**:
- Proxy-based reactive store: More magic, harder to debug, unnecessary for this scale
- `CustomEvent` on `document`: Pollutes global event space; harder to test in isolation
- History API routing (`pushState`): Requires server-side fallback config; no benefit for a single-device app

---

## Decision 3: localStorage Schema and ID Strategy

**Decision**: Three separate keys + `JSON.stringify/parse` + `crypto.randomUUID()` + try/catch on every write

**Rationale**: Separate keys allow surgical writes (adding a player doesn't re-serialize 200 games). The entire dataset at maximum scale (~200 games × ~300 bytes = ~60KB) is well under the 5MB localStorage limit, so quota errors are unlikely but must still be handled.

**Schema**:
```
localStorage key: "backgammon:tournament"  → Tournament object
localStorage key: "backgammon:players"     → Player[] array
localStorage key: "backgammon:games"       → Game[] array
```

**ID generation**: `crypto.randomUUID()` (available in all modern browsers in HTTPS/localhost contexts). Millisecond-timestamp IDs can collide; auto-increment requires read-modify-write cycles.

**Timestamps**: `Date.now()` (Unix epoch integer). `Date` objects do not round-trip through `JSON.parse`.

**Points field on Game**: Stored as a denormalized convenience field for display (`game.matchPoints = resultTypeMultiplier × cubeValue`). Standings are **never** derived from this stored value — always recomputed by iterating all games. This eliminates the risk of display inconsistency if the field is ever stale.

**Quota error handling**: Every `localStorage.setItem` call is wrapped in try/catch. On failure, in-memory state remains valid; user sees a non-blocking warning.

**Alternatives considered**:
- Single `backgammon:appState` blob: Simpler reads but forces full re-serialize on every mutation
- Per-record keys (e.g., `backgammon:game:<id>`): Requires iterating all keys to reconstruct collections; fragile and slower
- `structuredClone` for serialization: Produces a JS object, not a string — not usable with localStorage

---

## Decision 4: Scoring Formula

**Decision**: `matchPoints = resultTypeMultiplier × cubeValue`

| resultType  | multiplier |
|-------------|-----------|
| standard    | 1         |
| gammon      | 2         |
| backgammon  | 3         |

| cubeValue   | 1 | 2 | 4 | 8 | 16 | 32 | 64 |
|-------------|---|---|---|---|----|----|----|

The full test matrix for the integrity gate: 3 result types × 7 cube values = 21 combinations. All must have unit tests written before implementation.

**Cube value entry UX**: Defaults to 1 (cube not used). A toggle reveals a dropdown of standard values (2, 4, 8, 16, 32, 64).

**Standings tiebreaker**: Equal match points → fewer losses ranks higher.

---

## Open Items / Deferred

None. All NEEDS CLARIFICATION items are resolved.

# Implementation Plan: Auto-Name Tournament by Date and Time

**Branch**: `014-auto-tournament-name` | **Date**: 2026-03-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/014-auto-tournament-name/spec.md`

---

## Summary

Replace the manual tournament name-entry step with automatic date/time-based naming. When a user starts a new tournament, the app generates the name `HH:mm. dddd, MMM d, yyyy` from the current local time — no prompt shown. Tournament start and end remain explicit user actions. Reset Tournament preserves the existing name.

---

## Technical Context

**Language/Version**: Vanilla JavaScript ES2022+ (native ES modules)
**Primary Dependencies**: None (production); Vitest 3.x + Playwright (dev only)
**Storage**: `localStorage` — `backgammon:tournament` key (no schema change; name value changes source)
**Testing**: Vitest (unit TDD) + Playwright MCP (e2e acceptance)
**Target Platform**: Browser — static deployment (Netlify / GitHub Pages / any CDN)
**Project Type**: Web application (hash-router SPA)
**Performance Goals**: Instantaneous — name generation is a synchronous string operation
**Constraints**: No server-side component; all data in localStorage; offline-capable
**Scale/Scope**: Single-user local app; no concurrency concerns

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|---|---|---|
| **Simplicity gate** | ✅ PASS | Zero new dependencies. Native `Date` methods only. `namePrompt.js` repurposed (not replaced), minimising router changes. |
| **TDD gate** | ✅ PASS | Unit tests for `generateTournamentName()` and updated `initTournament()` / `resetTournament()` MUST be written first and observed to fail before implementation. |
| **E2E gate** | ✅ PASS | Playwright MCP e2e tests covering all 4 acceptance scenarios required before feature is complete. |
| **Static gate** | ✅ PASS | No server-side component introduced. |
| **Integrity gate** | ✅ PASS | No score calculation paths affected. |

No violations. Complexity Tracking table not required.

---

## Project Structure

### Documentation (this feature)

```text
specs/014-auto-tournament-name/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── generate-tournament-name.md  ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code Changes

```text
src/
  utils.js              ← ADD: generateTournamentName(date?)
  store/
    store.js            ← MODIFY: initTournament() (remove name param, auto-generate)
                           MODIFY: resetTournament() (preserve tournament entity)
  models/
    tournament.js       ← MODIFY: createTournament() (remove empty-name guard; name always provided)
  views/
    namePrompt.js       ← MODIFY: remove text input; add "Start Tournament" button
  router.js             ← MODIFY: navigate to #/live (not #/start) after reset

tests/
  utils.test.js         ← ADD: generateTournamentName unit tests (TDD — write first)
  store/
    store.test.js       ← MODIFY: update initTournament and resetTournament tests
  models/
    tournament.test.js  ← MODIFY: update createTournament tests if needed

tests/e2e/
  014-auto-tournament-name.spec.js  ← ADD: Playwright e2e covering all acceptance scenarios
```

**Structure Decision**: Single-project layout (existing repo structure). No new directories. All changes are in-place modifications to existing files plus additions to existing test files.

---

## Implementation Approach

### Core Change: `generateTournamentName(date = new Date())`

Pure function added to `src/utils.js`:

```
HH   = String(date.getHours()).padStart(2, '0')
mm   = String(date.getMinutes()).padStart(2, '0')
dddd = date.toLocaleDateString('en-US', { weekday: 'long' })
MMM  = date.toLocaleDateString('en-US', { month: 'short' })
d    = date.getDate()
yyyy = date.getFullYear()
→    `${HH}:${mm}. ${dddd}, ${MMM} ${d}, ${yyyy}`
```

Rationale: Uses `getHours()` to avoid Safari midnight `"24:xx"` edge case. See `research.md` Decision 1.

### `initTournament()` (store.js)

- Remove `name` parameter entirely.
- Generate name via `generateTournamentName()` at call time.
- Remove the "name is required" / "name too long" validation (no longer applicable).

### `resetTournament()` (store.js)

- Preserve `state.tournament` — only clear `players`, `matches`, `selectedMatchId`, `schedule`.
- Re-persist `state.tournament` to localStorage (tournament survives reset).
- Tournament is still active after reset; router stays on `#/live`.

### `router.js`

- In the `reset-tournament` action handler: change `window.location.hash = '#/start'` to `'#/live'`.

### `namePrompt.js` (repurposed as Start Tournament view)

- Remove the `<input>`, `<label>`, and `<form>` submission logic.
- Replace with a single "Start Tournament" button.
- On click: call `initTournament()`, then navigate to `#/live`.
- Keep `render()`, `onMount()`, `onUnmount()` exports (router contract unchanged).

---

## Key Risk: Existing Test Updates

`initTournament(name)` is called with a string argument in existing unit tests. Those tests MUST be updated to call `initTournament()` without arguments, and assertions about name format MUST be updated to match the auto-generated pattern. This is expected rework, not regression.

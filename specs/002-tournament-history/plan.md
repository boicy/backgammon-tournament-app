# Implementation Plan: Named Tournaments & History

**Branch**: `002-tournament-history` | **Date**: 2026-03-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-tournament-history/spec.md`

## Summary

Extend the Backgammon Tournament Tracker to support named tournaments, a persistent archive of completed evenings, a cross-tournament All-Time leaderboard, and roster suggestions for returning players. All data persists to localStorage using two new keys (`backgammon:archive`, `backgammon:roster`). A new Club tab surfaces historical data. No new production dependencies are introduced.

## Technical Context

**Language/Version**: HTML5 / CSS3 / Vanilla JavaScript (ES2022+)
**Primary Dependencies**: None (production). Vitest 3.x (dev only) — unchanged.
**Storage**: `localStorage` — three existing keys unchanged + two new: `backgammon:archive`, `backgammon:roster`
**Testing**: Vitest 3.x + jsdom (unchanged). Playwright MCP for e2e acceptance tests.
**Target Platform**: Modern web browsers (Chrome 92+, Firefox 95+, Safari 15.4+) — unchanged
**Project Type**: Static single-page web application — unchanged
**Performance Goals**: Archive list renders in <100ms for 52 tournaments; All-Time leaderboard computes in <50ms for 52 tournaments × 20 players
**Constraints**: No backend; offline-capable; responsive (smartphone/tablet/laptop); 44px min touch targets; no build step; archive is write-once
**Scale/Scope**: Up to 52 archived tournaments (one year of weekly evenings) + 1 active tournament; up to 20 players per tournament

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| **Simplicity gate**: No framework, build tool, or runtime dep without justification | PASS | No new production dependencies. HTML `<datalist>` used for roster suggestions — native browser feature, zero dependencies. |
| **TDD gate**: Every user story has test tasks before and blocking implementation tasks | PASS | Unit tests for `createSnapshot`, `deriveAllTimeStandings`, `validateTournamentName`, roster deduplication, and updated store actions will precede all implementation tasks in tasks.md. |
| **E2E gate**: Every frontend feature has Playwright e2e test tasks covering all acceptance scenarios | PASS | E2e tasks covering all 5 user story acceptance scenarios listed before final verification tasks in tasks.md. Playwright MCP used for execution. |
| **Static gate**: No server-side component, API endpoint, or external DB | PASS | Two new localStorage keys only. No external services. |
| **Integrity gate**: All score calculation paths covered by unit tests | PASS | No changes to scoring formula. All-Time standings use existing match points — no new calculation paths requiring additional coverage. |

No violations. Complexity Tracking table not required.

## Project Structure

### Documentation (this feature)

```text
specs/002-tournament-history/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── store-api.md     # Phase 1 output (updated store contract)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backgammon-tournament-app/
├── index.html               # Updated: 5th nav tab "Club"; no new script deps
├── styles.css               # Updated: name-prompt, club view, datalist, archive list
│
└── src/
    ├── main.js              # Updated: loadFromStorage includes archive+roster; redirect to #/start when no tournament
    ├── router.js            # Updated: add #/start → namePrompt view; #/club → club view
    ├── utils.js             # Unchanged
    │
    ├── store/
    │   ├── store.js         # Updated: new state keys (archive, roster); endTournament();
    │   │                    #   initTournament() auto-archives if needed; getState() returns archive+roster
    │   └── eventBus.js      # Unchanged
    │
    ├── models/
    │   ├── player.js        # Unchanged
    │   ├── game.js          # Unchanged
    │   ├── tournament.js    # Unchanged
    │   ├── standing.js      # Unchanged
    │   ├── roundRobin.js    # Unchanged
    │   ├── tournamentSnapshot.js  # NEW: createSnapshot(), snapshotWinner()
    │   └── allTimeStanding.js     # NEW: deriveAllTimeStandings()
    │
    └── views/
        ├── namePrompt.js           # NEW: tournament name form (#/start route)
        ├── playerRegistration.js   # Updated: display tournament name; End Tournament btn;
        │                           #   datalist for roster suggestions
        ├── recordGame.js           # Unchanged
        ├── leaderboard.js          # Unchanged
        ├── gameHistory.js          # Unchanged
        └── club.js                 # NEW: Club tab (All-Time leaderboard + archive list + inline detail)

tests/
├── models/
│   ├── game.test.js              # Unchanged
│   ├── player.test.js            # Unchanged
│   ├── standing.test.js          # Unchanged
│   ├── tournamentSnapshot.test.js  # NEW: snapshot creation, winner derivation, empty tournament handling
│   └── allTimeStanding.test.js     # NEW: derivation, ranking, ties, case-insensitive merge, active tournament
└── store/
    └── store.test.js             # Updated: endTournament, initTournament auto-archive,
                                  #   archive+roster persistence, roster update on addPlayer
```

**Structure Decision**: Same single-project static web app. Model and view layers extended with two new model files and two new view files. Store and router updated in-place. No new project-level directories.

## Architecture Decisions

### Tournament Name Prompt

A new `namePrompt.js` view handles the `#/start` route. On every navigation, the router checks whether `getState().tournament === null`; if so, it redirects to `#/start` before rendering any other view. After the organizer submits a valid name (non-empty, ≤100 chars), `initTournament(name)` is called and the router navigates to `#/players`. This cleanly separates the "name entry" step from player management without modifying the players view's logic.

### End Tournament vs Reset Tournament

`endTournament()` (new store action): validates the active tournament has ≥1 player AND ≥1 game. If valid, it appends a `TournamentSnapshot` to `state.archive` and persists to `backgammon:archive`. Then sets `state.tournament = null` (and clears active players/games from state and localStorage). If the tournament is empty, the data is discarded without archiving. In both cases, the router detects `tournament === null` and redirects to `#/start`.

`resetTournament()` unchanged — discards data without archiving.

### Auto-Archive on New Tournament Start

`initTournament(name)` checks if the current tournament has ≥1 player AND ≥1 game before creating the new tournament. If so, it archives the current tournament first (calling the archive logic inline, not `endTournament()` to avoid double-emit), then creates the new tournament. This satisfies FR-004.

### Archive as Immutable Snapshots

`TournamentSnapshot` is a self-contained JSON object stored in the `backgammon:archive` array. It captures the full tournament metadata, player list, game list, and final standings (derived and stored at snapshot time). Storing pre-computed standings avoids re-deriving them on every archive list render, meeting the 52-tournament performance goal with trivial computation.

### All-Time Leaderboard Derivation

`deriveAllTimeStandings(archive, activeTournament, activePlayers, activeGames)` is a pure function:
1. Iterates all TournamentSnapshots; accumulates wins (first-place in each snapshot's standings), cumulative match points, and participation count per player (matched case-insensitively).
2. Overlays the active tournament's in-progress standings without requiring archiving.
3. Sorts by tournament wins descending; tiebreaker: cumulative match points descending.
4. Returns an `AllTimeStanding[]` array — never stored, always derived on demand.

Player names are normalised to lowercase for matching across tournaments; display name is taken from the most recent occurrence.

### Club View (Inline Detail Pattern)

`club.js` uses a module-level `_selectedSnapshotId` variable to switch between two sub-states: list mode (All-Time leaderboard + archive list) and detail mode (single tournament's standings + game history, read-only). No new route is added — the detail renders inline within `#/club`, consistent with how `gameHistory.js` manages its filter state. A "Back" button sets `_selectedSnapshotId = null` and re-renders the list.

### Roster Suggestions

The player name input in `playerRegistration.js` gains a `list="roster-datalist"` attribute pointing to a `<datalist>` populated from `getState().roster`. This is native HTML5 — no JavaScript input event handling required. The roster is updated immediately inside `addPlayer(name)` (after successful validation): if the normalised name is not already in `state.roster`, it is appended and persisted to `backgammon:roster`. The roster is additive-only and never cleared by `endTournament()` or `resetTournament()`.

## Phase 0 Research Summary

See [`research.md`](./research.md) for full findings. All decisions resolved:

| Topic | Decision |
|-------|----------|
| Roster suggestions UI | Native HTML5 `<datalist>` — no framework needed |
| Archive serialisation | JSON array in localStorage, one object per snapshot; standings pre-computed at archive time |
| All-Time name matching | Case-insensitive normalisation; display name from most recent tournament |
| Club tab navigation | Inline detail pattern (module variable); no new route |
| Tournament name prompt | New `#/start` route + `namePrompt.js` view; router guards all other routes |

## Phase 1 Design Artifacts

- [`data-model.md`](./data-model.md) — Entity schemas for TournamentSnapshot, PlayerRoster, AllTimeStanding; updated localStorage layout
- [`contracts/store-api.md`](./contracts/store-api.md) — New and updated store action contracts; new event bus events
- [`quickstart.md`](./quickstart.md) — Setup, local run, test execution, manual validation checklist for this feature

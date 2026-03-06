# Implementation Plan: UX Redesign — Scoreboard-Style Tournament Director Interface

**Branch**: `004-ux-redesign` | **Date**: 2026-03-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-ux-redesign/spec.md`

## Summary

Redesign the tournament app's UI from a feature-dense 4-tab layout to a focused 2-tab scoreboard interface optimized for a tournament director managing 2–3 simultaneous matches on a phone. Replace the current Match Hub + separate Match Detail page with a single "Live" view where match cards display large scores and game recording happens inline. Restyle the entire app with a dark sport-broadcast aesthetic (near-black base, amber accent, system fonts, monospace scores). No changes to models, store, event bus, or localStorage format.

## Technical Context

**Language/Version**: Vanilla JavaScript ES2022+ (native ES modules), HTML5, CSS3
**Primary Dependencies**: None (production). Vitest 3.x + Playwright (dev only)
**Storage**: `localStorage` — 6 existing keys, no changes
**Testing**: Vitest (unit), Playwright via MCP (e2e)
**Target Platform**: Mobile-first web (375px primary), tablet/desktop responsive
**Project Type**: Static single-page web application (hash router, no build step)
**Performance Goals**: Live view renders in <1s, card expand/collapse <200ms
**Constraints**: No frameworks, no bundler, no server-side component, offline-capable via localStorage
**Scale/Scope**: Single-user (tournament director), 2–3 concurrent matches typical, ≤20 players

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| **Simplicity** | ✅ PASS | No new dependencies. Vanilla JS + CSS only. Removing complexity (fewer routes, fewer views). |
| **TDD** | ✅ PASS | Unit tests for any new view logic (expand/collapse state). Playwright e2e for all acceptance scenarios. Existing model/store tests unchanged. |
| **E2E** | ✅ PASS | Playwright MCP tests will cover all 7 user stories. Existing e2e tests will be rewritten for new selectors/routes. |
| **Static** | ✅ PASS | No server component introduced. Same static deployment model. |
| **Integrity** | ✅ PASS | No scoring logic changes. All existing score calculation unit tests remain. |

## Project Structure

### Documentation (this feature)

```text
specs/004-ux-redesign/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal — no new entities)
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── store-api.md     # Existing store API contract (unchanged, referenced)
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── main.js              # Entry point (unchanged)
├── router.js            # Updated: #/live replaces #/players, #/match removed, #/match redirects
├── utils.js             # Unchanged
├── store/
│   ├── store.js         # Unchanged
│   └── eventBus.js      # Unchanged
├── models/              # All unchanged
│   ├── match.js
│   ├── game.js
│   ├── player.js
│   ├── matchStanding.js
│   ├── tournament.js
│   ├── tournamentSnapshot.js
│   ├── allTimeStanding.js
│   └── roundRobin.js
└── views/
    ├── liveView.js      # NEW — replaces matchHub.js + matchDetail.js
    ├── leaderboard.js   # Updated — add Live column
    ├── gameHistory.js   # Restyle only
    ├── club.js          # Restyle only
    └── namePrompt.js    # Restyle only

styles.css               # Complete rewrite — new design system

tests/
├── models/              # All unchanged
├── store/               # All unchanged
├── views/
│   ├── liveView.test.js # NEW — unit tests for expand/collapse, card rendering
│   ├── leaderboard.test.js  # Updated — Live column tests
│   └── gameHistory.test.js  # Updated if selectors change
└── e2e/
    ├── us1-live-monitoring.test.js     # NEW
    ├── us2-inline-recording.test.js    # NEW
    ├── us3-navigation.test.js          # NEW
    ├── us4-visual-refresh.test.js      # NEW
    ├── us5-standings-live.test.js      # NEW
    ├── us6-player-management.test.js   # NEW
    ├── us7-new-match-form.test.js      # NEW
    ├── smoke.spec.js                   # Updated for new routes/selectors
    └── [legacy tests]                  # Updated or removed as needed
```

**Structure Decision**: Single-project vanilla JS structure. No new directories. `liveView.js` replaces `matchHub.js` + `matchDetail.js`. All model and store files are untouched.

## Complexity Tracking

No constitution violations. No new dependencies, frameworks, or abstractions introduced. This redesign actually reduces complexity:
- 2 view files removed (`matchHub.js`, `matchDetail.js`), 1 added (`liveView.js`)
- 1 route removed (`#/match`)
- 2 nav tabs removed (4 → 2)

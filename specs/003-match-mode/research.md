# Research: Match-Mode Tournament Nights

**Branch**: `003-match-mode` | **Date**: 2026-03-05

## Overview

The tech stack is fully established (Vanilla JS ES2022+, localStorage, Vitest, Playwright). This document records architectural decisions rather than technology choices.

---

## Decision 1: Where games live — embedded in matches vs. flat array

**Decision**: Embed games inside each `Match` object (`match.games = []`).

**Rationale**: Games are meaningless outside their match context in the new model. Embedding avoids a join operation, keeps a match self-contained for rendering, archiving, and testing. The existing flat `backgammon:games` key is retired for new tournaments; it will remain in old archives unchanged.

**Alternatives considered**:
- Keep `backgammon:games` as a flat array with a `matchId` field — would require filtering on every read; adds indirection without benefit in a single-user app.

---

## Decision 2: Router pattern for match detail view

**Decision**: Store `selectedMatchId` in app state. Add a parameterless `#/match` route that reads `state.selectedMatchId` to know which match to render.

**Rationale**: The existing hash router has no dynamic segment support. The simplest extension is a state-driven approach identical to how the Club tab manages `selectedTournamentId`. No router changes beyond adding one new route entry.

**Alternatives considered**:
- `#/match?id=xxx` query string — would require parsing logic in the router; more complexity for no extra benefit in a single-user app.
- `#/match/xxx` path segment — would require a regex-based route matcher; disproportionate complexity.

---

## Decision 3: Night leaderboard derivation

**Decision**: New pure function `deriveMatchStandings(players, matches)` in `src/models/matchStanding.js`. Ranks by match wins DESC then total points scored DESC.

**Rationale**: Keeps the model layer pure and testable. Mirrors the pattern of `deriveStandings` and `deriveAllTimeStandings`. Leaderboard view calls it on every render (same as today).

**Alternatives considered**:
- Caching/memoising standings in the store — unnecessary complexity; derivation is O(players × matches) which is trivially fast for club scale.

---

## Decision 4: Tournament snapshot for match-based nights

**Decision**: Extend `createSnapshot` to accept `matches` as the third argument (replacing `games`). Generate `finalStandings` from match data using `deriveMatchStandings`. Keep the `finalStandings` shape identical (`{ rank, name, matchPoints, wins, losses }`) so `deriveAllTimeStandings` requires no changes. Add a `matches` field to the snapshot and set `gameCount` to total games across all matches.

**Rationale**: `deriveAllTimeStandings` only reads `finalStandings[0].name` (for wins) and `finalStandings[*].matchPoints` (for cumulative points). Both fields remain correctly populated. Legacy snapshots without a `matches` field continue to work untouched.

**Alternatives considered**:
- Separate snapshot creator for match-based tournaments — adds a code path for every downstream consumer to branch on; the unified approach is simpler.

---

## Decision 5: Retiring the standalone record-game flow

**Decision**: The `/record` route redirects to `/players` (the match hub). `recordGame.js` and `playerRegistration.js` are superseded by `matchHub.js` and `matchDetail.js` respectively. The old view files are kept but no longer referenced by the router.

**Rationale**: The spec is explicit: "No standalone game recording outside of a match context." Retiring the route enforces the constraint at the navigation layer, not just in the UI.

**Alternatives considered**:
- Modify existing view files in place — riskier because existing tests and event listeners are tightly coupled to the old data model. New files with explicit contracts are cleaner for a feature branch.

---

## Decision 6: Player-in-two-matches enforcement

**Decision**: `startMatch` action checks that neither player has an `active` match. Throws `Error('Player already in an active match')` if violated. The UI disables pairing options for busy players and shows a tooltip explaining why.

**Rationale**: Spec FR-012 (user chose Approach A: enforce hard block). Validation in the store action ensures the rule is tested independently of the UI.

---

## Decision 7: Match abandonment

**Decision**: `abandonMatch(matchId)` action sets `status: 'abandoned'`. Abandoned matches are not counted in standings (no wins, no points) and are not included in the archive snapshot. They are shown in the hub with a distinct visual treatment.

**Rationale**: Spec FR-010 requires explicit abandonment without counting as win or loss. Keeping abandoned matches in state (rather than deleting) avoids confusion if the organiser accidentally taps abandon and needs to see what happened.

---

## No new dependencies

All decisions are implementable with the existing tech stack. No new packages, build steps, or runtime dependencies are required.

# Implementation Plan: End Match Early (Partial Completion)

**Branch**: `012-end-match-early` | **Date**: 2026-03-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/012-end-match-early/spec.md`

## Summary

Allow active matches to be ended before the target score is reached. A single "End Match" overflow action adapts its confirmation based on whether games have been recorded: with games it marks the match complete (declaring the leader as winner, or no winner if tied) and counts toward standings; with no games it abandons the match with no standings impact. A new `endedEarly` flag on the match record enables history display to distinguish early-ended matches from naturally completed ones.

## Technical Context

**Language/Version**: Vanilla JavaScript ES2022+ (native ES modules)
**Primary Dependencies**: None (production); Vitest 3.x + Playwright (dev only)
**Storage**: `localStorage` — `backgammon:matches` key (no new keys; `endedEarly` field is additive)
**Testing**: Vitest (unit), Playwright via MCP (e2e)
**Target Platform**: Browser (static, any CDN host)
**Project Type**: Web application (SPA, no build step)
**Performance Goals**: Standard interactive response (<100ms for user actions)
**Constraints**: No frameworks, no server, no bundler; offline-capable
**Scale/Scope**: Single-tournament session; ~10 concurrent active matches maximum

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Simplicity | PASS | No new dependencies; single boolean field addition; reuses existing status values |
| TDD | PASS | Unit tests written before implementation for all new functions |
| E2E | PASS | Playwright e2e tests cover all acceptance scenarios via MCP |
| Static | PASS | No server component; localStorage only |
| Integrity | PASS | No new scoring calculation path; `earlyMatchWinner` uses existing match points, unit-tested |

## Project Structure

### Documentation (this feature)

```text
specs/012-end-match-early/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (files touched)

```text
src/
├── models/
│   ├── match.js              # + earlyMatchWinner()
│   └── matchStanding.js      # fix loss guard for null winnerId
├── store/
│   └── store.js              # + endMatchEarly() action
└── views/
    ├── liveView.js           # update overflow handler
    └── gameHistory.js        # update matchStatusLabel for endedEarly

tests/
├── models/
│   ├── match.test.js         # + earlyMatchWinner() tests
│   └── matchStanding.test.js # + tied early-end standings tests
├── store/
│   └── store.test.js         # + endMatchEarly() tests
└── e2e/
    └── 012-end-match-early.spec.js   # new e2e acceptance tests

styles.css                    # + .badge-ended-early style
```

**Structure Decision**: Single project (existing layout). No new directories needed.

## Implementation Phases

### Phase A — Model Layer (TDD)

**A1 — Unit tests for `earlyMatchWinner()` (RED)**

Write failing tests in `tests/models/match.test.js`:
- Returns `player1Id` when P1 leads by match points
- Returns `player2Id` when P2 leads by match points
- Returns `null` when scores are tied (e.g., 2-2)
- Returns `null` when no games recorded (0-0)
- Observe all tests fail before implementation.

**A2 — Implement `earlyMatchWinner()` (GREEN)**

In `src/models/match.js`, add:
```js
export function earlyMatchWinner(match) {
  const p1Points = match.games
    .filter(g => g.winnerId === match.player1Id)
    .reduce((sum, g) => sum + g.matchPoints, 0);
  const p2Points = match.games
    .filter(g => g.winnerId === match.player2Id)
    .reduce((sum, g) => sum + g.matchPoints, 0);
  if (p1Points > p2Points) return match.player1Id;
  if (p2Points > p1Points) return match.player2Id;
  return null;
}
```
Run tests — all A1 tests pass.

**A3 — Unit tests for matchStanding null-winner fix (RED)**

Write failing tests in `tests/models/matchStanding.test.js`:
- Tied early-ended match (`status: 'complete'`, `winnerId: null`): neither player gets a win or loss; both retain earned match points.
- Verify existing "normal complete" and "abandoned" tests still pass.

**A4 — Fix loss guard in `deriveMatchStandings()` (GREEN)**

In `src/models/matchStanding.js`, change loss filter from:
```js
&& m.winnerId !== player.id
```
to:
```js
&& m.winnerId !== player.id && m.winnerId !== null
```
Run tests — all A3 tests pass; no regressions.

---

### Phase B — Store Action (TDD)

**B1 — Unit tests for `endMatchEarly()` (RED)**

Write failing tests in `tests/store/store.test.js`:
- Throws `'Match not found'` for unknown matchId
- Throws `'Match is not active'` for already-complete/abandoned match
- With 0 games: sets `status: 'abandoned'`, `winnerId: null`; does not affect standings
- With games (P1 leads): sets `status: 'complete'`, `endedEarly: true`, `winnerId: player1Id`, `completedAt` set
- With games (P2 leads): sets `winnerId: player2Id`
- With games (tied): sets `status: 'complete'`, `endedEarly: true`, `winnerId: null`; both players retain earned points in standings
- Emits `state:matches:changed` in all cases
- Emits `state:standings:changed` in all cases
- Persists to localStorage
- Observe all tests fail before implementation.

**B2 — Implement `endMatchEarly()` in store (GREEN)**

In `src/store/store.js`:
1. Import `earlyMatchWinner` from `../models/match.js`
2. Add `endMatchEarly(matchId)` action:

```js
export function endMatchEarly(matchId) {
  const matchIndex = state.matches.findIndex(m => m.id === matchId);
  if (matchIndex === -1) throw new Error('Match not found');

  const match = state.matches[matchIndex];
  if (match.status !== 'active') throw new Error('Match is not active');

  let updatedMatch;
  if (match.games.length === 0) {
    updatedMatch = { ...match, status: 'abandoned', winnerId: null };
  } else {
    updatedMatch = {
      ...match,
      status: 'complete',
      endedEarly: true,
      winnerId: earlyMatchWinner(match),
      completedAt: Date.now(),
    };
  }

  state.matches = [
    ...state.matches.slice(0, matchIndex),
    updatedMatch,
    ...state.matches.slice(matchIndex + 1),
  ];
  persist(KEYS.matches, state.matches);
  eventBus.emit('state:matches:changed', { matches: state.matches });
  eventBus.emit('state:standings:changed', { standings: deriveMatchStandings(state.players, state.matches) });
}
```

Run tests — all B1 tests pass.

---

### Phase C — UI Layer

**C1 — Update liveView overflow handler**

In `src/views/liveView.js`:
1. Import `endMatchEarly` from `../store/store.js`
2. Replace the `open-overflow` handler body:

```js
if (action === 'open-overflow') {
  const match = getState().matches.find(m => m.id === matchId);
  if (!match) return;

  let message;
  if (match.games.length === 0) {
    message = 'No games recorded. Abandon this match? No scores will be saved.';
  } else {
    const { p1, p2 } = computeScore(match);
    const { players } = getState();
    const n1 = playerName(players, match.player1Id);
    const n2 = playerName(players, match.player2Id);
    if (p1 === p2) {
      message = `End match early? ${n1} ${p1} – ${p2} ${n2}. Scores are tied — no winner will be declared.`;
    } else {
      const leaderName = p1 > p2 ? n1 : n2;
      message = `End match early? ${n1} ${p1} – ${p2} ${n2}. ${leaderName} will be declared winner.`;
    }
  }

  if (window.confirm(message)) {
    try {
      if (_expandedCardId === matchId) _expandedCardId = null;
      endMatchEarly(matchId);
      refreshActiveZone();
    } catch (err) {
      console.error('endMatchEarly error:', err);
    }
  }
  return;
}
```

3. Do NOT remove the `abandon-match` action handler in this step — that cleanup is deferred to Phase 6 (T019) after verifying no other code paths depend on it.

**C2 — Update gameHistory status label**

In `src/views/gameHistory.js`, update `matchStatusLabel`:
```js
function matchStatusLabel(match) {  // change signature to accept full match object
  if (match.endedEarly) return 'Ended Early';
  if (match.status === 'complete') return 'Complete';
  if (match.status === 'abandoned') return 'Abandoned';
  return match.status;
}
```
Update the call site to pass the full match object instead of `match.status`.

**C3 — Add CSS badge style**

In `styles.css`, add alongside existing badge styles:
```css
.badge-ended-early {
  background: var(--color-warning, #f59e0b);
  color: #fff;
}
```
Update the badge rendering in `gameHistory.js` to use `badge-ended-early` class when `match.endedEarly` is true.

---

### Phase D — End-to-End Tests (Playwright MCP)

**D1 — Write e2e tests** in `tests/e2e/012-end-match-early.spec.js` covering all spec acceptance scenarios:

1. US-1 S1: End match early with 1+ games → match moves to completed zone; leader declared winner
2. US-1 S2: End match early with 0 games → match disappears from active zone
3. US-1 S3: Ended-early match shows "Ended Early" label in history (navigate to `/#/history`)
4. US-2 S1: Abandon (0 games) → match not in standings
5. US-2 S2: Abandon (0 games) → no win/loss/points for either player
6. US-3 S1: End early P1 leading → P1 credited in standings
7. US-3 S2: End early tied → no winner; both retain points; neither gets win/loss
8. Edge: confirmation shown before ending (cancel → match stays active)

**D2 — Run e2e tests via Playwright MCP**

- Start `npx serve .` before running
- Use `browser_navigate`, `browser_click`, `browser_snapshot` to drive
- On failure: capture `browser_take_screenshot` → `./artifacts/screenshots/<timestamp>-failure.png` and `browser_console_messages` → `./artifacts/console/<timestamp>.log` before investigating

---

## Complexity Tracking

*No complexity violations — no new frameworks, build tools, or runtime dependencies introduced.*

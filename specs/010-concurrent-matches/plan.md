# Implementation Plan: Concurrent Match Participation

**Branch**: `010-concurrent-matches` | **Date**: 2026-03-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-concurrent-matches/spec.md`

## Summary

Replace the per-player single-match constraint in `store.js` with a per-pair duplicate-match guard, allowing players to participate in multiple simultaneous matches. Add an active-match count badge to the player picker in `liveView.js` and a supporting CSS rule. Update two obsolete unit tests and add new unit + Playwright e2e tests. No data model changes, no new dependencies.

## Technical Context

**Language/Version**: Vanilla JavaScript ES2022+, HTML5, CSS3
**Primary Dependencies**: None (production)
**Storage**: `localStorage` — no changes to keys or data shapes
**Testing**: Vitest 3.x (unit) + Playwright (e2e via Playwright MCP)
**Target Platform**: Static browser app (Chromium primary)
**Project Type**: Single-page web application (no build step)
**Performance Goals**: No regression — badge derivation is O(matches) per render, negligible
**Constraints**: Offline-capable, no server-side component
**Scale/Scope**: Casual tournament (~4–16 players, ~10–50 matches per night)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Simplicity | PASS | No new dependencies, no new abstractions; two small code changes |
| TDD | PASS | Unit tests written and observed to fail before `store.js` change |
| E2E | PASS | Playwright tests cover all US1–US3 acceptance scenarios |
| Static | PASS | No server, no API, no external database |
| Integrity | PASS | Score calculation paths untouched; no new scoring logic |

## Project Structure

### Documentation (this feature)

```text
specs/010-concurrent-matches/
├── plan.md              ← this file
├── spec.md              ← feature specification
├── research.md          ← Phase 0 decisions
├── data-model.md        ← constraint change documented
├── quickstart.md        ← how to run & verify
├── checklists/
│   └── requirements.md
└── tasks.md             ← Phase 2 output (via /speckit.tasks)
```

### Source Code

```text
src/
├── store/
│   └── store.js          ← modify startMatch() validation (lines 184–187)
└── views/
    └── liveView.js       ← modify newMatchFormHtml() to add count badge

styles.css                ← add .pick-btn__badge rule

tests/
├── store/
│   └── store.test.js     ← update 2 FR-012 tests; add duplicate-pair test
└── e2e/
    └── us10-concurrent-matches.test.js   ← new file
```

**Structure Decision**: Single-project layout. No new directories. All changes are in-place edits to existing files, plus one new e2e test file.

## Implementation Design

### Change 1 — `src/store/store.js`: `startMatch()` validation

Remove the broad per-player guard (FR-012). Replace with a per-pair duplicate check (FR-004).

**Before** (lines 184–187):
```js
const busyPlayer = state.matches.find(
  (m) => m.status === 'active' && (
    m.player1Id === player1Id || m.player2Id === player1Id ||
    m.player1Id === player2Id || m.player2Id === player2Id
  ),
);
if (busyPlayer) throw new Error('Player already in an active match');
```

**After**:
```js
const duplicateMatch = state.matches.find(
  (m) => m.status === 'active' && (
    (m.player1Id === player1Id && m.player2Id === player2Id) ||
    (m.player1Id === player2Id && m.player2Id === player1Id)
  ),
);
if (duplicateMatch) throw new Error('An active match between these players already exists');
```

### Change 2 — `src/views/liveView.js`: `newMatchFormHtml()` badge

Update signature to accept `matches`. Derive `activeMatchCount` per player. Inject badge span inside picker button when count ≥ 1.

```js
function newMatchFormHtml(players, matches) {  // ← add matches param
  // ...
  const buttonsHtml = players.map((p) => {
    const activeCount = matches.filter(
      (m) => m.status === 'active' &&
        (m.player1Id === p.id || m.player2Id === p.id)
    ).length;
    const badge = activeCount > 0
      ? `<span class="pick-btn__badge">${activeCount}</span>`
      : '';
    // ... existing class/action/disabled logic ...
    return `<button ...>${escapeHtml(p.name)}${badge}</button>`;
  }).join('');
  // ...
}
```

All callers of `newMatchFormHtml` in `liveView.js` must pass `matches`:
- `viewHtml(state)`: already receives `matches` via `state`
- `refreshNewMatchForm()`: call `getState()` to obtain `matches`
- `_onPlayersChanged` handler: already calls `refreshNewMatchForm()`

### Change 3 — `styles.css`: badge styles

```css
.pick-btn__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.25rem;
  margin-left: 0.375rem;
  border-radius: var(--radius-pill, 9999px);
  background: var(--color-primary, #f59e0b);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1;
  vertical-align: middle;
}
```

### Change 4 — `tests/store/store.test.js`: update FR-012 tests

Replace the two tests at lines 706–713 that assert the removed behaviour, and add a new test for the duplicate-pair guard:

```js
// REMOVE:
it('throws "Player already in an active match" (FR-012) when player1 is in an active match', ...)
it('throws "Player already in an active match" (FR-012) when player2 is in an active match', ...)

// ADD:
it('allows player1 to start a new match when already in an active match with a different opponent', () => {
  store.startMatch(alice.id, bob.id, 5);
  expect(() => store.startMatch(alice.id, charlie.id, 5)).not.toThrow();
});

it('allows player2 to start a new match when already in an active match with a different opponent', () => {
  store.startMatch(alice.id, bob.id, 5);
  expect(() => store.startMatch(charlie.id, bob.id, 5)).not.toThrow();
});

it('throws when starting a duplicate active match between the same two players', () => {
  store.startMatch(alice.id, bob.id, 5);
  expect(() => store.startMatch(alice.id, bob.id, 5)).toThrow(/active match between these players/i);
});

it('throws when starting a duplicate active match (reversed player order)', () => {
  store.startMatch(alice.id, bob.id, 5);
  expect(() => store.startMatch(bob.id, alice.id, 5)).toThrow(/active match between these players/i);
});
```

### Change 5 — `tests/e2e/us10-concurrent-matches.test.js`: new Playwright e2e file

Cover all acceptance scenarios from US1–US3 of the spec. Use the existing helper pattern from other e2e files (addPlayer, startMatch, recordGame helpers).

Key scenarios:
1. Start match A-vs-B; start match A-vs-C → both active cards visible (US1 S1+S2)
2. Badge shows "1" on A and B after starting A-vs-B (US1 S4)
3. No badge on C before their first match (US1 S5)
4. Record game in A-vs-B → A-vs-C score unchanged (US1 S3 / US2 S1)
5. Complete A-vs-B → A-vs-C still active (US2 S2)
6. Open record form on A-vs-B; open record form on A-vs-C → A-vs-B form collapses (US2 S4)
7. Attempt second A-vs-B match → blocked with error message (US3 S1)
8. After A-vs-B completes, start new A-vs-B → succeeds (US3 S2)

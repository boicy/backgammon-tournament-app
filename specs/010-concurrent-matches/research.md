# Research: Concurrent Match Participation

**Feature**: 010-concurrent-matches
**Date**: 2026-03-07

## Decision 1: Constraint Change in `startMatch()`

**Decision**: Replace the broad per-player active-match guard (`FR-012`) with a per-pair duplicate-match guard.

**Current code** (`src/store/store.js`, line 184–187):
```js
const busyPlayer = state.matches.find(
  (m) => m.status === 'active' && (
    m.player1Id === player1Id || m.player2Id === player1Id ||
    m.player1Id === player2Id || m.player2Id === player2Id
  ),
);
if (busyPlayer) throw new Error('Player already in an active match');
```

**New code**:
```js
const duplicateMatch = state.matches.find(
  (m) => m.status === 'active' && (
    (m.player1Id === player1Id && m.player2Id === player2Id) ||
    (m.player1Id === player2Id && m.player2Id === player1Id)
  ),
);
if (duplicateMatch) throw new Error('An active match between these players already exists');
```

**Rationale**: The one-liner pair-check is the minimum viable change. It satisfies FR-001 (allow concurrent matches) and FR-004 (block duplicates between the same pair) simultaneously.

**Alternatives considered**:
- Remove all validation: rejected — would allow accidental double-starts with the same opponent.
- Add a per-player concurrency cap (e.g. max 2): rejected — spec assumption says no cap beyond unique-opponent constraint.

---

## Decision 2: Active Match Count Badge in Player Picker

**Decision**: Pass `matches` as a second argument to `newMatchFormHtml(players, matches)`. Compute active-match count per player inline; render a `<span class="pick-btn__badge">` inside each picker button when count ≥ 1.

**Rationale**: No new state is introduced. The count is derived directly from the `matches` array already available in the view's event handlers. The badge is purely presentational — it requires one CSS rule and one template change.

**Alternatives considered**:
- Separate data attribute on player objects: rejected — introduces unnecessary mutation of derived information.
- Tooltip on hover: rejected — no hover on mobile; badge is more immediately legible.

---

## Decision 3: Existing Unit Tests

**Impacted tests** (`tests/store/store.test.js`, lines 706–713):
- `'throws "Player already in an active match" (FR-012) when player1 is in an active match'` → **replaced** with `'allows player1 to start a new match when already in an active match with a different opponent'`
- `'throws "Player already in an active match" (FR-012) when player2 is in an active match'` → **replaced** with `'allows player2 to start a new match when already in an active match with a different opponent'`
- New test added: `'throws when starting a duplicate active match between the same two players'`

**Rationale**: The old tests assert the behaviour being removed. Updating them directly avoids orphaned test names. The new duplicate-pair test covers FR-004.

---

## Decision 4: E2E Test File Naming

**Decision**: New file `tests/e2e/us10-concurrent-matches.test.js` following the project's `us<N>-<description>.test.js` convention.

**Coverage**: All acceptance scenarios from US1 (S1–S5), US2 (S1–S4), US3 (S1–S2) of the spec.

---

## Decision 5: No Data Model or localStorage Changes

**Decision**: No changes to `localStorage` keys, no new entity fields, no new store actions.

**Rationale**: Concurrent matches are already structurally representable by the existing `matches` array. The feature is purely a constraint relaxation, not a data model extension.

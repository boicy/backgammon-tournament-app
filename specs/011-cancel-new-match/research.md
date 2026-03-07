# Research: Cancel New Match Creation (011)

## Summary

No external unknowns. All decisions are internal — this feature is a pure UI state management change within `src/views/liveView.js`.

---

## Decision 1: Cancel Affordance Implementation

**Decision**: Add a `[data-action="cancel-new-match"]` button rendered inside the new match section at every pick step (step 1, step 2, confirm).

**Rationale**: A dedicated Cancel button is more discoverable than the existing toggle. Adding a new `data-action` attribute keeps it consistent with the existing event delegation pattern in liveView.js and requires no new handlers beyond a single `case 'cancel-new-match':` in the delegated click handler.

**Alternatives considered**:
- Repurpose the existing toggle button as a cancel — rejected (toggle serves as an open/close control; conflating it with cancel creates ambiguity and was explicitly not chosen in clarification).
- Keyboard Escape key — rejected (out of scope per spec).

---

## Decision 2: Step-Back Deselect (Pick Step 2 → Step 1)

**Decision**: Extend the existing `deselect-player` action to handle step 2. When `_pickStep === 2` and `deselect-player` is triggered for P1, reset `_selectedP1 = null` and set `_pickStep = 1`. Render a deselect affordance on the selected P1 badge during step 2.

**Rationale**: The `deselect-player` action already exists and is handled at the confirm step. Extending it to step 2 is additive and requires no new action name or handler. The pick grid already receives a `data-player-id` attribute for deselect targets.

**Alternatives considered**:
- A separate `back` action — rejected (unnecessary indirection; deselect clearly expresses the intent).

---

## Decision 3: Deselect from Confirm Step

**Decision**: When `deselect-player` is triggered at `_pickStep === 'confirm'`, reset `_selectedP1 = null`, `_selectedP2 = null`, `_pickStep = 1`, and clear the target selection. Returns to step 1 (not step 2).

**Rationale**: Spec (FR-008) and the Assumptions section state the target is cleared on confirm-step deselect. Full reset to step 1 is simpler and avoids the question of which partial state to preserve. Consistent with the "cancel-only if partial retain is unclear" principle.

**Alternatives considered**:
- Retain the non-deselected player and return to step 2 — rejected (spec explicitly states target is cleared and return to step 1).

---

## Decision 4: State Variables Affected by Cancel

| Action | `_pickStep` | `_selectedP1` | `_selectedP2` | `_newMatchExpanded` |
|--------|-------------|---------------|---------------|----------------------|
| cancel-new-match | `null` | `null` | `null` | `false` |
| deselect-player (step 2) | `1` | `null` | unchanged (`null`) | `true` |
| deselect-player (confirm) | `1` | `null` | `null` | `true` |
| toggle-new-match (close) | `null` | `null` | `null` | `false` |

---

## Decision 5: No Unit Tests for Business Logic

**Decision**: No new Vitest unit tests required. All logic is UI state management within an event handler — no extractable pure functions.

**Rationale**: Constitution permits "UI rendering tests may be written after the fact." All acceptance scenario coverage is via Playwright e2e tests.

---

## Decision 6: E2E Test File

**Decision**: New file `tests/e2e/us11-cancel-new-match.test.js` covering all acceptance scenarios from spec (User Stories 1–3, edge cases).

**Rationale**: Follows established naming convention (`us{N}-{feature}.test.js`). Separate file keeps tests isolated and easy to run individually.

# Research: Tap-to-Select (006)

## Finding 1 — Current Implementation

**Decision**: Replace `<select>` dropdowns with a button grid; no structural changes needed elsewhere.

The current `newMatchFormHtml()` in `src/views/liveView.js` (lines 200–234) renders two `<select>` elements populated by `playerSelectOptions()`. The submit handler at line 518 reads `.value` from these selects. The form is toggled via `_newMatchExpanded` and refreshed by `refreshNewMatchForm()`.

**Rationale**: The select elements are fully contained within one function (`newMatchFormHtml`) and one submit handler. Replacing them requires changes only in these two locations plus new click handlers for player pick/deselect.

**Alternatives considered**: Keeping dropdowns with larger styling — rejected because dropdowns trigger native OS pickers on mobile, which obscure the screen and require extra taps.

---

## Finding 2 — Ephemeral State Pattern

**Decision**: Add `_pickStep`, `_selectedP1`, `_selectedP2` as module-level variables, following the existing pattern.

`liveView.js` already uses module-level ephemeral state (`_expandedCardId`, `_rosterExpanded`, `_addPlayerExpanded`, `_newMatchExpanded`) that is reset in `render()` and manipulated in the delegated click handler.

**Rationale**: Consistent with existing codebase conventions. No new patterns introduced.

**Alternatives considered**: Using data attributes on DOM elements to track state — rejected because existing code uses module variables for all ephemeral UI state.

---

## Finding 3 — Test Impact

**Decision**: All e2e test files with `startMatch` helpers must update from `selectOption` to `pick-player` clicks.

12 e2e test files reference `select[data-start-p1]` / `selectOption`. Each has a local helper function. One unit test (`tests/views/liveView.test.js:367`) asserts the presence of `<select>` elements.

**Rationale**: The selects are being removed, so all references must change. The pattern is mechanical: replace `selectOption({ label: name })` with click on `[data-action="pick-player"]` filtered by name.

**Alternatives considered**: Creating a shared test helper — rejected (YAGNI; each file already has its own helper and the change is a 2-line replacement).

---

## Finding 4 — Dead Code

**Decision**: `playerSelectOptions()` function (lines 57–62) becomes unused after this change and should be removed.

**Rationale**: It only served the `<select>` elements in `newMatchFormHtml()`. No other caller exists.

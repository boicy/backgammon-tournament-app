# Research: 013-cube-lozenges

## Status: Complete — no unknowns

All technical decisions are resolvable from direct codebase inspection. No external research required.

---

## Decision 1: Reuse existing `pick-btn` / `pick-btn--selected` CSS classes

**Decision**: The 7 cube value buttons will use the same `.pick-btn` and `.pick-btn--selected` CSS classes already used by the winner picker and player picker.

**Rationale**: The issue explicitly asks for lozenges "like the players". The `.pick-btn` class already provides pill-shaped buttons with correct touch targets (≥44px min-height), hover states, and selected highlight — no new styling pattern needed.

**Alternatives considered**: A custom button style was considered but rejected (YAGNI; existing class already satisfies the requirement and produces the exact visual match requested).

---

## Decision 2: Module-level state `_selectedCubeValue`

**Decision**: Add `let _selectedCubeValue = 1;` alongside the existing `_selectedWinner` state variable. Reset to `1` when the game recording form closes.

**Rationale**: The existing pattern for `_selectedWinner` is identical in shape — a scalar default, set on user interaction, read on submit, reset on form close. Mirroring this pattern keeps the code consistent and predictable.

**Alternatives considered**: Reading cube value from the DOM at submit time (current approach for the dropdown) — rejected because button state is managed via CSS class toggling, not DOM value attributes. A module-level variable is the correct pattern here.

---

## Decision 3: In-place class toggle for cube selection (no re-render)

**Decision**: When a cube lozenge is tapped, toggle `pick-btn--selected` directly on the DOM buttons (same technique as winner picker) rather than re-rendering the whole card.

**Rationale**: liveView already uses in-place DOM toggling for `_selectedWinner` to avoid losing button references during rapid clicks. The same approach must be used for cube selection to remain consistent and avoid double-mount issues documented in MEMORY.md.

**Alternatives considered**: Full card re-render on each tap — rejected; would require re-binding event listeners and risks the double-mount bug already documented.

---

## Decision 4: New `.cube-pick-grid` CSS container class

**Decision**: Wrap the 7 cube lozenge buttons in a `<div class="cube-pick-grid">`. Define `.cube-pick-grid` as a `flex-wrap: wrap` row with a small gap.

**Rationale**: The winner grid uses `.pick-winner-grid` which is styled for exactly 2 equal-width buttons. The cube grid needs 7 buttons that can wrap to a second row on narrow screens — a separate layout class is required. Reusing `.pick-winner-grid` would force equal full-width columns, which is inappropriate for 7 small values.

**Alternatives considered**: Inline style on the container — rejected (not consistent with the codebase's CSS class-based approach).

---

## Decision 5: No changes to `game.js` or scoring logic

**Decision**: `src/models/game.js` is unchanged. `VALID_CUBE_VALUES`, `calculateMatchPoints`, and `createGame` remain identical.

**Rationale**: The feature only changes how the user *selects* a cube value. The scoring calculation and data model are unaffected. This directly satisfies the constitution's Data Integrity principle.

---

## Files changed (summary)

| File | Change |
|------|--------|
| `src/views/liveView.js` | Add `_selectedCubeValue` state; replace `<select data-cube-value>` with lozenge buttons; add click handler; reset on close |
| `styles.css` | Add `.cube-pick-grid` layout class |
| `tests/views/liveView.test.js` | Unit tests for cube lozenge rendering and default state |
| `tests/e2e/us1-cube-lozenges.spec.js` | New e2e test file covering all 4 acceptance scenarios |

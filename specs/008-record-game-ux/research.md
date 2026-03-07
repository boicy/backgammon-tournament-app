# Research: Record Game UX — Winner Tap-Select & Prominent Save

## Decision 1: Winner selection pattern — buttons vs. other approaches

**Decision**: Two full-width tap-target buttons (one per player), same `.pick-btn` / `.pick-btn--selected` CSS pattern used in 006 (player pick) and 007 (target pick).

**Rationale**: The pattern is already proven and styled in this codebase. Players 006/007 demonstrate that large tap-target buttons reduce errors and are faster than dropdowns in a live tournament context. Reusing the same CSS classes maintains visual consistency across all three "pick" interactions (player, target, winner).

**Alternatives considered**:
- Keep `<select>` dropdown — rejected; it requires fine motor precision and extra taps.
- Radio buttons with labels — rejected; visually smaller, less finger-friendly, requires an extra click to confirm.
- Segmented control / toggle — effectively the same as two buttons; the pick-btn pattern is already present.

---

## Decision 2: Winner selection state scope

**Decision**: Single module-level `_selectedWinner = null` (stores a player ID string or null), reset to null whenever the inline form opens or closes.

**Rationale**: The spec (FR-005, FR-008 existing) guarantees only one game form is open at a time (`_expandedCardId`). Therefore a single ephemeral variable is sufficient — no per-card map needed. This keeps the implementation at the minimum complexity required.

**Alternatives considered**:
- Map keyed by match ID — rejected; over-engineered given single-form constraint.
- Store in DOM data attribute — rejected; DOM is the view, not the store; mixing state into DOM attributes makes testing harder.

---

## Decision 3: Winner buttons placement in form

**Decision**: Winner buttons appear at the top of the expanded game form, before result type and cube value selectors.

**Rationale**: The winner is the most important and most frequently varied field. Placing it first means the director's eye and thumb land on it immediately. Result type and cube value default to "standard" and "1" respectively — they need adjustment less often.

**Alternatives considered**:
- Winner at bottom (above submit) — rejected; the save button should be the last thing tapped, not sandwiched.
- Winner inline with other fields — rejected; two large buttons need a full-width row to be usable.

---

## Decision 4: Save button prominence

**Decision**: Make the submit button full-width (`width: 100%`) with `min-height: 48px`, larger font-size, and the existing `btn-primary` amber styling already used elsewhere in the app.

**Rationale**: Full-width is the standard CTA pattern on mobile. The amber `btn-primary` colour already signals "primary action" in this app's design language (004-ux-redesign). No new colour or style concept needed — just size increase.

**Alternatives considered**:
- Floating/fixed bottom button — rejected; over-engineered for an inline form inside a card.
- Separate "Review" step before save — rejected; adds friction, not requested.

---

## Decision 5: No-winner-selected validation

**Decision**: Block form submission client-side if `_selectedWinner` is null; show an inline error message within the form (reusing the existing `[data-match-error]` / `[data-error]` pattern).

**Rationale**: The spec requires FR-006 (blocked submission + error message). The existing error display pattern in liveView.js already handles inline messages. Reuse it rather than invent a new mechanism.

**Alternatives considered**:
- Disable submit button until winner selected — simpler but gives no feedback about *why* it's disabled. Rejected in favour of the explicit error message per FR-006.
- Both (disable + message) — acceptable but over-engineered; message alone is sufficient.

---

## No New Dependencies

This feature requires zero new packages, files, or architectural changes. All work is confined to:
- `src/views/liveView.js` — replace `[data-game-winner]` select with pick-winner buttons; add `_selectedWinner` state; update submit handler; update inline form HTML generator.
- `styles.css` — add `.pick-winner-grid` layout (2-column, full-width); enlarge `.live-card__form [data-action="submit-game"]` to full-width 48px+ CTA.
- `tests/views/liveView.test.js` — unit tests for new winner-pick interaction.
- `tests/e2e/us8-record-game-ux.test.js` — new Playwright e2e tests for US1+US2.
- 6 existing e2e helper files — update `selectOption` on `[data-game-winner]` to `click` on `[data-action="pick-winner"]`.

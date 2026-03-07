# Feature Specification: Cancel New Match Creation

**Feature Branch**: `011-cancel-new-match`
**Created**: 2026-03-07
**Status**: Draft
**Input**: User description: "No way to stop creating a match — add a cancel action or some other way to exit the new match creation flow once started"

## Clarifications

### Session 2026-03-07

- Q: Is the cancel mechanism a new dedicated button inside the form, or does the existing toggle button serve as the primary cancel affordance? → A: Add a new dedicated "Cancel" button inside the form at every step (pick P1, pick P2, confirm).
- Q: During pick steps 1 and 2, should users be able to deselect a single player and stay in the flow, or does Cancel always reset everything and close the form? → A: Both — users can deselect P1 individually to go back one step and pick a different player, plus Cancel exits the flow entirely.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cancel During Player Selection (Priority: P1)

A user opens the new match form and picks a player (or two), then changes their mind. They want to abandon the match creation entirely and return to the default live view. A dedicated "Cancel" button is present at every step of the flow (pick P1, pick P2, confirm), giving users an explicit, always-visible exit path.

**Why this priority**: This is the core issue. Without a cancel path, users are stuck in a partially-completed flow with no escape other than refreshing the page. It directly blocks normal app usage.

**Independent Test**: Open the new match form, pick at least one player, press the Cancel button, and verify the form closes with no match started and no players selected.

**Acceptance Scenarios**:

1. **Given** the new match form is open and no players have been picked, **When** the user presses Cancel, **Then** the form closes and the live view returns to its default state.
2. **Given** the new match form is open and P1 has been picked (pick step 1 complete), **When** the user presses Cancel, **Then** the form closes, no match is started, and the P1 selection is cleared.
3. **Given** the new match form is open and both P1 and P2 have been picked (at confirm step), **When** the user presses Cancel, **Then** the form closes, no match is started, and both player selections are cleared.

---

### User Story 2 - Deselect a Player to Go Back One Step (Priority: P2)

A user has picked P1 but wants to choose a different player. Rather than cancelling the entire flow, they can deselect P1 to return to step 1 and pick again. Similarly, at the confirm step, they can deselect either player to return to the pick flow.

**Why this priority**: Reduces friction when a user makes a mis-tap during player selection. Avoids forcing a full cancel-and-restart for a minor correction, without adding undue complexity.

**Independent Test**: Pick P1, then deselect P1 — verify the form returns to step 1 with no player selected and the pick grid is active again.

**Acceptance Scenarios**:

1. **Given** the form is at pick step 2 (P1 selected, awaiting P2), **When** the user deselects P1, **Then** the form returns to pick step 1 with no player selected.
2. **Given** the form is at the confirm step (both players selected), **When** the user deselects P1 or P2, **Then** the form returns to the pick flow with the remaining selection retained where possible.
3. **Given** the form is at pick step 1 (no players selected), **Then** no deselect action is available.

---

### User Story 3 - Fresh State on Re-open (Priority: P3)

A user closes and re-opens the new match form (e.g., by toggling it closed and open again). When they re-open it, any previously selected players should be gone and the form should start fresh.

**Why this priority**: Ensures the toggle action is a reliable escape hatch so users are never surprised by stale state on re-open.

**Independent Test**: Pick a player, close the new match form via toggle, re-open it, and verify no prior selections are shown.

**Acceptance Scenarios**:

1. **Given** P1 has been picked and the form is open, **When** the user toggles the form closed, **Then** the pick state is reset.
2. **Given** the form was previously closed with a partial selection, **When** the user re-opens the form, **Then** the form starts at step 1 with no players pre-selected.

---

### Edge Cases

- What happens if the user presses Cancel immediately after opening the form (no players picked yet)? The form should close cleanly with no side effects.
- What happens if the user presses Cancel at the confirm step after having selected both players and a target? All selections (P1, P2, target) should be cleared.
- What happens when a player is deselected from the confirm step — is the target value (e.g., 3, 5, 7) also cleared? Assumed: target is cleared and user returns to the pick flow from step 1.
- Keyboard shortcuts (e.g., Escape key) are not required; the Cancel button and deselect controls are the only required exit paths.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A dedicated "Cancel" button MUST be present and visible at every step of the new match creation flow (step 1: pick P1, step 2: pick P2, step 3: confirm).
- **FR-002**: Pressing the Cancel button MUST close the new match form and return the user to the default live view state.
- **FR-003**: Pressing the Cancel button MUST clear all in-progress player selections (P1, P2) and any chosen target value.
- **FR-004**: No match MUST be created as a result of pressing Cancel.
- **FR-005**: After cancellation, the user MUST be able to immediately re-open the new match form in a fresh state and start a new match creation attempt.
- **FR-006**: Closing the new match form by toggling it closed MUST also reset any in-progress player selections.
- **FR-007**: At pick step 2 (P1 selected, awaiting P2), the user MUST be able to deselect P1 to return to pick step 1 without closing the form.
- **FR-008**: At the confirm step, the user MUST be able to deselect either player to return to the pick flow from step 1, clearing the target selection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can exit the new match creation flow at any step (pick P1, pick P2, or confirm) by pressing the Cancel button without starting a match.
- **SC-002**: 100% of cancel actions result in a clean reset — no partial state persists after cancellation.
- **SC-003**: The Cancel button is discoverable without instruction — users can identify and activate it on their first attempt.
- **SC-004**: After cancelling, a user can immediately begin a fresh match creation with no leftover selections from the previous attempt.
- **SC-005**: Users can correct a mis-selected player without cancelling the entire flow — deselecting returns them to the previous pick step.

## Assumptions

- The existing toggle button (`[data-action="toggle-new-match"]`) already closes and resets the form; this remains as a secondary implicit cancel but is not the primary affordance for this feature.
- No server-side state is affected by cancellation or deselection — this is purely client-side ephemeral state management.
- A keyboard shortcut (e.g., Escape key) is not required by this feature; the Cancel button and deselect controls are sufficient.
- The Cancel button should follow existing button style conventions (pill shape, consistent sizing) established in 009-button-style-consistency.
- When deselecting from the confirm step, the target value is cleared and the user returns to pick step 1 (full re-pick rather than partial retain).

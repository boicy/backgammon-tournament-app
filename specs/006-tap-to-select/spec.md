# Feature Specification: Tap-to-Select Player Grid

**Feature Branch**: `006-tap-to-select`
**Created**: 2026-03-06
**Status**: Draft
**Input**: User description: "Replace dropdown selects in the new-match form with a tap-to-select player button grid for faster, more mobile-friendly player selection."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Pick Two Players via Tap Grid (Priority: P1)

As a tournament director, I want to start a new match by tapping player name buttons instead of scrolling through dropdown menus, so that match setup is faster and easier on a mobile device.

**Why this priority**: This is the core interaction replacement. Without it, the feature has no value.

**Independent Test**: Add 3+ players, tap "+ New Match", verify a grid of player name buttons appears. Tap one name for Player 1, tap another for Player 2, verify both selections register and the match can be submitted.

**Acceptance Scenarios**:

1. **Given** a tournament with 3+ registered players, **When** the user taps "+ New Match", **Then** a grid of player name buttons appears with the prompt "Pick Player 1:".
2. **Given** the pick grid is showing, **When** the user taps a player name button, **Then** that player is selected as Player 1, the button shows selected styling, the prompt changes to "Pick Player 2:", and the selected player's button becomes non-tappable.
3. **Given** Player 1 is selected, **When** the user taps a second player name, **Then** both selected names appear in a confirmation row with "vs" between them, alongside the target score input and a Start button.
4. **Given** the confirmation row is showing with both players and a target score, **When** the user taps Start, **Then** a new active match card appears and the form collapses.

---

### User Story 2 — Deselect and Change Mind (Priority: P2)

As a tournament director, I want to be able to undo a player selection by tapping their name again, so I can correct mistakes without restarting the form.

**Why this priority**: Important for usability but the core flow works without it — the user can collapse and reopen the form to reset.

**Independent Test**: Pick two players to reach the confirmation step, tap one of the selected names, verify the selection is undone and the flow returns to the appropriate pick step.

**Acceptance Scenarios**:

1. **Given** both players are selected (confirmation step), **When** the user taps the Player 2 pill, **Then** Player 2 is deselected, the confirmation row disappears, and the prompt returns to "Pick Player 2:" with the pick grid showing.
2. **Given** both players are selected (confirmation step), **When** the user taps the Player 1 pill, **Then** Player 1 is deselected, Player 2 becomes Player 1, and the prompt returns to "Pick Player 2:".
3. **Given** only Player 1 is selected (step 2), **When** the user taps the Player 1 selected button, **Then** the selection is cleared and the prompt returns to "Pick Player 1:".

---

### Edge Cases

- What happens when only 2 players are registered? The grid shows exactly 2 buttons — the flow works identically.
- What happens when the roster changes mid-selection (player added or removed)? The grid re-renders with the updated roster. Any selection referencing a removed player is cleared.
- What happens when the user collapses the form via "+ New Match" toggle? All selections are reset. Reopening starts fresh at "Pick Player 1:".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display a grid of player name buttons when the new-match form is expanded, replacing the previous dropdown select elements.
- **FR-002**: The grid MUST be arranged in 2 columns to accommodate rosters of 4–8 players without scrolling.
- **FR-003**: The system MUST follow a 3-step flow: pick Player 1, pick Player 2, confirm and start.
- **FR-004**: A selected player's button MUST show distinct visual styling (highlighted/filled) and MUST NOT be tappable as a second pick.
- **FR-005**: After both players are selected, the system MUST display a confirmation row showing both names with "vs" between them, a target score input, and a Start button.
- **FR-006**: Tapping a selected player (in the confirmation row or the grid) MUST deselect them and return to the appropriate earlier step.
- **FR-007**: Collapsing the form (toggling "+ New Match") MUST reset all selections.
- **FR-008**: The "+ New Match" button MUST remain disabled when fewer than 2 players are registered (unchanged from current behaviour).
- **FR-009**: All existing e2e test helpers that start matches MUST be updated to use the new tap-based selection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can select two players and start a match in 3 taps (tap name, tap name, tap Start) — down from 5+ interactions with dropdowns.
- **SC-002**: Player selection buttons are large enough to tap comfortably on a 375px-wide screen (minimum 44px touch target height).
- **SC-003**: All existing e2e tests continue to pass after updating to the new interaction pattern, with no reduction in test coverage.
- **SC-004**: The full pick-and-start flow completes with no perceptible delay on each step transition.

## Assumptions

- Roster size is typically 4–8 players; a 2-column grid is sufficient without scrolling.
- The target score input and Start button behaviour remain unchanged — only the player selection mechanism changes.
- No data model, store, or routing changes are needed — this is a pure view-layer change.

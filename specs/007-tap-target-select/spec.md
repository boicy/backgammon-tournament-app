# Feature Specification: Tap-to-Select Target Score Grid

**Feature Branch**: `007-tap-target-select`
**Created**: 2026-03-06
**Status**: Draft
**Input**: User description: "I now want to update the match targets in the same way as the player selection. most matches are up to odd numbers ranging from 3 to 21 points. I'd like to update target selection to use the same style as player selection with those most common targets available."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Pick Target Score via Tap Grid (Priority: P1)

As a tournament director, I want to set the match target score by tapping a button from a grid of common values instead of typing a number, so that target selection is as fast and touch-friendly as player selection.

**Why this priority**: This is the entire feature. Without it there is nothing to deliver.

**Independent Test**: Open the new-match form, pick two players to reach the confirmation step, verify a grid of target score buttons appears. Tap a target value, verify it is highlighted and the match can be started with that target.

**Acceptance Scenarios**:

1. **Given** two players are selected (confirmation step), **When** the confirmation row is displayed, **Then** a grid of target score buttons appears showing the values 3, 5, 7, 9, 11, 13, 15, 17, 19, and 21, with 7 pre-selected by default.
2. **Given** the target grid is visible with 7 pre-selected, **When** the user taps a different target button (e.g. 11), **Then** that button becomes highlighted and the 7 button returns to its unselected style.
3. **Given** a target button is selected, **When** the user taps Start, **Then** the match starts with the selected target score and the form collapses.
4. **Given** the form opens fresh (no previous selection), **When** the user taps Start without changing the pre-selected default, **Then** the match starts with a target of 7.

---

### Edge Cases

- What if the user never taps a target button? The default of 7 is pre-selected, so Start can always be tapped without explicit target selection.
- What if the user wants a non-preset target (e.g. 25 or 2)? Out of scope — only the 10 preset values are supported.
- What happens when the user collapses the form via "＋ New Match" toggle? Target resets to the default (7) when the form is reopened.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST replace the target score number-input field in the confirmation step with a grid of tap-to-select buttons.
- **FR-002**: The grid MUST display exactly the odd values 3, 5, 7, 9, 11, 13, 15, 17, 19, and 21 as individual tappable buttons.
- **FR-003**: The button for value 7 MUST be pre-selected (highlighted) when the confirmation step first appears.
- **FR-004**: Tapping any target button MUST immediately select it and deselect the previously selected button.
- **FR-005**: The selected target button MUST show the same distinct visual styling (highlighted/filled) as selected player buttons.
- **FR-006**: The Start button MUST use the currently selected target score when starting the match.
- **FR-007**: Collapsing the form (toggling "＋ New Match") MUST reset the target selection to 7 on the next open.
- **FR-008**: All existing e2e test helpers that start matches MUST be updated to use the new tap-based target selection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can select a target score in a single tap — down from typing a multi-digit number (e.g. "11") which requires 2–3 keystrokes.
- **SC-002**: Target selection buttons are large enough to tap comfortably on a 375px-wide screen (minimum 44px touch target height), matching the player button sizing.
- **SC-003**: All existing e2e tests continue to pass after updating to the new interaction pattern, with no reduction in test coverage.
- **SC-004**: The complete pick-P1, pick-P2, pick-target, start flow completes with no perceptible delay at each step.

## Assumptions

- The 10 preset values (3, 5, 7, 9, 11, 13, 15, 17, 19, 21) cover the full range of targets used in practice.
- The default pre-selected value is 7, matching the current input default.
- This is a pure view-layer change — no data model, store, or routing changes are needed.
- Button visual styling reuses the existing pick-button CSS introduced in 006-tap-to-select to maintain visual consistency.

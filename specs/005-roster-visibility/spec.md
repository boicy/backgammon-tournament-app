# Feature Specification: Roster Visibility

**Feature Branch**: `005-roster-visibility`
**Created**: 2026-03-06
**Status**: Draft
**Input**: User description: "When I add players to a tournament, then I can't see the players names that I've added. I'd like to be able, just the number of players added. It would be good to see the names added as well."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — See Added Player Names in Roster (Priority: P1)

After adding one or more players to a tournament, the director wants to confirm which players are registered by viewing their names. Currently the roster toggle only shows a count (e.g., "3 players") but expanding it does not clearly display the individual names in an easily scannable way.

**Why this priority**: The director needs confidence that the right players are entered before starting matches. Seeing only a number gives no assurance that names were typed correctly.

**Independent Test**: Add 3 players by name, expand the roster, verify all 3 names are visible and legible.

**Acceptance Scenarios**:

1. **Given** a tournament with 2 or more players added, **When** the director expands the roster, **Then** a list of all registered player names is displayed, one per row.
2. **Given** the roster is expanded, **When** a new player is added, **Then** the new player's name appears in the roster list immediately without requiring a manual refresh.
3. **Given** the roster is expanded, **When** the director collapses the roster, **Then** the name list hides and only the count is shown.

---

### User Story 2 — Player Count Always Visible at a Glance (Priority: P2)

Even when the full name list is collapsed, the director can always see how many players are registered without any interaction.

**Why this priority**: The count is a quick sanity check before starting a match. It must remain visible at all times in the collapsed state.

**Independent Test**: Add 4 players, collapse the roster, verify the toggle shows "4 players" without expanding.

**Acceptance Scenarios**:

1. **Given** players have been added to the tournament, **When** the director views the Live view with the roster collapsed, **Then** the roster toggle clearly shows the current number of registered players (e.g., "4 players").
2. **Given** 0 players have been added, **When** the director views the Live view, **Then** the toggle shows "0 players".
3. **Given** a new player is added while the roster is collapsed, **When** the addition is confirmed, **Then** the count on the roster toggle increments immediately.

---

### Edge Cases

- When a player is removed, their name disappears from the expanded list and the count decrements immediately.
- With many players (10+), the roster list should scroll rather than push other UI off-screen.
- Very long player names should truncate gracefully rather than breaking the layout.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The roster toggle MUST always display the current player count in the collapsed state.
- **FR-002**: When the roster is expanded, the system MUST display the full name of every registered player as a list.
- **FR-003**: The player name list MUST update immediately when a player is added or removed, without requiring any manual action from the director.
- **FR-004**: The roster MUST support toggling between collapsed (count only) and expanded (count + names) states.
- **FR-005**: Player names in the expanded list MUST be presented one per row in a scannable, readable format.

### Key Entities

- **Roster**: The set of players registered for the active tournament. Shows count when collapsed; shows full name list when expanded.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The director can confirm all registered player names within 2 taps of opening the Live view.
- **SC-002**: The player count is visible at all times on the Live view without any interaction required.
- **SC-003**: Adding or removing a player updates both the count and the name list with no perceptible delay.
- **SC-004**: The roster name list is readable on a 375px-wide phone screen with no horizontal scrolling required.

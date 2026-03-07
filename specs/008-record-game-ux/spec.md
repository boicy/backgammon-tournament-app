# Feature Specification: Record Game UX — Winner Tap-Select & Prominent Save

**Feature Branch**: `008-record-game-ux`
**Created**: 2026-03-06
**Status**: Draft
**Input**: User description: "Two new features, the first is to make selecting the winner of a game use the same easy to use button selection as adding players. the second is to make the save button more of a call to action rather than a rather small thing."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Tap to Select Game Winner (Priority: P1)

When a tournament director records a game result, instead of choosing the winner from a dropdown list, they tap one of two large buttons — one per player — to instantly select who won. The selection is visually obvious and requires no fine motor precision.

**Why this priority**: The winner-select is the most frequent interaction in the app (every game recorded requires it). Reducing friction here has the biggest impact on usability during live tournament play, when the director may be operating under time pressure with a phone in one hand.

**Independent Test**: Open an active match card, expand the inline game form, and confirm that two large tap-target buttons labelled with each player's name are present instead of a winner dropdown. Tapping one highlights it as the winner. The form can then be submitted with that selection.

**Acceptance Scenarios**:

1. **Given** an active match card with the inline game form collapsed, **When** the director taps "Record Game", **Then** the form shows two large buttons — one for each player — instead of a winner dropdown.
2. **Given** the form is open with no winner selected, **When** the director taps Player A's button, **Then** Player A's button is visually highlighted as selected and Player B's button is not.
3. **Given** Player A is selected, **When** the director taps Player B's button, **Then** Player B becomes selected and Player A is deselected (only one winner at a time).
4. **Given** a winner is selected, **When** the director taps the same button again, **Then** the selection is deselected (toggle off), leaving no winner chosen.
5. **Given** no winner is selected, **When** the director taps the Save button, **Then** submission is blocked and a clear error message indicates a winner must be chosen.

---

### User Story 2 — Prominent Save / Record Button (Priority: P2)

The button that submits a recorded game result is visually prominent — styled as a clear call to action with sufficient size and contrast — so the director can find and tap it confidently without hunting for it.

**Why this priority**: The save button is the final step of every game-recording flow. If it's hard to spot, the director hesitates or mis-taps. Making it prominent reduces errors and speeds up the workflow. It's lower priority than US1 because it's a visual enhancement rather than a structural interaction change.

**Independent Test**: Open an active match card, expand the inline game form, and confirm the save/submit button is visually distinct from secondary controls (result type, cube value) — larger, higher-contrast, or full-width — and meets a minimum touch-target height.

**Acceptance Scenarios**:

1. **Given** the inline game form is expanded, **When** the director views the form, **Then** the save button is visually larger and higher-contrast than surrounding secondary controls (result type, cube value).
2. **Given** the form is open on a mobile-sized viewport (375px wide), **When** the director views the save button, **Then** the button is at least 48px tall and clearly distinguishable as the primary action.
3. **Given** the save button is visible, **When** the director completes the form and taps Save, **Then** the game is recorded, the score updates, and the form collapses — same behaviour as before, just easier to trigger.

---

### Edge Cases

- What happens if a player name is very long (e.g. 20+ characters)? Buttons should wrap or truncate gracefully without breaking layout.
- Can the director change their winner selection before saving? Yes — tapping the other player's button must switch the selection without any confirmation step.
- What if the form is submitted with result-type/cube at their defaults? That is valid — defaults apply as they do today.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game-recording form MUST present two tappable buttons (one per player) for winner selection, replacing the existing winner dropdown.
- **FR-002**: Each winner-selection button MUST display the player's name as its label.
- **FR-003**: Tapping a winner button MUST visually highlight it as selected; the other button MUST appear unselected.
- **FR-004**: Tapping the currently selected winner button MUST deselect it (toggle behaviour), leaving no winner chosen.
- **FR-005**: Only one winner button MAY be selected at a time.
- **FR-006**: Submitting the form without a winner selected MUST be blocked, with an inline error message directing the director to choose a winner.
- **FR-007**: The save/submit button MUST be styled as the primary call-to-action — visually larger and higher-contrast than secondary controls in the form.
- **FR-008**: The save button MUST meet a minimum touch-target height of 48px on all supported viewports.
- **FR-009**: All existing game-result fields (result type, cube value) MUST remain present and functional in the form.
- **FR-010**: The submitted winner value MUST be recorded correctly regardless of which player was listed first when the match was started.

### Key Entities

- **Game Result**: Winner player ID, result type (standard/gammon/backgammon), cube value — unchanged from current model.
- **Winner Selection State**: Ephemeral UI state tracking which player (if any) is currently highlighted as the winner; cleared when the form closes or a game is submitted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A tournament director can select a game winner and tap Save in 2 taps or fewer (tap winner button → tap Save), down from the current minimum of 3 interactions (open dropdown → select option → tap Save).
- **SC-002**: The save button meets a minimum 48px touch-target height on a 375px-wide viewport.
- **SC-003**: Zero data loss — all previously recordable game results (standard, gammon, backgammon; any cube value) remain recordable after the change.
- **SC-004**: Winner-selection buttons render legibly for player names up to 24 characters without overflowing their card bounds.

## Assumptions

- The inline game form currently contains a winner dropdown, a result-type selector, and a cube-value selector; all three remain in the redesigned form — only the winner input changes from dropdown to buttons.
- "Same easy to use button selection as adding players" refers to the large tap-target pill/button pattern introduced in features 006 and 007 (player and target pick grids).
- The save button CTA enhancement applies only to the inline game-recording form, not to other forms (new match, add player) unless separately requested.
- Default winner state when the form opens is "no winner selected" — the director must always make an explicit choice.
- The winner buttons appear at the top of the form, above result type and cube value, so the most critical choice is the first thing the director sees.

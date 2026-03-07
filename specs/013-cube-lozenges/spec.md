# Feature Specification: Cube Value Lozenge Selector

**Feature Branch**: `013-cube-lozenges`
**Created**: 2026-03-07
**Status**: Draft
**Input**: GitHub Issue #17 — "Cube scores should show as lozenges like the players"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Select Cube Value via Lozenges (Priority: P1)

When recording a game, a player wants to indicate the cube multiplier that was in play. Instead of opening a dropdown and scrolling to find the right value, they tap a clearly visible lozenge button showing the cube value. The selected lozenge is visually highlighted so it is immediately obvious which multiplier is active.

**Why this priority**: This is the core interaction change requested in the issue. Without it, the feature has no value. It also directly reduces friction in the most frequent recording action.

**Independent Test**: Start a match, open the inline game recording form, and verify that cube value options appear as tappable buttons (not a dropdown). Selecting a button highlights it and submitting the game records the correct multiplier.

**Acceptance Scenarios**:

1. **Given** the inline game recording form is open, **When** the user views the cube multiplier section, **Then** all available cube values (1, 2, 4, 8, 16, 32, 64) are displayed as individual tappable buttons in a horizontal row or wrapping grid.
2. **Given** the game recording form has just opened, **When** no cube selection has been made, **Then** the value "1" (no cube) is pre-selected and visually distinguished from the other values.
3. **Given** the user has tapped a cube value lozenge, **When** viewing the form, **Then** the tapped value is highlighted and all others are unselected — only one value can be active at a time.
4. **Given** a cube value is selected, **When** the user submits the game, **Then** the game is recorded with that cube multiplier applied to the score.

---

### User Story 2 - Consistent Visual Language with Player Picker (Priority: P2)

The cube value buttons should look and behave like the player-picker lozenges already used elsewhere in the recording flow, so the interface feels cohesive and learnable.

**Why this priority**: The issue explicitly calls out "like the players" as the target visual pattern. Consistency reduces cognitive load. However, the feature works without perfect visual parity — functional parity with the player picker is a quality improvement, not a blocker.

**Independent Test**: Open the new-match player picker and the game recording form side by side (or in sequence). Verify the cube lozenge buttons share the same visual style (size, shape, selected/unselected states) as the player-picker buttons.

**Acceptance Scenarios**:

1. **Given** a user familiar with the player-picker lozenges, **When** they see the cube value buttons, **Then** the selected and unselected visual states match those used in the player picker.
2. **Given** the game recording form is displayed on a small mobile screen, **When** all 7 cube values are shown, **Then** all buttons are reachable without horizontal scrolling (they may wrap to a second row).

---

### Edge Cases

- The cube value resets to 1 each time the game recording form is opened, including for subsequent games within the same match. Users must explicitly re-select a cube value each game.
- If all 7 lozenge buttons cannot fit in a single row on narrow screens, they wrap to a second row rather than requiring horizontal scrolling.
- No validation is enforced at selection time — any cube value (including values larger than the remaining points needed) may be selected.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game recording form MUST display cube multiplier options as individually tappable lozenge buttons rather than a dropdown control.
- **FR-002**: The available cube values MUST be: 1, 2, 4, 8, 16, 32, 64 (seven options, matching the current scoring model).
- **FR-003**: Exactly one cube value MUST be selected at any given time; the selected value MUST be visually distinguished from unselected values.
- **FR-004**: The cube value selection MUST default to 1 (no cube applied) each time the game recording form is opened.
- **FR-005**: Tapping a cube lozenge MUST immediately update the selection without requiring any additional confirmation step.
- **FR-006**: The existing cube multiplier dropdown MUST be removed and replaced entirely by the lozenge buttons.
- **FR-007**: The cube value chosen via lozenge MUST be submitted with the game record and correctly applied to the match score calculation.

### Assumptions

- The available cube values are 1, 2, 4, 8, 16, 32, 64 (7 values). Although the issue mentioned 128, it has been explicitly confirmed out of scope — the current scoring model caps at 64.
- The cube value resets to 1 each time the recording form is opened (safe default; avoids accidentally inheriting a previous game's cube value).
- No validation is applied at selection time — any cube value may be selected regardless of match state.

## Clarifications

### Session 2026-03-07

- Q: Should 128 be included as a cube value (issue listed it; current model caps at 64)? → A: No — keep 7 values: 1, 2, 4, 8, 16, 32, 64.
- Q: Should the cube value reset to 1 or carry over when recording a second game in the same match? → A: Reset to 1 each time the form opens.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can select a cube multiplier with a single tap — no dropdown open/scroll/select sequence required.
- **SC-002**: The active cube value is identifiable at a glance without reading all button labels (visual distinction is sufficient).
- **SC-003**: All 7 cube value buttons are visible and tappable on a standard mobile screen without horizontal scrolling.
- **SC-004**: The cube lozenge buttons share the same visual style as the player-picker lozenges, so a user familiar with one can use the other without instruction.
- **SC-005**: Submitting a game with a non-1 cube value correctly reflects the multiplied score in the match standings.

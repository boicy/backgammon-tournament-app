# Feature Specification: Consistent Action Button Styling

**Feature Branch**: `009-button-style-consistency`
**Created**: 2026-03-07
**Status**: Draft
**Input**: GitHub Issue #11 — Add player, start match and record game buttons don't look good. Buttons are inconsistently styled (different sizes etc) which is jarring. Should be at least the same size and ideally rounded like the player name lozenges.

## Clarifications

### Session 2026-03-07

- Q: Are the "pick-winner" buttons and other button-like tappable elements (deselect pills, overflow trigger) in scope, or only the three submit buttons? → A: All button-like tappable elements — including pick-winner buttons, deselect pills, and overflow trigger — are in scope.
- Q: Should button colour/fill match the player lozenges, stay unchanged, or be unified across all tappable controls with their own consistent palette? → A: Unify colour/fill across all tappable controls with a consistent palette, independent of the lozenge colour.
- Q: Should tappable controls be full-width (filling their container) or auto-width (fitting their label)? → A: Full-width — all tappable controls stretch to fill their container.
- Q: Should the unified colour palette include semantic variants, or use one colour for everything? → A: Two variants — a standard colour for primary actions and a distinct colour for destructive actions (e.g., Reset Tournament).
- Q: Should the unified style apply to the Live view only, or app-wide across all views? → A: App-wide — apply the unified style to all tappable controls across every view.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Uniform Tappable Control Size Across the App (Priority: P1)

A club member navigates through the app — the Live view, Standings, History, and Club views. In every view, all tappable controls (submit buttons, pick-winner buttons, deselect pills, overflow trigger) appear the same height with consistent padding and font size, so the entire app feels coherent rather than cobbled together.

**Why this priority**: Size inconsistency is the primary complaint and the most visually jarring issue. Fixing this alone delivers a noticeably more polished experience across the whole app.

**Independent Test**: Can be fully tested by visiting each view, expanding interactive sections, and visually comparing all tappable controls. Delivers a consistent-looking app.

**Acceptance Scenarios**:

1. **Given** a tournament is active and the Live view is open, **When** the user expands the "Add Player" form, **Then** the submit button has the same height and padding as the "Start Match" and "Record Game" buttons.
2. **Given** a match is in progress, **When** the user opens the inline game recording form, **Then** the "Save Game" submit button, the pick-winner buttons, and the deselect pills are all the same height.
3. **Given** any two tappable controls are visible simultaneously, **When** the user views them side by side, **Then** they appear identical in height and horizontal padding.

---

### User Story 2 - Rounded Style Matching Player Lozenges (Priority: P2)

A club member notices that player name tags in the roster and pick grid are displayed as rounded pill-shaped lozenges. Across every view of the app, all tappable controls — submit buttons, pick-winner buttons, deselect pills, and the overflow trigger — adopt the same rounded style, making the entire app feel intentionally designed.

**Why this priority**: Visual harmony with existing UI elements (player lozenges) elevates perceived quality, but the app is usable without this. Uniform size (P1) must come first.

**Independent Test**: Can be fully tested by comparing the visual rounding of all tappable controls across all views against player name lozenges. Delivers a visually cohesive app.

**Acceptance Scenarios**:

1. **Given** a tournament with players, **When** the user views the Live view, **Then** all tappable controls have a rounded (pill or strongly rounded) appearance consistent with the player name lozenges.
2. **Given** the pick grid is visible during new match setup, **When** the user views player lozenges alongside the "Start Match" button and pick-player buttons, **Then** all elements share the same visual rounding style.
3. **Given** a game is being recorded, **When** the user views the inline form, **Then** the pick-winner buttons, deselect pills, and submit button all share the same rounding style.

---

### Edge Cases

- Buttons inside collapsed/hidden sections must remain consistently styled when their section is expanded — no size or shape regression from collapsed state.
- Tappable controls that appear inside match cards (inline game forms) must match the global style without breaking the card layout.
- On narrow mobile viewports, all tappable controls must remain fully readable and tappable at their uniform size without overflowing their containers.
- The overflow trigger (☰ / "..." style control) must remain recognisable as an overflow affordance even after rounding is applied.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All tappable controls across every view of the app — including submit buttons (Add Player, Start Match, Save/Record Game), pick-winner buttons, deselect pills, and the overflow trigger — MUST have a uniform height, consistent horizontal padding, and stretch to fill their container width.
- **FR-002**: All tappable controls MUST share a consistent rounded appearance.
- **FR-003**: The rounded style of tappable controls MUST visually match the rounding used on player name lozenges in the roster list and pick grid.
- **FR-004**: All tappable controls MUST use a unified colour palette with at least two semantic variants: a standard variant for primary actions (Add Player, Start Match, Save Game, pick-winner, deselect, overflow), a distinct danger variant for destructive actions (Reset Tournament, End Tournament), and optionally a neutral variant for non-CTA toggle and cancel controls (e.g., New Match toggle, Cancel button). No ad-hoc colours outside these defined variants are permitted.
- **FR-005**: Styling changes MUST NOT alter the functionality or event handling of any tappable control.
- **FR-006**: All tappable controls MUST meet standard accessibility guidelines for touch target size on touch devices.
- **FR-007**: The consistent style (shape, size, and colour) MUST apply across all interactive states: default, highlighted, and pressed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All tappable controls (submit buttons, pick-winner buttons, deselect pills, overflow trigger) appear the same height and fill the full width of their container when rendered — verifiable by visual inspection.
- **SC-002**: The rounded appearance of all tappable controls visually matches the rounded appearance of player name lozenges — verifiable by visual inspection.
- **SC-003**: All tappable controls use one of the defined colour variants — standard (primary actions), danger (destructive actions), or neutral (toggle and cancel controls) — with no controls using ad-hoc colours outside this scheme — verifiable by visual inspection.
- **SC-004**: No existing button, form submission, or interactive behaviour changes after styling is applied — all existing functionality continues to work correctly.
- **SC-005**: All tappable controls remain fully readable and non-overflowing at the minimum supported viewport width (320px).

## Assumptions

- "Player name lozenges" refers to the pill/rounded tags used to display player names in the roster list and the pick-player grid on the Live view.
- "Tappable controls" encompasses all interactive button-like elements across every view: submit buttons (Add Player, Start Match, Save/Record Game), pick-winner tap-to-select buttons, deselect pills, and the overflow trigger. This includes any equivalent controls in the Standings, History, and Club views.
- No new control variants are introduced — this feature resettles existing controls into a shared style, not a full design-system overhaul.
- Visual consistency encompasses matching height, padding, rounded appearance, and a unified colour palette across all tappable controls. The palette uses three defined variants: standard (amber accent), danger (red), and neutral (surface/secondary) for toggle and cancel controls.

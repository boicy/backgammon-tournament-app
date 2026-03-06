# Feature Specification: UX Redesign — Scoreboard-Style Tournament Director Interface

**Feature Branch**: `004-ux-redesign`
**Created**: 2026-03-06
**Status**: Draft
**Input**: User description: "UX Redesign: Scoreboard-style tournament director interface with simplified navigation, inline game recording, and modern sport-broadcast visual design"

## Clarifications

### Session 2026-03-06

- Q: Where is the game log visible on the Live view? → A: Show only a game count on the collapsed card (e.g., "Game 5"), no log table on the Live view. Full game log is available in the History tab.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Live Match Monitoring (Priority: P1)

The tournament director glances at their phone to see all active matches and their current scores. Match cards are large, high-contrast, and readable from a short distance. Scores are the dominant visual element. The director can see 2–3 active matches without scrolling on a phone screen.

**Why this priority**: This is the primary activity for 90% of the night. If the director can't instantly see match status, the app fails its core purpose.

**Independent Test**: Can be tested by creating a tournament, adding players, starting 2–3 matches, and verifying the Live view displays all match scores prominently without scrolling on a 375px-wide viewport.

**Acceptance Scenarios**:

1. **Given** a tournament with 2 active matches, **When** the director opens the Live view on a phone (375px width), **Then** both match cards are fully visible without scrolling, showing player names and scores in large monospace text.
2. **Given** an active match at 3–5 of 7 after 4 games played, **When** the director views the Live tab, **Then** the score "3 — 5" is the most prominent element on the card, with "of 7" shown smaller beneath, and a game count (e.g., "Game 5") is visible.
3. **Given** no active matches, **When** the director views the Live tab, **Then** a clear empty state is shown with the "＋ New Match" button prominently available.

---

### User Story 2 — Inline Game Recording (Priority: P1)

The tournament director records a game result directly on the match card without navigating to a separate page. They tap "Record Game" on a match card, select winner/result/cube, submit, and the score updates in place. The form collapses after submission.

**Why this priority**: This is the second most frequent action. Eliminating the page navigation (current: tap Enter → record → tap Back) saves 2 taps per game and prevents losing context of other matches.

**Independent Test**: Can be tested by starting a match, tapping Record Game on its card, filling in winner/result/cube, submitting, and verifying the score updates and form collapses — all without leaving the Live view.

**Acceptance Scenarios**:

1. **Given** an active match card on the Live view, **When** the director taps "Record Game", **Then** an inline form expands within the card showing winner selector, result type selector, and cube value selector.
2. **Given** the inline game form is expanded, **When** the director submits a game (Alice wins, Gammon, cube 2), **Then** the form collapses, the match score updates immediately, and a brief visual pulse highlights the changed score.
3. **Given** the inline game form is expanded, **When** the director taps "Record Game" again (toggle) or taps outside the form area, **Then** the form collapses without recording.
4. **Given** a game is recorded that causes one player to reach the target score, **When** the score updates, **Then** the match card transitions to a "complete" state showing the winner, and the card moves to the Completed section.

---

### User Story 3 — Simplified Navigation (Priority: P1)

The app shows only 2 tabs during a tournament night: "Live" and "Standings". History, Club, and tournament management actions are tucked behind a hamburger menu. When no tournament is active, only the Start Tournament prompt and the menu are shown.

**Why this priority**: The current 4-tab navigation creates confusion about where to go. Simplifying to 2 tabs removes decision fatigue during a live night.

**Independent Test**: Can be tested by verifying the header shows exactly 2 tabs + menu during a tournament, and only the menu when no tournament is active.

**Acceptance Scenarios**:

1. **Given** an active tournament, **When** the director views the app, **Then** the header shows "Live" and "Standings" tabs plus a ☰ menu button.
2. **Given** the ☰ menu is tapped, **When** the menu opens, **Then** it shows: History, Club, a divider, End Tournament, and Reset Tournament.
3. **Given** no active tournament, **When** the director opens the app, **Then** the main area shows the Start Tournament prompt, the header shows only the app title and ☰ menu (no Live/Standings tabs), and the menu shows History and Club.
4. **Given** the director taps "End Tournament" in the menu, **When** the confirmation dialog appears and is accepted, **Then** the tournament is archived and the app returns to the Start Tournament state.

---

### User Story 4 — Sport-Broadcast Visual Refresh (Priority: P2)

The entire app is restyled with a dark, high-contrast "scoreboard" aesthetic: near-black backgrounds, electric amber accent color, system sans-serif fonts, and monospace scores. The visual style is bold and modern, optimized for quick scanning in dimly-lit club environments.

**Why this priority**: The visual refresh is important for the overall experience but doesn't change functionality. The layout and interaction changes (US1–3) deliver the core UX improvement; the visual skin enhances it.

**Independent Test**: Can be tested by viewing every screen (Start Tournament, Live, Standings, History, Club) and verifying the new color palette, typography, and card styles are applied consistently.

**Acceptance Scenarios**:

1. **Given** any page in the app, **When** the director views it, **Then** the background is near-black, text is high-contrast, and the accent color is amber.
2. **Given** a match card with a score, **When** the director views it, **Then** the score is displayed in a monospace font at large size in the amber accent color.
3. **Given** the Live view with active and completed matches, **When** the director views it, **Then** active cards have a left-edge amber accent bar and completed cards have a left-edge green accent bar with lower opacity.
4. **Given** any interactive element (button, form input, dropdown), **When** the director views it, **Then** it meets a minimum touch target size suitable for mobile use.

---

### User Story 5 — Standings with Live Match Indicators (Priority: P2)

The Standings view shows the leaderboard table with an additional "Live" column that displays active match scores for players currently in a match. This gives the standings page life even before any match completes.

**Why this priority**: Solves the "all zeros" problem where the leaderboard feels broken during early play. Enhances the director's ability to show standings to curious players.

**Independent Test**: Can be tested by starting matches, viewing Standings, and verifying the Live column shows current match info for active players and clears when matches complete.

**Acceptance Scenarios**:

1. **Given** Alice is in an active match vs Bob at 3–2, **When** the director views Standings, **Then** Alice's row shows "vs Bob 3–2" in the Live column, and Bob's row shows "vs Alice 2–3".
2. **Given** Charlie has no active match, **When** the director views Standings, **Then** Charlie's Live column shows "—" or is empty.
3. **Given** a match between Alice and Bob completes, **When** the director views Standings, **Then** the Live column clears for both players and the Wins/Points columns update.

---

### User Story 6 — Collapsible Player Management (Priority: P2)

Player management (add/remove) is collapsed by default on the Live view to save screen space. The tournament header shows a compact "N players" count with a "＋" button. Adding a player expands an inline input; viewing the roster expands the full list.

**Why this priority**: Player management is a setup activity done at the start of the night. It shouldn't compete with match cards for space during active play.

**Independent Test**: Can be tested by verifying the player roster is collapsed by default, the ＋ button expands the add-player form, tapping "N players" expands the roster, and both collapse appropriately.

**Acceptance Scenarios**:

1. **Given** a tournament with 4 players, **When** the Live view loads, **Then** the header shows "4 players" and a "＋" button, with no visible player list or input.
2. **Given** the player roster is collapsed, **When** the director taps "＋", **Then** a player name input and Add button appear inline; after adding a player, the input collapses and the player count increments.
3. **Given** the player roster is collapsed, **When** the director taps the "N players" text, **Then** the full roster expands showing each player with a Remove button.
4. **Given** the roster is expanded, **When** the director taps the "N players" text again, **Then** the roster collapses.

---

### User Story 7 — Collapsible New Match Form (Priority: P3)

Starting a new match is done via a "＋ New Match" button that expands an inline form. The form collapses after starting a match, keeping the Live view focused on active matches.

**Why this priority**: New matches are created occasionally throughout the night. The form should be accessible but not permanently visible.

**Independent Test**: Can be tested by tapping ＋ New Match, selecting players and target, starting the match, and verifying the form collapses and a new active match card appears.

**Acceptance Scenarios**:

1. **Given** the Live view, **When** the director taps "＋ New Match", **Then** an inline form expands showing Player 1, Player 2, and Target selectors.
2. **Given** the new match form is expanded, **When** the director selects two players and a target and submits, **Then** the form collapses and a new active match card appears.
3. **Given** fewer than 2 players registered, **When** the director views the Live view, **Then** the "＋ New Match" button is disabled.

---

### Edge Cases

- What happens when a match card's inline game form is open and a score update arrives from another source? The form should remain open with the score updated around it.
- What happens when the director taps Record Game on two different match cards? Only one form should be open at a time — opening a second closes the first.
- What happens on a very small screen (320px) with long player names? Names should truncate with ellipsis; scores must never be clipped.
- What happens when the hamburger menu is open and the director taps a nav tab? The menu should close.
- What happens if the director navigates to `#/match` (old route)? It should redirect to `#/live`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app header MUST show exactly 2 navigation tabs ("Live" and "Standings") and a ☰ menu button when a tournament is active.
- **FR-002**: The ☰ menu MUST contain: History, Club, a visual divider, End Tournament, and Reset Tournament.
- **FR-003**: When no tournament is active, the header MUST show only the app title and ☰ menu (no Live/Standings tabs).
- **FR-004**: The Live view MUST display all active matches as large score-centric cards with player names and current scores.
- **FR-005**: Active match cards MUST display scores in monospace font at large size as the dominant visual element.
- **FR-006**: Each active match card MUST have a "Record Game" button that expands an inline form (winner, result type, cube value) within the card.
- **FR-007**: After recording a game, the inline form MUST collapse and the score MUST update in place with a brief visual animation.
- **FR-008**: Only one match card's inline form may be expanded at a time.
- **FR-009**: Each active match card MUST provide an overflow menu with an "Abandon Match" option that requires confirmation.
- **FR-010**: The tournament header MUST show the tournament name, player count, and a "＋" add-player button on a single compact line.
- **FR-011**: The player roster MUST be collapsed by default and expandable by tapping the player count.
- **FR-012**: The "＋" add-player button MUST expand an inline input that collapses after adding a player.
- **FR-013**: A "＋ New Match" button MUST expand an inline form for starting a match, which collapses after submission.
- **FR-014**: Completed matches MUST appear in a muted section below active matches with a visual indicator distinguishing them from active matches.
- **FR-025**: Active match cards MUST display a game count (e.g., "Game 5") on the collapsed card. No game log table is shown on the Live view; the full game log is available in the History tab. *(Numbered FR-025 rather than FR-015 due to late clarification insertion; see Clarifications section.)*
- **FR-015**: The Standings view MUST include a "Live" column showing active match opponent and score for players currently in a match.
- **FR-016**: The "Live" column MUST clear when a match completes, and Wins/Points columns MUST update accordingly.
- **FR-017**: 2–3 active match cards MUST be fully visible without scrolling on a 375px-wide viewport.
- **FR-018**: All interactive elements MUST meet a minimum touch target size suitable for mobile use.
- **FR-019**: The `#/match` route MUST redirect to `#/live` for backward compatibility.
- **FR-020**: End Tournament and Reset Tournament actions MUST require a confirmation dialog before executing.
- **FR-021**: The app MUST use a dark, high-contrast color scheme with an amber accent across all views.
- **FR-022**: History and Club views MUST be restyled to match the new design system without structural changes to their functionality.
- **FR-023**: Card expand/collapse interactions MUST complete within 200ms.
- **FR-024**: Score updates MUST include a brief visual animation on the changed number.

### Key Entities

- **Match Card**: Visual representation of an active or completed match on the Live view. Contains player names, scores, target, and an expandable game-recording form. States: collapsed (showing score + Record Game button) or expanded (showing inline form).
- **Hamburger Menu**: Overlay menu accessible from the ☰ button. Contains secondary navigation (History, Club) and tournament management actions (End, Reset).
- **Tournament Header**: Compact bar at top of Live view showing tournament name, player count, and add-player affordance. Contains collapsible player roster.

## Assumptions

- The tournament director is the sole user interacting with the app during a night (single-device, single-user).
- 2–3 simultaneous active matches is the typical maximum; the UI is optimized for this range but should degrade gracefully for more.
- The existing data model, store, event bus, and localStorage format are unchanged — this is a view/CSS-only redesign.
- All existing business logic (match scoring, player validation, archiving) continues to work identically.
- The round-robin schedule feature is deprioritized — it may be removed from the Standings view and optionally moved behind the menu.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The tournament director can record a game result in 3 taps or fewer (tap Record Game → select winner → tap Submit), without navigating away from the Live view.
- **SC-002**: All active match scores (up to 3 matches) are visible without scrolling on a 375px-wide phone screen.
- **SC-003**: The navigation has exactly 2 visible tabs during a tournament night, reduced from 4.
- **SC-004**: Score text on match cards is readable at arm's length on a standard phone screen (large monospace, high-contrast on dark background).
- **SC-005**: All existing unit tests (models, store) continue to pass without modification.
- **SC-006**: All existing business logic and validation rules function identically to the previous version.
- **SC-007**: The app loads and renders the Live view within 1 second on a standard mobile connection.
- **SC-008**: The Standings view shows live match information for active players, eliminating the "all zeros" empty state during early tournament play.

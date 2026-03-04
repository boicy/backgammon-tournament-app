# Feature Specification: Named Tournaments & History

**Feature Branch**: `002-tournament-history`
**Created**: 2026-03-04
**Status**: Draft
**Input**: User description: "Named tournaments and history feature for the backgammon tournament tracker app. Each tournament gets a name. Past tournaments are archived when ended — via explicit End Tournament button or automatically when a new one starts. Past tournaments are viewable (read-only). A cross-tournament All-Time leaderboard shows tournament wins and cumulative match points per player. Persistent player roster with suggestions from previous tournaments."

## Clarifications

### Session 2026-03-04

- Q: Where do the Archive and All-Time leaderboard live in the navigation? → A: One new "Club" tab combines both — All-Time leaderboard at the top, list of past tournaments below it.
- Q: What happens to the existing "Reset Tournament" button? → A: Keep both — "End Tournament" archives and starts fresh; "Reset Tournament" retains its existing discard-without-archiving behaviour.
- Q: Should the Club tab be visible before any tournaments have been archived? → A: Always visible — shows current standings with 0 wins and an explanatory note until the first tournament is archived.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Name and Start a Tournament (Priority: P1)

When the organizer opens the app for a new evening, they give the tournament a name (e.g. "April Club Night") before adding players. The name makes the results feel official and identifiable when browsing history later.

**Why this priority**: Every other feature in this spec depends on tournaments having names. This is the minimum change required before anything else can be built, and it delivers immediate value — results stored in history are identifiable rather than anonymous.

**Independent Test**: Open the app → enter a tournament name → add two players → record a game → confirm the tournament name is displayed on the Players view. Delivers a named, identifiable tournament session.

**Acceptance Scenarios**:

1. **Given** the app is opened with no active tournament, **When** the organizer enters a tournament name and confirms, **Then** a new tournament with that name is created and the Players view is shown.
2. **Given** an active tournament is running, **When** the organizer views the Players page, **Then** the tournament name is displayed.
3. **Given** the organizer has not yet entered a name, **When** they attempt to proceed, **Then** the system requires a name before continuing (empty name is not accepted).
4. **Given** a tournament name has been entered, **When** the organizer refreshes the page, **Then** the tournament name is preserved.

---

### User Story 2 - End and Archive a Tournament (Priority: P1)

When the evening's play is complete, the organizer ends the tournament. It is saved to the archive and the app is ready for a fresh start next time. If the organizer simply starts a new tournament without explicitly ending the current one, the current tournament is archived automatically.

**Why this priority**: Archiving is the gateway to all history features. Without it, past results are destroyed on Reset and nothing accumulates over time.

**Independent Test**: Run a tournament with 2+ players and 1+ games → tap "End Tournament" → confirm it appears in the archive with its name, standings, and game history → confirm the app is ready for a new tournament name.

**Acceptance Scenarios**:

1. **Given** an active tournament with recorded games, **When** the organizer taps "End Tournament" and confirms, **Then** the tournament is saved to the archive and the app prompts for a new tournament name.
2. **Given** an active tournament, **When** the organizer starts a new tournament by providing a new name without explicitly ending the current one, **Then** the current tournament is automatically archived before the new one begins.
3. **Given** a tournament is archived, **When** the page is refreshed, **Then** the archived tournament is still present and accessible.
4. **Given** an active tournament with no players or no recorded games, **When** the organizer taps "End Tournament", **Then** the empty tournament is discarded without being added to the archive.

---

### User Story 3 - Browse Tournament Archive (Priority: P2)

The organizer or any player can browse past tournaments — seeing the final standings and full game history from each previous evening, in reverse chronological order.

**Why this priority**: Viewing history is the primary payoff for the archiving effort. Players want to look back at previous results. It is P2 because the archive must exist (US2) before it can be browsed.

**Independent Test**: Archive two completed tournaments → navigate to the Archive view → confirm both appear listed by name and date → tap into one → confirm its standings and game history are displayed correctly and are read-only.

**Acceptance Scenarios**:

1. **Given** one or more archived tournaments exist, **When** the Archive view is opened, **Then** all archived tournaments are listed with their name, date, and game count in reverse chronological order (most recent first).
2. **Given** the archive list is shown, **When** the organizer taps a tournament, **Then** the final standings and full game history for that tournament are displayed.
3. **Given** a past tournament is being viewed, **When** the organizer looks for controls to add a player or record a game, **Then** no such controls are present — the view is read-only.
4. **Given** no tournaments have been archived yet, **When** the Archive view is opened, **Then** an empty state message is shown.

---

### User Story 4 - View All-Time Leaderboard (Priority: P2)

A cross-tournament leaderboard shows cumulative performance across all evenings — how many tournament wins each player has, and their total match points across all tournaments combined.

**Why this priority**: This transforms the app from a single-evening tool into a club league tracker. It requires the archive to be meaningful, so it is P2 alongside browsing.

**Independent Test**: Archive two tournaments where different players won each → open the All-Time leaderboard → confirm tournament wins and cumulative match points are correctly totalled per player across both tournaments.

**Acceptance Scenarios**:

1. **Given** multiple tournaments have been played, **When** the All-Time leaderboard is viewed, **Then** each player is shown with their total tournament wins and total cumulative match points across all archived tournaments plus the current active one.
2. **Given** two players have the same number of tournament wins, **When** the All-Time leaderboard is viewed, **Then** the player with more cumulative match points ranks higher.
3. **Given** a new game is recorded in the active tournament, **When** the All-Time leaderboard is viewed, **Then** the active tournament's results are reflected immediately without requiring it to be archived first.
4. **Given** a player participated in some but not all tournaments, **When** the All-Time leaderboard is viewed, **Then** only the tournaments they participated in contribute to their stats.

---

### User Story 5 - Player Roster Suggestions (Priority: P3)

When setting up a new tournament, the organizer sees name suggestions from all previous tournaments, so regular club members can be added quickly without retyping their names.

**Why this priority**: Quality-of-life improvement for regular use. The tournament can function perfectly without it — it just removes typing friction for returning players.

**Independent Test**: Archive one tournament with player "Alice" → start a new tournament → begin typing "Al" in the player name field → confirm "Alice" appears as a suggestion → select it → confirm Alice is added without typing her full name.

**Acceptance Scenarios**:

1. **Given** previous tournaments exist with registered players, **When** the organizer types in the player name field on a new tournament, **Then** matching names from the persistent roster are shown as suggestions.
2. **Given** roster suggestions are shown, **When** the organizer selects a suggested name, **Then** that player is added to the current tournament.
3. **Given** the organizer types a name not in the roster, **When** they submit, **Then** the new name is accepted and added to the roster for future use.
4. **Given** no previous tournaments exist, **When** the organizer opens the player name field, **Then** no suggestions are shown and the field behaves as it does today.

---

### Edge Cases

- What if two tournaments are given the same name? (Allowed — date distinguishes them in the archive list.)
- What if the archive grows very large? (Storage quota errors surface a warning banner already present in the app; archive entries may fail to save if quota is exceeded.)
- What if a player's name differs only in capitalisation across tournaments? (Names are matched case-insensitively for All-Time leaderboard and roster — "alice" and "Alice" are the same person.)
- What if the app is closed mid-tournament without explicitly ending it? (The active tournament persists as normal; it is only archived when the organizer ends it or starts a new one.)
- What if the organizer wants to delete or rename an archived tournament? (Out of scope for this feature.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST prompt the organizer to enter a tournament name when starting a new tournament; empty names MUST be rejected.
- **FR-002**: System MUST display the active tournament's name prominently on the Players view.
- **FR-003**: System MUST provide two distinct end-of-tournament actions on the Players view: (1) "End Tournament" — archives the tournament and prompts for a new tournament name; (2) "Reset Tournament" — discards all current data without archiving (existing behaviour, requires confirmation).
- **FR-004**: System MUST automatically archive the active tournament when the organizer initiates a new tournament without explicitly ending the current one.
- **FR-005**: System MUST persist archived tournaments so they survive page refresh and browser restart.
- **FR-006**: System MUST provide a "Club" tab containing two sections: (1) an All-Time leaderboard at the top, and (2) a list of past tournaments below it — both accessible from the single tab.
- **FR-007**: The past tournaments list MUST display all archived tournaments in reverse chronological order showing each tournament's name, date, and game count; tapping a tournament MUST show its final standings and full game history in a read-only view with no edit or delete controls.
- **FR-008**: System MUST provide an All-Time leaderboard displaying each player's total tournament wins and cumulative match points across all tournaments (archived and active).
- **FR-009**: System MUST rank players on the All-Time leaderboard by tournament wins descending; ties MUST be broken by cumulative match points descending.
- **FR-010**: The All-Time leaderboard MUST reflect the current active tournament's in-progress results without requiring archiving first (cumulative match points from the active tournament are included; tournament wins are only credited upon archiving).
- **FR-015**: The "Club" tab MUST be visible in the navigation at all times. When no tournaments have been archived, the All-Time leaderboard MUST display current players with 0 wins and an explanatory note (e.g. "Complete your first tournament to start tracking wins").
- **FR-011**: System MUST maintain a persistent player roster of all names used across all tournaments.
- **FR-012**: System MUST display matching roster suggestions as the organizer types a player name when adding players to a tournament.
- **FR-013**: New names not in the roster MUST be accepted and automatically added to the roster.
- **FR-014**: Tournaments with no players or no recorded games at end time MUST be discarded rather than archived.

### Key Entities

- **Tournament** (updated): An evening's play session — now includes a required `name` field alongside existing id, date, and status.
- **TournamentSnapshot**: A completed tournament stored in the archive — an immutable record containing the full tournament metadata, player list, and game list as they existed at the moment of archiving.
- **PlayerRoster**: A persistent, deduplicated collection of player name strings gathered from all tournaments, used exclusively for input suggestions.
- **AllTimeStanding**: A derived summary computed on demand from all TournamentSnapshots plus the active tournament — includes player name, tournament wins, cumulative match points, and tournaments participated in count.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An organizer can name and start a new tournament in under 30 seconds from opening the app.
- **SC-002**: Ending a tournament and having it appear in the archive requires no more than two user interactions (one action + one confirmation).
- **SC-003**: The All-Time leaderboard accurately reflects all results from all tournaments with zero manual calculation required by the organizer.
- **SC-004**: An organizer can navigate from the main screen to any specific past tournament's results in 2 or fewer taps/clicks.
- **SC-005**: All archived tournament data survives page refresh, browser restart, and navigating away from the app on the same device.
- **SC-006**: The app supports at least 52 archived tournaments (one per week for a year) without degraded performance or data loss under normal tournament sizes (up to 20 players, up to 200 games).

## Assumptions

- **Player identity**: Players are matched by name (case-insensitive) across tournaments. No persistent player ID is introduced — "Alice" and "alice" across different tournaments are the same person for All-Time leaderboard purposes.
- **Archive is write-once**: Once a tournament is archived, its data cannot be edited. Corrections must be made before ending the tournament.
- **No archive management in this feature**: Deleting or renaming archived tournaments is out of scope and may be addressed in a future feature.
- **Roster is additive only**: Names are added to the roster automatically and never automatically removed. Manual roster management is out of scope.
- **Active tournament always exists**: After archiving, the app immediately prompts for a new tournament name rather than entering a "no tournament" state.
- **All-Time leaderboard includes active tournament**: The current tournament's in-progress results are always included so the leaderboard stays current throughout the evening.
- **Tournament winner definition**: The tournament winner (for "tournament wins" counting) is the player ranked first in that tournament's final standings — most match points, with fewest losses as tiebreaker.

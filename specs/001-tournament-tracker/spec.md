# Feature Specification: Backgammon Tournament Tracker

**Feature Branch**: `001-tournament-tracker`
**Created**: 2026-03-04
**Status**: Draft
**Input**: User description: "I want to build a simple web application that can be used during a backgammon tournament to track the results of multiple games between players over the course of an evening"

## Clarifications

### Session 2026-03-04

- Q: The state of the doubling cube should be recorded and used to calculate the game score. How should the cube value be captured when recording a game? → A: Default to 1 (cube not used); organizer can toggle to enable the cube and select a standard value (2, 4, 8, 16, 32, 64).
- Q: In the game history list, how should match points be displayed? → A: Total match points shown in the list; full score breakdown (e.g., "Gammon × 4 = 8 pts") visible on expand/tap.
- Q: Should the app record which player held the doubling cube at game end? → A: No — only the cube value is recorded; cube ownership is out of scope.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register Players for the Tournament (Priority: P1)

A tournament organizer opens the app at the start of the evening and enters the names of all players who will be participating. Players are listed and visible so the organizer can confirm everyone is included before play begins.

**Why this priority**: Without a player roster, no games can be recorded. This is the essential first step that makes all other functionality possible.

**Independent Test**: Can be fully tested by opening the app, adding 2+ player names, and confirming they appear in the player list. Delivers the foundational data needed for the app to function.

**Acceptance Scenarios**:

1. **Given** the app is open with no players, **When** the organizer enters a player name and submits, **Then** the player appears in the player list.
2. **Given** a player list with 3 players, **When** the organizer adds a fourth player, **Then** the list shows all 4 players.
3. **Given** a player list, **When** the organizer enters a duplicate name, **Then** the system prevents the duplicate and shows a clear message.
4. **Given** a player list, **When** the organizer removes a player who has not yet played any games, **Then** the player is removed from the list.

---

### User Story 2 - Record a Game Result (Priority: P1)

After a game concludes, a tournament organizer (or the players themselves) records who played and who won. The result is immediately reflected in the standings.

**Why this priority**: Recording results is the core activity of the application — the entire purpose of the tool. This and Player Registration together form the complete MVP.

**Independent Test**: Can be fully tested by adding two players, recording a game result between them, and confirming the result appears in the game history and updates the standings.

**Acceptance Scenarios**:

1. **Given** two or more players exist, **When** the organizer selects two players and records a winner, **Then** the game is saved and appears in the game history.
2. **Given** a recorded game result, **When** the standings are viewed, **Then** the winner's match points have increased by `resultTypeMultiplier × cubeValue` (e.g., a gammon with cube=4 awards 8 points) and the loser's loss count has increased by 1.
3. **Given** the same two players have played before, **When** another game result between them is recorded, **Then** both results appear in the history and standings are updated correctly.
4. **Given** a game result was recorded in error, **When** the organizer deletes that result, **Then** the game is removed from history and standings are recalculated.

---

### User Story 3 - View Live Standings / Leaderboard (Priority: P2)

At any point during the evening, any player or spectator can view the current tournament standings — a ranked list of players by their performance.

**Why this priority**: Standings are the output that gives the tournament meaning. Players want to know who is leading; this drives engagement throughout the evening.

**Independent Test**: Can be fully tested with at least 2 players and 1 recorded game — confirm the winner appears higher in the standings than the loser.

**Acceptance Scenarios**:

1. **Given** multiple games have been recorded, **When** the standings page is viewed, **Then** players are ranked in order from most match points to fewest match points.
2. **Given** two players have the same number of match points, **When** the standings are viewed, **Then** the player with fewer losses ranks higher (or they are shown as tied).
3. **Given** no games have been recorded yet, **When** the standings are viewed, **Then** all players are shown with zero wins and zero losses.
4. **Given** a new game result is recorded, **When** the standings are immediately viewed, **Then** the standings reflect the updated results without requiring a page reload.

---

### User Story 4 - View Game History (Priority: P3)

A player or organizer can review all games played during the tournament, including who played whom and the outcome of each game.

**Why this priority**: Game history provides transparency and allows verification of results if there is any dispute. It is valuable but the tournament can function without it.

**Independent Test**: Can be tested independently by recording 3+ games and confirming the history list shows all games with correct players and outcomes.

**Acceptance Scenarios**:

1. **Given** multiple games have been recorded, **When** the game history is viewed, **Then** all games are listed with player names, winner, total match points, and the time/order recorded; expanding a game entry reveals the full score breakdown (result type × cube value = total pts).
2. **Given** the game history is displayed, **When** a player filters by their own name, **Then** only games involving that player are shown.

---

### User Story 5 - Enable Round-Robin Tournament Mode (Priority: P4)

An organizer who wants a structured tournament (everyone plays everyone) can enable round-robin mode. The app generates a complete schedule of required matchups and tracks which pairs have played.

**Why this priority**: Free-form play covers most casual evenings. Round-robin is a valuable optional structure but the tournament can run without it.

**Independent Test**: Can be fully tested with 3 players — enable round-robin → confirm 3 pairings generated → record one game between pair A/B → confirm that pairing shows as complete, others remain pending → disable round-robin → confirm schedule is hidden.

**Acceptance Scenarios**:

1. **Given** 3 or more players are registered, **When** the organizer enables round-robin mode, **Then** the app generates all unique player pairings (N×(N-1)/2 for N players) and displays a schedule showing each pairing as pending.
2. **Given** round-robin mode is active and a game is recorded between two players, **When** the schedule is viewed, **Then** that pairing is marked as complete; all other pairings remain pending.
3. **Given** round-robin mode is active, **When** the organizer adds a new player, **Then** the schedule is regenerated to include all pairings involving the new player.
4. **Given** round-robin mode is active, **When** the organizer disables it, **Then** the schedule is hidden and the app returns to free-form mode; all recorded games are preserved.
5. **Given** fewer than 2 players are registered, **When** the organizer attempts to enable round-robin mode, **Then** the system prevents it and shows a clear message.

---

### Edge Cases

- What happens when only one player is registered and a game is attempted? (System should prevent game entry with fewer than 2 players.)
- What happens if the app is closed mid-tournament and reopened? (Data should persist for the duration of the session; see Assumptions.)
- What if a player's name contains special characters or is very long?
- How does the system handle a tie in standings for the final ranking? (Use losses as a tiebreaker.)
- What if the organizer wants to reset the entire tournament and start fresh?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow an organizer to add players to the tournament by entering their names.
- **FR-002**: System MUST prevent duplicate player names within the same tournament.
- **FR-003**: System MUST allow recording a game result by selecting two players and designating one as the winner.
- **FR-004**: System MUST prevent recording a game where a player is selected as both participants.
- **FR-005**: System MUST display a live standings leaderboard ranking all players by total match points, with losses as a tiebreaker.
- **FR-006**: System MUST display a complete game history listing all recorded games with player names, outcome, total match points, and recording order. Each entry MUST be expandable to reveal the full score breakdown (result type × cube value = total match points).
- **FR-007**: System MUST allow deletion of an incorrectly recorded game result, with standings automatically recalculated.
- **FR-008**: System MUST allow removal of a player who has not participated in any recorded games.
- **FR-009**: System MUST update the leaderboard immediately when a new game result is recorded, without requiring a full page reload.
- **FR-010**: System MUST allow filtering the game history by player name.
- **FR-011**: System MUST allow the organizer to reset/clear all tournament data to start a new tournament evening.
- **FR-012**: System MUST persist tournament data for the duration of an active session so that accidental page refreshes do not lose results.
- **FR-013**: System MUST calculate match points per game as: result type (1 = standard win, 2 = gammon, 3 = backgammon) multiplied by the doubling cube value. When recording a game, the doubling cube value defaults to 1 (cube not used); the organizer may toggle the cube on and select a standard value (2, 4, 8, 16, 32, or 64). The leaderboard MUST rank players by total match points accumulated.
- **FR-014**: System MUST default to free-form play (any two players can play any number of games in any order). System MUST also support an optional round-robin mode, which the organizer can enable to generate a schedule of required matchups and track which pairings are pending (no game recorded) or complete (at least one game recorded between that pair).

### Key Entities

- **Tournament**: The overall evening event (name, date, current status: active or complete).
- **Player**: A tournament participant (unique name, wins, losses, games played — computed from game records).
- **Game**: A single completed backgammon game (player 1, player 2, winner, result type: standard/gammon/backgammon, doubling cube value: 1/2/4/8/16/32/64, computed match points = result type × cube value, recorded timestamp/sequence number).
- **Standing**: A computed ranking entry derived from game results (player, rank, wins, losses, games played).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An organizer can add all players and record the first game result in under 2 minutes from opening the app for the first time.
- **SC-002**: Recording a game result takes under 30 seconds per game once players are registered.
- **SC-003**: Standings update and are visible to everyone in the room within 5 seconds of a result being recorded.
- **SC-004**: 100% of recorded game results are accurately reflected in the standings leaderboard with no manual recalculation required.
- **SC-005**: The app supports a tournament with up to 20 players and up to 200 games without degraded performance.
- **SC-006**: A user with no prior training can successfully record a game result without assistance on their first attempt.
- **SC-007**: Zero data loss occurs due to accidental page refresh during an active tournament session.

## Assumptions

- **No authentication required**: The app is intended for use by a trusted group in a single location (e.g., a home or club). Any person present can record results or manage the player list.
- **Single tournament per session**: The app manages one active tournament at a time. Starting a new tournament clears all previous data.
- **No multi-device sync required**: The app is operated from a single device (e.g., one laptop or tablet). Real-time sync across multiple devices is out of scope.
- **Backgammon game format**: Each game has exactly one winner and one loser — no draws. Doubling cube ownership (which player made the last double) is not recorded; only the final cube value is captured.
- **Doubling cube terminology**: The physical object is canonically called the "doubling cube" throughout this spec (not "doubling dice").
- **Data persistence scope**: Data is stored in the browser's localStorage and survives page refreshes and browser restarts on the same device. Clearing the browser's site data or resetting the tournament via the app will erase all data.
- **Player count**: Tournaments are assumed to have 2–20 players. Extreme-scale support is not required.
- **No external integrations**: No connection to external backgammon platforms, rating systems (e.g., USBGF, BG Online), or calendar systems is required.

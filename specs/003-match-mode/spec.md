# Feature Specification: Match-Mode Tournament Nights

**Feature Branch**: `003-match-mode`
**Created**: 2026-03-04
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Create and Play a Match (Priority: P1)

A player organiser starts a match between two players for the evening. They pick the two players, set a target score (e.g. 11 points), and the match begins. As games are played, the organiser records each result — including cube value and result type (standard, gammon, backgammon). The running score updates live. When one player's cumulative points reach the target, the match is automatically marked as complete and a winner is declared.

**Why this priority**: This is the core action of a match night. Without it, nothing else functions.

**Independent Test**: Start a match between Alice and Bob to 5 points. Record games until Alice reaches 5. Verify the match is marked complete with Alice as winner.

**Acceptance Scenarios**:

1. **Given** an active tournament night with Alice and Bob registered, **When** a match is created with target 5 points, **Then** the match appears as active with score 0–0
2. **Given** an active match at 4–3, **When** a game worth 1 point is recorded for Alice, **Then** the match auto-completes and Alice is shown as the winner
3. **Given** an active match, **When** a gammon (×2) on a cube-2 board is recorded, **Then** the game awards 4 points to the winner and the running score updates accordingly
4. **Given** a completed match, **When** the user views it, **Then** the full game-by-game breakdown is visible but no further games can be added

---

### User Story 2 — Manage Multiple Simultaneous Matches (Priority: P2)

During a tournament night, several matches may be in progress across different tables. The organiser can see all active and completed matches at a glance from a central hub. They can start new matches, navigate into any active match to record a game, and add players at any point as latecomers arrive.

**Why this priority**: The multi-match hub is what makes this a tournament tool rather than a one-on-one recorder.

**Independent Test**: With one completed match already in place, start two new simultaneous matches. Verify both are visible as active, navigate into each and record a game, confirm scores update independently.

**Acceptance Scenarios**:

1. **Given** an active tournament night, **When** the organiser views the main screen, **Then** all active matches, completed matches, and the player list are visible
2. **Given** two simultaneous active matches, **When** a game is recorded in match A, **Then** match B's score is unaffected
3. **Given** an active tournament night, **When** a new player is added mid-night, **Then** that player is immediately available for selection in a new match
4. **Given** an active tournament night with fewer than two players registered, **When** the organiser attempts to start a match, **Then** the action is unavailable with a clear explanation

---

### User Story 3 — Night Leaderboard (Priority: P3)

At any point during or after the evening, the organiser and players can view a leaderboard ranking all participants. Players are ranked first by matches won, then by total match points as a tiebreaker.

**Why this priority**: Provides the competitive context for the evening; depends on matches being recorded (US1/US2).

**Independent Test**: Seed a night with Alice winning 2 matches (15 pts total) and Bob winning 2 matches (12 pts total). Verify Alice ranks above Bob.

**Acceptance Scenarios**:

1. **Given** a night with Alice winning 2 matches and Bob winning 1, **When** the leaderboard is viewed, **Then** Alice appears above Bob
2. **Given** Alice and Bob both with 1 match win but Alice has 8 pts and Bob has 6, **When** the leaderboard is viewed, **Then** Alice ranks above Bob
3. **Given** a player with no completed matches, **When** the leaderboard is viewed, **Then** they appear at the bottom with 0 wins and 0 points

---

### User Story 4 — All-Time Leaderboard Backward Compatibility (Priority: P4)

The Club tab's all-time leaderboard continues to work correctly after this change. Archives from before match mode (which contain only raw game records, no matches) display alongside new match-based archives without errors or missing data.

**Why this priority**: Protects existing data; lower priority because it is a compatibility concern rather than new user value.

**Independent Test**: Load the app with one legacy archive and one match-based archive. Verify the all-time table renders both players' data without errors.

**Acceptance Scenarios**:

1. **Given** a mix of legacy and match-based archives, **When** the Club tab is viewed, **Then** the all-time table renders all players without errors
2. **Given** a legacy archive with no match data, **When** the all-time table computes tournament wins, **Then** the winner is derived from the final standings as before

---

### Edge Cases

- What happens if a match is abandoned mid-way? A match must be explicitly forfeited or deleted rather than silently ignored.
- What if the same two players play multiple matches in one night? This should be allowed — each match is an independent record.
- What if a player is in an active match when someone tries to remove them from the night? Removal must be blocked.
- What if the target score is set to 1? Valid — a single winning game ends the match immediately.
- What if a single game awards more points than the remaining target (e.g. a backgammon on a high cube)? The match completes immediately; points beyond the target are recorded but do not carry over.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to create a match between any two registered players, specifying a target score (minimum 1 point)
- **FR-002**: Multiple matches MUST be able to run simultaneously within a single tournament night
- **FR-003**: Players MUST be addable at any point during an active tournament night
- **FR-004**: Each game within a match MUST support result types (standard, gammon, backgammon) and cube values (1, 2, 4, 8, 16, 32, 64)
- **FR-005**: A match MUST auto-complete and declare a winner the moment one player's cumulative points reach or exceed the target score
- **FR-006**: Games MUST NOT be recordable outside of a match context
- **FR-007**: The night leaderboard MUST rank players by matches won (primary) and total match points (tiebreaker)
- **FR-008**: Completed matches MUST be viewable in full (game-by-game history) but not editable
- **FR-009**: A player with an active match MUST NOT be removable from the night's player list
- **FR-010**: An active match MUST support explicit abandonment, removing it from the active list without counting as a win or loss
- **FR-011**: The all-time leaderboard MUST continue to display data from legacy archives without errors
- **FR-012**: A player MUST NOT be addable to a new match while they already have an active match in progress

### Key Entities

- **Match**: Two players, a target score, a status (active or complete), a winner (when complete), a start time, and an ordered list of games
- **Game** (within a match): Result type, cube value, match points awarded, timestamp, and a reference to its parent match
- **Player**: Name, unique within the night, addable at any time during the session
- **Tournament Night**: Name, date, list of players, list of matches

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A match can be created and its first game recorded in under 60 seconds
- **SC-002**: The current score of every active match is visible from the main hub without navigating into individual matches
- **SC-003**: Night standings update immediately after each game is recorded, with no manual refresh required
- **SC-004**: The all-time leaderboard renders correctly when the archive contains a mix of legacy and match-based tournament records
- **SC-005**: An organiser can manage a night with up to 10 simultaneous active matches without the interface becoming unusable

## Clarifications

### Session 2026-03-05

- Q: Should the system prevent a player from being added to two simultaneously active matches? → A: Yes — enforce it; block the second match entirely

## Assumptions

- The match target score is set once when the match is created and cannot be changed mid-match
- There is no time limit on a match — it runs until the target is reached or the match is explicitly abandoned
- A night's player list requires explicit addition; the persistent roster datalist provides suggestions but does not auto-populate
- Match points use the existing formula: `resultType × cubeValue` (standard=1, gammon=2, backgammon=3)
- The existing round-robin scheduling feature and its interaction with match mode is out of scope for this feature

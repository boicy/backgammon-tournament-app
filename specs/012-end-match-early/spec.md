# Feature Specification: End Match Early (Partial Completion)

**Feature Branch**: `012-end-match-early`
**Created**: 2026-03-07
**Status**: Draft
**Input**: User description: "Should support partial completion of matches. Players come and go at a casual club so there needs to be a way to finish a match other than hitting the required score."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manually End an Active Match (Priority: P1)

A tournament organizer or player notices a match is in progress but one or both players need to leave before the target score is reached. They want to close out the match officially without waiting for the natural end condition, preserving whatever score has accumulated so far.

**Why this priority**: This is the core use case described in the issue. Without it, partially-played matches are stuck in an "active" state indefinitely, cluttering the live view and preventing accurate standings.

**Independent Test**: Can be fully tested by starting a match, recording one or more games, then choosing "End Match" before the target is reached — the match should move to a completed state with the current scores recorded.

**Acceptance Scenarios**:

1. **Given** an active match with at least one game recorded, **When** a user chooses to end the match early, **Then** the match is marked as complete with the scores at the time of ending and the player with more match points is declared the winner.
2. **Given** an active match with no games recorded yet, **When** a user chooses to end the match early, **Then** the match is marked as complete with both scores at 0 (no winner declared).
3. **Given** a completed match, **When** a user views the match in history, **Then** the match is clearly identified as having ended early rather than reaching the target score.

---

### User Story 2 - Abandoned Match with No Impact on Standings (Priority: P2)

Sometimes a match begins but no games are played before players leave. The organizer wants to remove it from active play without recording any score — effectively cancelling it after the fact.

**Why this priority**: Distinguishing a "partial result counts" early end from a true "no contest" abandonment matters for fairness. If no games were played, recording 0-0 may skew standings differently than simply removing the match.

**Independent Test**: Can be fully tested by starting a match, recording zero games, then abandoning it — the match should be dismissed without affecting player standings or game history.

**Acceptance Scenarios**:

1. **Given** an active match with zero games recorded, **When** a user chooses to abandon the match, **Then** the match is removed from the active list and does not appear in standings calculations.
2. **Given** an active match with zero games recorded, **When** a user abandons the match, **Then** no win, loss, or point total is recorded for either player.

---

### User Story 3 - Partial Result Reflected in Standings (Priority: P3)

After a match is ended early with one or more games recorded, the points earned so far should count toward each player's tournament standing, just like a fully completed match.

**Why this priority**: If partial results did not count, players who leave early would have no incentive to record games mid-match. Counting earned points rewards participation.

**Independent Test**: Can be fully tested by ending a match early with a known score difference and confirming the leaderboard updates to reflect those points.

**Acceptance Scenarios**:

1. **Given** a match ended early where Player A leads 3-1, **When** standings are calculated, **Then** Player A is credited with the points earned from those 4 games.
2. **Given** multiple matches — one completed normally and one ended early — **When** standings are displayed, **Then** both contribute points proportionally to their recorded game results.

---

### Edge Cases

- When a match is ended early with a tied score (e.g., 2-2), no winner is declared but both players retain the points earned from recorded games.
- How does the system handle ending a match early if the last recorded game brought the score to or above the target (i.e., the match was already naturally complete)?
- Is there a confirmation step to prevent accidental early termination?
- What distinguishes an "ended early" match from a "cancelled" match (011) in the history view?

## Clarifications

### Session 2026-03-07

- Q: When a match with recorded games is ended early, should the player with more match points be declared the winner? → A: Yes — player with more match points at end time is declared winner.
- Q: When a match is ended early with a tied score, how should the result be recorded? → A: No winner declared; both players keep the points earned from recorded games.
- Q: Should the overflow menu show one "End Match" action or two separate actions (End vs Abandon)? → A: One "End Match" action; confirmation dialog adapts based on whether games have been recorded.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to end an active match before the target score is reached.
- **FR-002**: When a match is ended early with one or more games recorded, the system MUST record the final scores at the time of ending, declare the player with more match points as the winner, and mark the match as complete.
- **FR-003**: When "End Match" is triggered on a match with zero games recorded, the confirmation MUST offer abandonment (no scores saved) as the only outcome — accessed via the same single "End Match" action.
- **FR-004**: An early-ended match MUST be visually distinguishable from a naturally completed match in match history.
- **FR-005**: Points earned in a partially completed match MUST be included in tournament standings calculations.
- **FR-006**: The system MUST expose a single "End Match" action in the match overflow menu. The confirmation step MUST adapt: when games have been recorded, it shows the current score and winner; when no games have been recorded, it warns that no scores will be saved and offers to abandon the match.
- **FR-007**: A match abandoned with zero games recorded MUST NOT affect any player's standings or point totals.
- **FR-008**: When a match is ended early with a tied score, no winner MUST be declared, but both players MUST retain the points earned from recorded games.

### Key Entities

- **Match**: Tracks two players, a target score, recorded games, and completion status. Gains a new state or flag to distinguish "ended early" from "completed at target."
- **Game**: Individual recorded game within a match; unchanged by this feature.
- **Standing**: Derived calculation based on match results; must handle early-ended matches identically to completed ones when games were recorded.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can end an active match early in 2 or fewer interactions (one action to initiate, one to confirm).
- **SC-002**: 100% of partially completed matches with at least one recorded game appear in standings calculations after being ended early.
- **SC-003**: 100% of abandoned matches with zero games recorded are excluded from standings calculations.
- **SC-004**: Match history clearly distinguishes early-ended matches from fully completed matches in every case.
- **SC-005**: No active match remains stuck open when players leave before the target score is reached.

## Assumptions

- The current match model tracks a target score and individual game results; this feature adds an explicit "end early" action alongside the existing natural completion path.
- Ending a match early with games recorded is equivalent to a completed match for standings purposes — the current score determines points, not the target score.
- The existing cancel-new-match feature (011) covers matches that have not started yet; this feature covers matches already in progress with or without recorded games.
- A single "End Match" control in the match overflow menu is the expected UI entry point, consistent with existing overflow patterns in the live view. The confirmation step adapts based on whether games have been recorded: if games exist, it summarizes the current score and declares the outcome; if no games exist, it warns that no scores will be recorded and offers to abandon the match entirely.

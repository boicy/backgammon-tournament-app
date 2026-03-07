# Feature Specification: Concurrent Match Participation

**Feature Branch**: `010-concurrent-matches`
**Created**: 2026-03-07
**Status**: Draft
**Input**: GitHub Issue #12 — "A player is only able to be in a single match during a tournament"

## Clarifications

### Session 2026-03-07

- Q: Should the player selection grid visually distinguish players who already have active matches? → A: Yes — show a small badge with the active match count next to players who already have one or more active matches.
- Q: With multiple active match cards on screen, can more than one inline record-game form be open at a time? → A: No — one form open at a time; opening a form on any card collapses any other open form (existing behaviour preserved).
- Q: Should ending the tournament behave differently when players have multiple concurrent active matches? → A: No — existing end-tournament behaviour applies; incomplete matches are archived in their current state regardless of concurrent match count.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start New Match While Another Is Active (Priority: P1)

A player who is already participating in an active match can be selected to start a new match against a different opponent. The system does not block this. The new match appears alongside any existing active matches in the live view. Players who already have active matches are visually identified in the picker with a count badge.

**Why this priority**: This is the core use case from the issue — players at a casual night want to switch between match partners without needing to complete or abandon their current match first. Without this, the entire feature has no value.

**Independent Test**: Can be fully tested by starting a match between Player A and Player B, then starting a second match between Player A and Player C, and confirming both matches are active simultaneously.

**Acceptance Scenarios**:

1. **Given** Player A has an active match with Player B, **When** a user attempts to start a new match between Player A and Player C, **Then** the new match is created and both matches are active simultaneously.
2. **Given** Player A has two active matches, **When** a user views the live view, **Then** both active match cards are visible and accessible.
3. **Given** Player A has two active matches, **When** a user records a game in one match, **Then** only that match's score updates; the other match is unaffected.
4. **Given** Player A has one active match, **When** a user opens the new-match player picker, **Then** Player A's tile shows a badge indicating 1 active match.
5. **Given** Player A has no active matches, **When** a user opens the new-match player picker, **Then** Player A's tile shows no badge.

---

### User Story 2 - Record Games Across Concurrent Matches (Priority: P2)

A player participating in multiple active matches can record game results in any of those matches in any order, interleaving freely between matches as play happens at the table.

**Why this priority**: Once concurrent matches exist, players must be able to record games in whichever match they just played — this is the day-to-day workflow described in the issue.

**Independent Test**: Can be tested by creating two active matches both involving the same player, recording games in each in alternating order, and verifying scores are tracked independently per match.

**Acceptance Scenarios**:

1. **Given** Player A has two active matches, **When** a game is recorded in Match 1, **Then** Match 1's score updates and Match 2 is unchanged.
2. **Given** Player A has two active matches, **When** enough games are recorded to complete Match 1, **Then** Match 1 is marked complete and Match 2 remains active.
3. **Given** all of a player's concurrent matches are completed, **When** standings are viewed, **Then** results from all matches appear correctly.
4. **Given** a record-game form is open on Match 1, **When** a user opens the record-game form on Match 2, **Then** Match 1's form closes and Match 2's form opens.

---

### User Story 3 - Prevent Duplicate Active Matches (Priority: P3)

The system prevents starting a second match between the same two players if an active match between them already exists, to guard against accidental double-starts.

**Why this priority**: A safety guard for a narrow edge case; lower priority than enabling the primary use case.

**Independent Test**: Can be tested by attempting to start a second match between Player A and Player B while their first match is still active, and confirming the system blocks the duplicate.

**Acceptance Scenarios**:

1. **Given** Player A and Player B have an active match, **When** a user attempts to start another match between Player A and Player B, **Then** the system prevents this and informs the user an active match between these two players already exists.
2. **Given** Player A and Player B's match has been completed, **When** a user starts a new match between Player A and Player B, **Then** the new match is created successfully.

---

### Edge Cases

- What happens when a player is in concurrent matches against every other player in the tournament simultaneously? **Out of scope** — the system imposes no cap beyond the unique-opponent constraint; the live view renders all active cards in a scrollable list. No additional handling required.
- How does the live view handle display when a player has 3 or more concurrent active matches? **Out of scope** — the live view already renders any number of match cards in a list. No layout changes are required for this feature.
- When the tournament is ended early, concurrent active matches are archived in their current (incomplete) state — same as any other incomplete match; no special handling required.
- How are standings calculated when a player completes matches at different times while other concurrent matches remain open? **Out of scope** — standings are derived fresh from all completed matches via existing `deriveMatchStandings()` logic. Concurrent active matches do not affect standings until they complete. No new logic required.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow a new match to be started even if one or both selected players already have one or more active matches.
- **FR-002**: System MUST display all active match cards in the live view regardless of whether participants have other concurrent active matches.
- **FR-003**: System MUST allow games to be recorded in any active match independently, without affecting other active matches involving the same players.
- **FR-004**: System MUST prevent creating a new match between two players who already have an active (incomplete) match against each other.
- **FR-005**: System MUST correctly attribute game results and match completion to the specific match they belong to, even when the same player has other concurrent active matches.
- **FR-006**: Standings MUST accurately reflect results from all completed matches, including those completed during sessions with concurrent active matches.
- **FR-007**: The player selection grid MUST display an active match count badge on any player who already has one or more active matches at the time the picker is shown.
- **FR-008**: Only one inline record-game form may be open at a time across all match cards; opening a form on any card MUST collapse any other currently open form.

### Key Entities

- **Match**: A head-to-head contest between two specific players; has a status of active or complete. Multiple matches involving the same player may now be active simultaneously, one per unique opponent.
- **Player**: A tournament participant who may belong to zero, one, or several active matches at any given time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player can be a participant in two or more active matches at the same time with no system error or blocking message.
- **SC-002**: 100% of games recorded in any concurrent match are attributed to the correct match and do not alter the score of other active matches.
- **SC-003**: Starting a new match involving a player with existing active matches takes no more steps than starting any other match.
- **SC-004**: Standings correctly reflect all match results after a session that included concurrent matches.
- **SC-005**: Players with active matches are visually identifiable in the picker; players with no active matches show no badge.

## Assumptions

- The maximum number of concurrent matches for a single player is bounded only by the number of other registered players (one active match per unique opponent pair at a time).
- A rematch between the same two players may be started once their previous match is complete.
- No changes are required to how match results or standings are calculated — only the constraint preventing multiple active matches per player is removed.
- The live view already renders multiple match cards in a list; the only UI change required is the active match count badge in the player selection picker (FR-007).
- Ending the tournament while players have concurrent active matches requires no new logic; those matches are archived in their current state identically to any other incomplete match.

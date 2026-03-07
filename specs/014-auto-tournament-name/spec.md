# Feature Specification: Auto-Name Tournament by Date and Time

**Feature Branch**: `014-auto-tournament-name`
**Created**: 2026-03-07
**Status**: Draft
**Input**: User description: "When a new tournament is created, it should be automatically named by date and time. The format should be \"HH:mm. dddd, MMM d, yyyy\". I would still like to be able to manually start and end a tournament, it just needs to be automatically named."

## Clarifications

### Session 2026-03-07

- Q: After a Reset Tournament, does the new (post-reset) tournament also receive an auto-generated name? → A: Reset Tournament retains the existing tournament name — no new name is generated and no prompt is shown.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tournament Named Automatically When Started (Priority: P1)

When a user manually starts a new tournament, the app automatically assigns a name based on the current date and time — skipping the name-entry step. The user still explicitly triggers tournament creation; the only change is that they are no longer asked to type a name.

**Why this priority**: This is the core of the feature. Removing manual name entry reduces friction while keeping the user in control of when tournaments start and end.

**Independent Test**: Can be fully tested by tapping "New Tournament" and verifying the active tournament immediately has a correctly formatted date/time name — no name prompt appears — and the user arrives directly at the live tournament view.

**Acceptance Scenarios**:

1. **Given** no active tournament exists, **When** the user starts a new tournament, **Then** the tournament is created with a name matching the format `HH:mm. dddd, MMM d, yyyy` representing the moment of creation, and the app proceeds directly to the live tournament view without showing a name-entry prompt.
2. **Given** no active tournament exists, **When** the user starts a new tournament at 09:05 on Saturday, March 7, 2026, **Then** the tournament name is `09:05. Saturday, Mar 7, 2026`.
3. **Given** no active tournament exists, **When** the user starts a new tournament, **Then** no name-entry text field or name prompt is displayed.

---

### User Story 2 - User Can Still End a Tournament Manually (Priority: P1)

The user retains full manual control over ending (closing) a tournament. The auto-naming change does not affect how or when a tournament ends.

**Why this priority**: The user explicitly requires that manual start/end control is preserved. Confirming this prevents any regression in tournament lifecycle management.

**Independent Test**: Can be fully tested by starting a tournament (auto-named), running games, then ending the tournament via the existing End Tournament action — verifying the tournament closes normally and is archived with its auto-generated name.

**Acceptance Scenarios**:

1. **Given** an active tournament exists with an auto-generated name, **When** the user triggers End Tournament, **Then** the tournament ends and is archived, exactly as before this feature was introduced.
2. **Given** an active tournament exists, **When** the user triggers End Tournament and confirms, **Then** the archived entry displays the auto-generated date/time name that was set at creation.

---

### User Story 3 - Reset Tournament Retains Current Name (Priority: P1)

When the user resets a tournament, the tournament keeps the name it had at the time of the reset. No new name is generated and no name prompt is shown.

**Why this priority**: Reset is a distinct action from creating a new tournament; applying a new auto-name on reset would be unexpected and lose the original session identity.

**Independent Test**: Can be fully tested by starting a tournament (auto-named), triggering Reset Tournament, and verifying the active tournament still shows the same name it had before the reset — with no prompt appearing.

**Acceptance Scenarios**:

1. **Given** an active tournament with the name `09:05. Saturday, Mar 7, 2026`, **When** the user triggers Reset Tournament, **Then** the tournament retains the name `09:05. Saturday, Mar 7, 2026` after the reset.
2. **Given** an active tournament exists, **When** the user triggers Reset Tournament, **Then** no name-entry prompt is shown and no new name is generated.

---

### User Story 4 - Archived Tournament Shows Auto-Generated Name in History (Priority: P2)

After a tournament is ended, it appears in the Club history with its auto-generated date/time name, making it easy to identify which session took place when.

**Why this priority**: Confirms end-to-end persistence of the auto-generated name across the tournament lifecycle.

**Independent Test**: Can be fully tested by creating, running, and ending a tournament, then navigating to Club history and confirming the archived entry shows the correct date/time name.

**Acceptance Scenarios**:

1. **Given** a tournament was created and ended, **When** the user views the Club history, **Then** the archived tournament entry displays the auto-generated date/time name.

---

### Edge Cases

- What happens when two tournaments are created within the same minute? Each gets the same name format — this is acceptable since names are display labels, not unique identifiers (IDs remain unique).
- What if the device clock is wrong? The name reflects whatever time the device reports; no special handling is required.
- Do existing archived tournaments (created before this feature) keep their old names? Yes — previously stored names are preserved unchanged.
- Does Reset Tournament trigger a new auto-generated name? No — Reset retains the existing tournament name.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a user starts a new tournament, the system MUST automatically generate its name using the current date and time — no user input for the name is required or requested.
- **FR-002**: The auto-generated name MUST follow the format `HH:mm. dddd, MMM d, yyyy`, where:
  - `HH` = 24-hour hour, zero-padded (e.g., `09`, `14`)
  - `mm` = minutes, zero-padded (e.g., `05`, `30`)
  - `dddd` = full weekday name in English (e.g., `Saturday`)
  - `MMM` = abbreviated month name in English (e.g., `Mar`)
  - `d` = day of month, not zero-padded (e.g., `7`, `14`)
  - `yyyy` = four-digit year (e.g., `2026`)
  - Example: `09:05. Saturday, Mar 7, 2026`
- **FR-003**: The name-entry prompt (text field asking the user to type a tournament name) MUST be removed; the app MUST proceed directly to the active tournament view after the user initiates tournament creation.
- **FR-004**: The user MUST retain the ability to manually start a tournament (explicit user action required — no auto-start on app load).
- **FR-005**: The user MUST retain the ability to manually end a tournament (explicit user action required — tournament does not end automatically).
- **FR-006**: When the user resets a tournament, the tournament MUST retain the name it had at the time of reset — no new name is generated and no name prompt is shown.
- **FR-007**: The auto-generated name MUST be persisted as the tournament name and appear in all places where the tournament name is displayed (live view header, leaderboard, Club history).
- **FR-008**: Previously archived tournaments with manually entered names MUST continue to display their original names unchanged.

### Key Entities

- **Tournament**: Identified by a unique ID; has a `name` field that was previously entered manually and is now auto-generated from the creation timestamp. Start and end remain explicit user-triggered actions. Reset retains the existing name.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new tournament is created and enters the active view in one fewer user step than before (zero name-entry steps), while still requiring an explicit user action to start.
- **SC-002**: 100% of newly created tournaments display a name matching the `HH:mm. dddd, MMM d, yyyy` format.
- **SC-003**: The tournament name is visible and correctly formatted in the live view, leaderboard header, and Club archive list for every newly created tournament.
- **SC-004**: No regression: End Tournament and Reset Tournament continue to work correctly; Reset retains the existing name; all existing archived tournament names display as before.

## Assumptions

- The device's local clock provides the date/time used for naming; no server-side timestamp is needed.
- Weekday and month names are always rendered in English, regardless of the device's locale setting, to match the format specified in the issue.
- The name is generated at the moment the user triggers tournament creation (not on app load or restore).
- The auto-generated name is not editable by the user after creation.

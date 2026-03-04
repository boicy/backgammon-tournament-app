# Phase 0 Research: Named Tournaments & History

**Branch**: `002-tournament-history` | **Date**: 2026-03-04

---

## Topic 1: Roster Suggestions UI

**Question**: What is the simplest mechanism for providing player name autocomplete suggestions with no new dependencies?

**Decision**: Native HTML5 `<datalist>` element.

**Rationale**: `<datalist>` is supported in all target browsers (Chrome 92+, Firefox 95+, Safari 15.4+) and requires no JavaScript for the suggestion dropdown. Connecting it to the existing name input requires only adding `list="roster-datalist"` to the `<input>` and rendering a `<datalist id="roster-datalist">` with `<option>` elements. The browser handles all keyboard navigation, selection, and filtering natively.

**Alternatives considered**:
- Custom dropdown with `input` event + `<ul>` overlay: More control over styling, but requires significant JavaScript for keyboard navigation, accessibility (ARIA), and positioning. Violates Simplicity gate.
- Third-party autocomplete library: Violates Simplicity gate; no new production dependencies are permitted.

**Implementation note**: The `<datalist>` filtering is prefix/substring-based and case-insensitive in most browsers, which is sufficient for the spec requirement ("matching names from the persistent roster are shown as suggestions").

---

## Topic 2: Archive Serialisation Strategy

**Question**: Should pre-computed standings be stored in the snapshot, or should they be derived on demand from the archived player/game arrays?

**Decision**: Store pre-computed standings inside the TournamentSnapshot at archive time.

**Rationale**: The spec requires displaying 52 archived tournaments in a list (SC-006). If standings were re-derived from game arrays for each snapshot on every archive list render, the cost would scale with (number of snapshots × average games per tournament). Storing standings at snapshot time reduces the render cost to a single array read. The archive is write-once (immutable after creation), so pre-computed standings can never become stale.

**Alternatives considered**:
- Re-derive standings on demand: Simpler model but O(snapshots × games) render cost. For 52 tournaments × 200 games this could involve ~10,400 game iterations per render — acceptable today but fragile at scale and unnecessary given the immutability guarantee.
- Store a summary (winner name + total games) only: Insufficient — the spec requires full standings and game history to be viewable per archived tournament (FR-007).

---

## Topic 3: Cross-Tournament Player Name Matching

**Question**: How should "Alice" from one tournament and "alice" from another be recognised as the same person for the All-Time leaderboard?

**Decision**: Normalise player names to lowercase for matching; use the capitalisation from the most recent tournament for display.

**Rationale**: The spec explicitly states: "Names are matched case-insensitively for All-Time leaderboard and roster — 'alice' and 'Alice' are the same person." Lowercase normalisation is the simplest deterministic approach — no external locale library needed. Taking the display name from the most recent tournament ensures the leaderboard reflects the organizer's current preferred spelling.

**Alternatives considered**:
- Normalise to title case: Changes user-entered capitalisation; feels presumptuous.
- First-seen wins for display name: Less intuitive — if a name is corrected in a later tournament, the correction would not be reflected.

---

## Topic 4: Club Tab Navigation (Archive Detail View)

**Question**: How should drilling into a specific archived tournament be handled without a backend or complex routing?

**Decision**: Inline detail pattern — `club.js` maintains a module-level `_selectedSnapshotId` variable and re-renders itself between list mode and detail mode without a new route.

**Rationale**: The current hash router maps routes to view modules. Adding a parameterised route (e.g., `#/club/:id`) would require modifying the router to parse URL parameters — a non-trivial change that touches shared infrastructure. The inline pattern is precedented in the existing codebase: `gameHistory.js` manages its filter state internally. The spec's success criterion SC-004 ("navigate from main screen to any past tournament's results in 2 or fewer taps") is satisfied: (1) tap Club tab, (2) tap tournament in list.

**Alternatives considered**:
- Parameterised route `#/club/UUID`: Clean URL but requires router surgery and adds complexity to all route-handling code.
- sessionStorage for selected ID: Unnecessary indirection; module variable is cleared on navigation anyway.

---

## Topic 5: Tournament Name Prompt Flow

**Question**: Should the tournament name prompt be integrated into the players view or a separate view/route?

**Decision**: Separate `namePrompt.js` view on a new `#/start` route, with a router guard that redirects to `#/start` when `state.tournament === null`.

**Rationale**: Integrating the name prompt into `playerRegistration.js` would require that view to have two distinct rendering modes (name form vs player list), entangling two separate concerns. A dedicated view keeps each module focused on a single responsibility. The router guard (checking `tournament === null` on every navigation) cleanly handles all cases: initial load, post-reset, and post-end-tournament.

**Alternatives considered**:
- Inline in `playerRegistration.js`: Simpler file count but couples name capture to player management. Also makes it harder to test name validation independently.
- Modal/dialog overlay: Requires more CSS and JavaScript for focus management; the spec does not require a modal pattern.

---

## Topic 6: Roster Update Timing

**Question**: When should a new player name be added to the persistent roster — immediately on `addPlayer()`, or only on `endTournament()`?

**Decision**: Immediately inside `addPlayer()`.

**Rationale**: FR-013 states "New names not in the roster MUST be accepted and automatically added to the roster." FR-011 says the roster covers "all names used across all tournaments." The spec assumption "Roster is additive only: Names are added to the roster automatically and never automatically removed" implies the roster accumulates names regardless of whether the tournament is eventually archived or discarded. Updating on `addPlayer()` is the simplest path — no separate roster-update pass needed at end-of-tournament.

**Alternatives considered**:
- Update only on `endTournament()`: Would mean player names from a discarded tournament (no games) are not added to the roster. This conflicts with FR-013 ("New names not in the roster MUST be accepted and automatically added to the roster") which does not condition roster membership on tournament completion.
- Update only on `recordGame()`: Too late — names should be suggestible in the current tournament before any game is played.

---

## Summary Table

| Topic | Decision |
|-------|----------|
| Roster suggestions UI | Native HTML5 `<datalist>` — no dependencies |
| Archive serialisation | Pre-computed standings stored in snapshot at archive time |
| Cross-tournament name matching | Case-insensitive (lowercase normalised); display name from most recent tournament |
| Club tab archive detail | Inline detail pattern in `club.js` (module-level `_selectedSnapshotId`) |
| Tournament name prompt | New `#/start` route + `namePrompt.js`; router guard on `tournament === null` |
| Roster update timing | Immediately on `addPlayer()` — additive-only, never removed |

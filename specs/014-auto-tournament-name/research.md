# Research: Auto-Name Tournament by Date and Time

**Feature**: 014-auto-tournament-name
**Date**: 2026-03-07

---

## Decision 1: Date Formatting Approach

**Decision**: Use native `Date` instance methods (`getHours()`, `getMinutes()`, `getDate()`, `getFullYear()`) for the numeric components, and `Date.prototype.toLocaleDateString('en-US', {...})` for the locale-formatted weekday and month names. Assemble the final string manually.

**Rationale**:
- `Intl.DateTimeFormat` with `{ hour: '2-digit', hour12: false }` has a known cross-browser edge case: some engines return `"24:00"` instead of `"00:00"` at midnight. Using `getHours()` with `padStart(2, '0')` is unambiguous and consistent.
- Locking locale to `'en-US'` in `toLocaleDateString` ensures English weekday/month names regardless of the device's system locale — matching the spec requirement.
- No third-party date library needed; the format is simple enough for native methods.
- Passes the Simplicity Gate: zero new dependencies.

**Alternatives considered**:
- `Intl.DateTimeFormat.prototype.formatToParts()` — more complex, unnecessary for a single fixed format.
- A date utility library (e.g., date-fns) — forbidden by the Simplicity Gate.
- `toLocaleTimeString('en-US', { hour12: false, ... })` — inconsistent `"24:xx"` output at midnight on Safari/older Chromium.

**Final format assembly**:
```
HH  = String(date.getHours()).padStart(2, '0')
mm  = String(date.getMinutes()).padStart(2, '0')
dddd = date.toLocaleDateString('en-US', { weekday: 'long' })
MMM  = date.toLocaleDateString('en-US', { month: 'short' })
d    = date.getDate()          // not zero-padded
yyyy = date.getFullYear()
result = `${HH}:${mm}. ${dddd}, ${MMM} ${d}, ${yyyy}`
```

**Sample outputs**:
| Input | Output |
|---|---|
| 2026-03-07T09:05 (local) | `09:05. Saturday, Mar 7, 2026` |
| 2026-03-07T14:30 (local) | `14:30. Saturday, Mar 7, 2026` |
| 2026-12-01T00:00 (local) | `00:00. Tuesday, Dec 1, 2026` |
| 2026-01-14T23:59 (local) | `23:59. Wednesday, Jan 14, 2026` |

---

## Decision 2: Placement of `generateTournamentName`

**Decision**: Add `generateTournamentName(date = new Date())` to `src/utils.js` as a new exported pure function.

**Rationale**: `src/utils.js` already houses `escapeHtml`, `generateId`, `formatTimestamp` — all pure, stateless helpers. Name generation is the same kind of utility. Keeping it here avoids polluting the model layer with date formatting.

**Alternatives considered**:
- `src/models/tournament.js` — would violate the project's convention of keeping models focused on entity creation/validation, not formatting.
- Inline in `store.js` — not testable in isolation; violates TDD principle.

---

## Decision 3: `resetTournament()` Behaviour Change

**Decision**: `resetTournament()` in `src/store/store.js` MUST preserve the existing tournament entity. It clears `players`, `matches`, `selectedMatchId`, and `schedule` — but keeps `state.tournament` (and re-persists it to localStorage).

**Rationale**: Per FR-006 and the clarification session, Reset retains the existing name. After the reset, `state.tournament` remains non-null, so the router stays on `#/live` (or redirects there) rather than falling back to `#/start`.

**Side effect on router**: The `reset-tournament` handler in `router.js` currently navigates to `#/start` post-reset. It MUST be changed to navigate to `#/live` because the tournament still exists after reset.

---

## Decision 4: `initTournament()` Signature Change

**Decision**: `initTournament()` no longer accepts a `name` parameter. It generates the name internally using `generateTournamentName()`.

**Rationale**: The name is never supplied by the user; the name-entry prompt is removed. Keeping the parameter would be dead code.

**Impact**: The only current caller is `namePrompt.js` (which passes the form input value). That call site is removed as part of this feature.

---

## Decision 5: Fate of `namePrompt.js`

**Decision**: Keep `namePrompt.js` as the `/start` route's view, but replace its contents — remove the text input and form, add a "Start Tournament" button that calls `initTournament()` and navigates to `#/live`.

**Rationale**: The `/start` route and the `namePrompt.js` module already handle the "no active tournament" state. Repurposing the file avoids touching the router's route table, which would be a larger diff with no user value. The module's export contract (`render`, `onMount`, `onUnmount`) stays the same.

**Alternatives considered**:
- Delete `namePrompt.js` and add a new `startView.js` — functionally equivalent but requires updating `router.js` and all imports; adds no value.
- Auto-start tournament on page load (no button) — violates FR-004 (explicit user action required).

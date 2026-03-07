# Contract: `generateTournamentName`

**Module**: `src/utils.js`
**Type**: Pure function (no side effects, no I/O, no state)

---

## Signature

```
generateTournamentName(date?: Date) → string
```

### Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `date` | `Date` | No | `new Date()` | The date/time to format. Defaults to the current local time. |

### Return Value

A string formatted as `HH:mm. dddd, MMM d, yyyy` using the device's local time components and English locale names.

---

## Format Specification

| Component | Description | Example |
|---|---|---|
| `HH` | 24-hour hour, zero-padded (00–23) | `09`, `14`, `00` |
| `mm` | Minutes, zero-padded (00–59) | `05`, `30` |
| `.` | Literal period-space separator | `. ` |
| `dddd` | Full weekday name, English | `Saturday` |
| `,` | Literal comma-space | `, ` |
| `MMM` | Abbreviated month name, English | `Mar`, `Dec` |
| ` ` | Literal space | |
| `d` | Day of month, NOT zero-padded (1–31) | `7`, `14` |
| `,` | Literal comma-space | `, ` |
| `yyyy` | Four-digit year | `2026` |

---

## Examples

| Input (`new Date(...)`) | Output |
|---|---|
| 2026-03-07T09:05:00 local | `09:05. Saturday, Mar 7, 2026` |
| 2026-03-07T14:30:00 local | `14:30. Saturday, Mar 7, 2026` |
| 2026-12-01T00:00:00 local | `00:00. Tuesday, Dec 1, 2026` |
| 2026-01-14T23:59:00 local | `23:59. Wednesday, Jan 14, 2026` |
| 2026-11-05T08:00:00 local | `08:00. Thursday, Nov 5, 2026` |

---

## Constraints

- MUST use `getHours()` + `padStart(2, '0')` — NOT `toLocaleTimeString` with `hour12: false` (avoids `"24:xx"` midnight edge case in Safari/old Chromium).
- Weekday and month names MUST be English regardless of device locale (`toLocaleDateString('en-US', ...)`).
- Day of month MUST NOT be zero-padded (`getDate()` returns `7`, not `07`).
- Function MUST be pure: same `date` input → same output, always.
- Function MUST be exported from `src/utils.js` alongside existing utilities.

---

## Callers

| Caller | How used |
|---|---|
| `src/store/store.js` — `initTournament()` | Calls `generateTournamentName()` (no argument) to produce the new tournament name |

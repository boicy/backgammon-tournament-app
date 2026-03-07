# Implementation Plan: Consistent Action Button Styling

**Branch**: `009-button-style-consistency` | **Date**: 2026-03-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/009-button-style-consistency/spec.md`

## Summary

All tappable controls across the app will be brought into a unified visual system: same height, pill-shaped rounding, and a two-variant colour palette (standard amber / danger red). The root cause of current inconsistency is that `liveView.js` uses modifier classes (`btn-primary`, `btn-secondary`, `btn-danger`) without the `.btn` base class that provides sizing, padding, and border-radius. The fix is surgical: add the missing `btn` and `btn-full` classes to affected buttons in `liveView.js`, add a `--radius-pill` design token, and apply pill rounding to `.btn`, `.pick-btn`, and `.pick-pill`.

## Technical Context

**Language/Version**: Vanilla JavaScript ES2022+, HTML5, CSS3
**Primary Dependencies**: None (production)
**Storage**: localStorage — unchanged (no data changes)
**Testing**: Vitest (unit — no new tests needed, no logic changes) + Playwright via MCP (e2e — required for all acceptance scenarios)
**Target Platform**: Browser (static SPA, mobile-first, no server)
**Performance Goals**: None — CSS-only change, no runtime impact
**Constraints**: No frameworks, no build step, single CSS file, plain HTML in JS template strings
**Scale/Scope**: All views (Live, History, Club, Standings); primary impact in `liveView.js`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| **Simplicity gate** | PASS | No framework, build tool, or dependency introduced. CSS token + class name changes only. |
| **TDD gate** | PASS | No business logic changes. Constitution requires TDD for scoring/data logic; pure CSS/HTML is exempt from unit TDD. E2e tests cover all acceptance scenarios. |
| **E2E gate** | PASS | Playwright e2e tests required and planned for all acceptance scenarios (US1 + US2 + regression). |
| **Static gate** | PASS | No server-side component introduced. |
| **Integrity gate** | PASS | No score calculation paths modified. |

## Project Structure

### Documentation (this feature)

```text
specs/009-button-style-consistency/
├── plan.md              # This file
├── research.md          # Phase 0 output ✅
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (affected files only)

```text
styles.css               # Design token + .btn / .pick-btn / .pick-pill border-radius
src/views/liveView.js    # Fix missing `btn` base class + add `btn-full` on action buttons
```

No new files are created. No other source files require changes.

## Complexity Tracking

No constitution violations. No complexity tracking entry required.

---

## Phase 0: Research

**Status**: Complete — see [research.md](./research.md)

### Key Decisions

| Decision | Chosen | Rationale |
|----------|--------|-----------|
| Fix strategy | Add missing `btn` base class in `liveView.js` | Surgical; `.btn` system already correct elsewhere |
| Pill rounding | Add `--radius-pill: 9999px` token | Single token, reusable, true pill shape |
| Colour variants | Retain amber primary + red danger | Already two-variant; no new colours needed |
| Full-width | Add `btn-full` to all submit/action buttons | Eliminates width inconsistency across label lengths |
| Hamburger menu | No changes needed | Menu items already full-width + correct height + danger colour |
| Leaderboard view | No changes needed | No interactive buttons in standings table |

---

## Phase 1: Design & Contracts

### CSS Changes — `styles.css`

#### 1. New design token

Add `--radius-pill: 9999px` in the `:root` Radii block (after `--radius-lg`):

```css
--radius-pill: 9999px;
```

#### 2. Update `.btn` border-radius

Change from `var(--radius-md)` to `var(--radius-pill)`:

```css
.btn {
  /* ... existing properties ... */
  border-radius: var(--radius-pill);  /* was: var(--radius-md) */
}
```

#### 3. Update `.pick-btn` border-radius

Change from `var(--radius-md)` to `var(--radius-pill)`:

```css
.pick-btn {
  /* ... existing properties ... */
  border-radius: var(--radius-pill);  /* was: var(--radius-md) */
}
```

#### 4. Update `.pick-pill` border-radius

Change from `var(--radius-md)` to `var(--radius-pill)`:

```css
.pick-pill {
  /* ... existing properties ... */
  border-radius: var(--radius-pill);  /* was: var(--radius-md) */
}
```

---

### HTML/JS Changes — `src/views/liveView.js`

All affected buttons and their required class changes. The root fix is adding the missing `btn` base class and `btn-full` where appropriate.

#### Inline game form (renderGameForm function, ~line 95–96)

| Current | Fixed |
|---------|-------|
| `class="btn-primary"` (Save button) | `class="btn btn-primary btn-full"` |
| `class="btn-secondary"` (Cancel button) | `class="btn btn-secondary btn-full"` |

#### Active match card actions (~line 121)

| Current | Fixed |
|---------|-------|
| `class="btn-primary btn-sm"` (Record Game toggle) | `class="btn btn-primary btn-full"` |

> Remove `btn-sm` — standard sizing is correct for a primary CTA.

#### Roster — Remove player button (~line 163)

| Current | Fixed |
|---------|-------|
| `class="btn-danger btn-sm"` | `class="btn btn-danger btn-sm"` |

> Retain `btn-sm` — this is an inline control within a list row, not a primary CTA.

#### Add player form submit (~lines 186, 523)

| Current | Fixed |
|---------|-------|
| `class="btn-primary btn-sm"` | `class="btn btn-primary btn-full"` |

> Remove `btn-sm` — standard CTA sizing.

#### New Match toggle button (~lines 208, 224, 253)

| Current | Fixed |
|---------|-------|
| `class="live-new-match__toggle btn-secondary"` | `class="live-new-match__toggle btn btn-secondary btn-full"` |

#### Start Match submit (confirm step, ~line 235)

| Current | Fixed |
|---------|-------|
| `class="btn-primary"` | `class="btn btn-primary btn-full"` |

---

### No Contract Artifacts

This feature exposes no external interfaces. The `/contracts/` directory is not required.

### No Data Model Artifacts

This feature involves no data entities or storage changes. `data-model.md` is not required.

---

## Phase 1: Agent Context Update

Run after CSS and HTML changes are complete:

```bash
.specify/scripts/bash/update-agent-context.sh claude
```

---

## Acceptance Scenario Coverage

| Acceptance Scenario | Test Approach |
|---------------------|---------------|
| Add Player submit button same height as Start Match and Save Game | Playwright: expand forms, visual assertion |
| Save Game button same height as Start Match button | Playwright: active card + form open, visual assertion |
| Any two tappable controls same height side by side | Playwright: screenshot comparison |
| All controls have pill/rounded appearance matching pick-btn lozenges | Playwright: visual inspection via screenshot |
| Pick-winner + deselect pills + submit all share rounding | Playwright: record-game form expanded, screenshot |
| No existing behaviour changes after styling | Playwright: full happy-path regression (start match → record game → end tournament) |
| Controls non-overflowing at 320px viewport | Playwright: resize to 320px, screenshot |

---

## Implementation Order

1. `styles.css` — add `--radius-pill` token and update 3 selectors
2. `src/views/liveView.js` — fix button class strings (7 locations)
3. Run app locally: `npx serve .`
4. Playwright MCP e2e tests — all acceptance scenarios
5. Run `update-agent-context.sh`

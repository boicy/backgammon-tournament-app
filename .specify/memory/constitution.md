<!-- SYNC IMPACT REPORT
Version change: 1.1.0 → 1.1.1 (PATCH: Clarified that Playwright MCP is the required execution
  tool for running e2e tests; artifact capture commands specified)
Modified principles:
  - II. Test-Driven Development — added Playwright MCP as the mandated execution mechanism;
    specified browser_take_screenshot and browser_console_messages for artifact capture
Added sections: n/a
Removed sections: n/a
Templates updated:
  - .specify/templates/tasks-template.md ✅ no change required
  - .specify/templates/plan-template.md ✅ no change required
  - .specify/templates/spec-template.md ✅ no change required
Follow-up TODOs: none
-->

# Backgammon Tournament Tracker Constitution

## Core Principles

### I. Simplicity First

Every implementation decision MUST favor the simplest solution that satisfies the requirement.
No frameworks, build pipelines, or third-party dependencies may be introduced unless native
browser capabilities are demonstrably insufficient. Features MUST NOT be built in anticipation
of future requirements (YAGNI). When two approaches deliver equivalent user value, the one
with fewer moving parts MUST be chosen.

### II. Test-Driven Development (NON-NEGOTIABLE)

Tests MUST be written before implementation code. The Red-Green-Refactor cycle is mandatory
for all business logic: write a failing test, implement the minimum code to pass it, then
refactor. No scoring calculation, data transformation, or validation logic may be implemented
without a corresponding test that was written first and observed to fail.

For every frontend feature, end-to-end (e2e) tests using Playwright MUST be written and run
against the locally served application. E2e tests MUST cover all acceptance scenarios defined
in the feature spec. The **Playwright MCP** MUST be used as the execution tool — navigate,
interact, and assert via the MCP browser tools (`browser_navigate`, `browser_click`,
`browser_snapshot`, `browser_take_screenshot`, `browser_console_messages`, etc.) rather
than running tests through a shell command alone.

On any test failure, the following artifacts MUST be captured before the failure is
investigated or fixed:

- Full-page screenshot via `browser_take_screenshot` (fullPage) saved to
  `./artifacts/screenshots/<timestamp>-failure.png`
- Console output via `browser_console_messages` saved to
  `./artifacts/console/<timestamp>.log`

UI rendering tests may be written after the fact, but all business logic MUST follow TDD,
and all frontend user journeys MUST have Playwright e2e coverage before a feature is
considered complete.

### III. Static Deployment

The application MUST run entirely in the browser with no server-side component. All data
persistence MUST use browser-native storage (localStorage or sessionStorage). The app MUST
be deployable to any static file host (Netlify, Vercel, GitHub Pages) without configuration
changes. No backend, database server, or runtime environment dependency is permitted.

### IV. Data Integrity

Tournament results are the core value of this application — incorrect scores or lost data
directly harm users. All scoring calculations (result type × doubling cube value) MUST be
deterministic and unit-tested. Data MUST survive accidental page refresh within an active
session. Any operation that modifies scores or standings MUST recalculate from source game
records, never from cached intermediate values.

### V. Usable by Default

The application MUST be immediately operable by a first-time user during a live tournament
without documentation or prior training. Every user-facing interaction MUST be completable
in 3 or fewer taps/clicks from the current view. Error states MUST communicate clearly what
went wrong and how to correct it. The UI MUST be fully usable on a smartphone, tablet, or
laptop screen without zooming or horizontal scrolling. All interactive elements MUST meet a
minimum touch target size of 44×44px to support reliable tap accuracy on mobile devices.

## Technology Standards

- **Language**: Vanilla JavaScript (ES2022+), HTML5, CSS3. No JS frameworks or transpilation.
- **Modules**: Native ES modules (`<script type="module">`). No bundler required for
  development or production.
- **Unit Testing**: Vitest — all scoring and data logic MUST have test coverage written before
  implementation. Tests MUST be observed to fail before implementation begins.
- **E2E Testing**: Playwright (Chromium) via the **Playwright MCP** for all frontend feature
  acceptance tests. The MCP browser tools MUST be used to navigate, interact, and assert
  against the locally served static app (`npx serve` or equivalent). On failure, artifacts
  MUST be saved using MCP commands:
  - Screenshot: `browser_take_screenshot` (fullPage) → `./artifacts/screenshots/<timestamp>-failure.png`
  - Console log: `browser_console_messages` → `./artifacts/console/<timestamp>.log`
- **Storage**: `localStorage` for tournament data persistence across page refreshes.
  `sessionStorage` acceptable for ephemeral/temporary UI state.
- **Styling**: Plain CSS. A single zero-dependency CSS utility library is acceptable.
  No CSS preprocessors (Sass, Less, etc.).
- **Deployment target**: Any CDN-backed static host. Build output MUST be plain
  HTML/CSS/JS files requiring no server-side runtime.

## Quality Gates

All implementation plans and task lists MUST verify compliance with these gates before work begins:

- **Simplicity gate**: No framework, build tool, or runtime dependency introduced without
  explicit justification in the plan's Complexity Tracking table.
- **TDD gate**: Every user story MUST include unit-test tasks listed before and blocking their
  corresponding implementation tasks. Tests MUST be observed to fail before implementation starts.
- **E2E gate**: Every frontend feature MUST include Playwright e2e test tasks covering all
  acceptance scenarios. Tests MUST be executed via the Playwright MCP browser tools against
  a locally served build. On failure, artifacts MUST be saved using `browser_take_screenshot`
  and `browser_console_messages` to `./artifacts/screenshots/` and `./artifacts/console/`
  respectively — before any debugging begins.
- **Static gate**: No server-side component, API endpoint, or external database introduced
  without a constitution amendment.
- **Integrity gate**: All score calculation paths MUST have unit tests covering: standard win,
  gammon, backgammon, and all doubling cube multiplier values (1, 2, 4, 8, 16, 32, 64).

## Governance

This constitution supersedes all other project conventions. Amendments require:

1. A documented rationale for the change.
2. A version increment per semantic versioning rules:
   - MAJOR: principle removal or incompatible redefinition.
   - MINOR: new principle or section added.
   - PATCH: clarification, wording improvement, or non-semantic refinement.
3. An updated Sync Impact Report embedded as an HTML comment at the top of this file.

All implementation plans MUST include a Constitution Check section verifying compliance
with all five Quality Gates above. Complexity violations MUST be documented in the plan's
Complexity Tracking table before any work begins.

**Version**: 1.1.1 | **Ratified**: 2026-03-04 | **Last Amended**: 2026-03-04

# Quickstart: 004-ux-redesign

**Date**: 2026-03-06

## Prerequisites

- Node.js (for Vitest and Playwright dev dependencies)
- `npm install` (installs Vitest + Playwright)

## Development

```bash
# Serve the app locally (no build step)
npx serve .

# Run unit tests (Vitest)
npm test

# Run unit tests in watch mode (TDD)
npm run test:watch

# Run e2e tests (Playwright — requires app served on port 4173)
npx playwright test
```

## Key Files to Modify

### New files
- `src/views/liveView.js` — replaces matchHub.js + matchDetail.js
- `tests/views/liveView.test.js` — unit tests for new view
- `tests/e2e/us1-live-monitoring.test.js` through `us7-new-match-form.test.js` — e2e tests

### Modified files
- `styles.css` — complete rewrite (new design system)
- `src/router.js` — new routes (#/live replaces #/players), redirect #/match → #/live
- `index.html` — update nav markup (2 tabs + hamburger menu)
- `src/views/leaderboard.js` — add Live column
- `src/views/gameHistory.js` — restyle only
- `src/views/club.js` — restyle only
- `src/views/namePrompt.js` — restyle only

### Removed files
- `src/views/matchHub.js` — replaced by liveView.js
- `src/views/matchDetail.js` — functionality absorbed into liveView.js
- `tests/e2e/us1-create-match.test.js` — replaced by new e2e tests
- `tests/e2e/us2-match-hub.test.js` — replaced by new e2e tests

### Unchanged files (do not modify)
- All files in `src/models/`
- `src/store/store.js` and `src/store/eventBus.js`
- `src/utils.js` and `src/main.js`
- All files in `tests/models/` and `tests/store/`

## Design Reference

The visual design specifications (exact colors, font stacks, spacing, animation timings) are documented in:
- `docs/plans/2026-03-06-ux-redesign-design.md`

## Architecture Notes

- **No new store actions or events** — liveView.js uses the same API as the views it replaces
- **View-local expand/collapse state** — tracked in module variables, not in the store
- **Hamburger menu** — rendered in index.html header, controlled by a module-level handler in router.js or a small menu.js module
- **Single form constraint** — only one match card's inline form can be expanded at a time (tracked by `_expandedCardId`)

# backgammon-tournament-app Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-04

## Active Technologies
- HTML5 / CSS3 / Vanilla JavaScript (ES2022+) + None (production). Vitest 3.x (dev only) — unchanged. (002-tournament-history)
- `localStorage` — three existing keys unchanged + two new: `backgammon:archive`, `backgammon:roster` (002-tournament-history)
- Vanilla JavaScript ES2022+, HTML5, CSS3 + None (production); Vitest 3.x + Playwright (dev) (003-match-mode)
- `localStorage` — five existing keys; one new key `backgammon:matches` (003-match-mode)
- Vanilla JavaScript ES2022+ (native ES modules), HTML5, CSS3 + None (production). Vitest 3.x + Playwright (dev only) (004-ux-redesign)
- `localStorage` — 6 existing keys, no changes (004-ux-redesign)
- Vanilla JavaScript ES2022+ + None (production) (005-roster-visibility)
- No changes — players already in `localStorage` via `backgammon:players` (005-roster-visibility)
- Vanilla JavaScript ES2022+ (native ES modules) + None (production). Vitest 3.x + Playwright (dev only) (006-tap-to-select)
- No changes — `localStorage` keys unchanged (006-tap-to-select)
- Vanilla JavaScript ES2022+ (native ES modules), HTML5, CSS3 + None (production); Vitest 3.x + Playwright (dev) (008-record-game-ux)
- localStorage — no changes; `_selectedWinner` is ephemeral module-level state (008-record-game-ux)
- localStorage — unchanged (no data changes) (009-button-style-consistency)
- `localStorage` — no changes to keys or data shapes (010-concurrent-matches)

- HTML5 / CSS3 / Vanilla JavaScript (ES2022+) + None (production). Vitest 3.x (dev only, for TDD). (001-tournament-tracker)

## Project Structure

```text
src/
  main.js, router.js, utils.js
  store/   (store.js, eventBus.js)
  models/  (player.js, game.js, tournament.js, standing.js)
  views/   (playerRegistration.js, recordGame.js, leaderboard.js, gameHistory.js)
tests/
  models/  (game.test.js, player.test.js, standing.test.js)
  store/   (store.test.js)
index.html, styles.css, package.json, vitest.config.js
```

## Commands

- `npm test` — run all tests once (Vitest)
- `npm run test:watch` — TDD watch mode
- `npx serve .` — serve app locally (no build step needed)

## Code Style

- Vanilla JavaScript ES2022+ with native ES modules (`type="module"`)
- No frameworks, no bundler, no transpilation
- Pure functions in `models/`; no DOM or store imports in model files
- Always use `escapeHtml()` before inserting user data into `innerHTML`
- All entity IDs via `crypto.randomUUID()`; timestamps via `Date.now()`
- TDD: tests MUST be written and observed to fail before implementation

## Recent Changes
- 010-concurrent-matches: Added Vanilla JavaScript ES2022+, HTML5, CSS3 + None (production)
- 009-button-style-consistency: Added Vanilla JavaScript ES2022+, HTML5, CSS3 + None (production)
- 008-record-game-ux: Added Vanilla JavaScript ES2022+ (native ES modules), HTML5, CSS3 + None (production); Vitest 3.x + Playwright (dev)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

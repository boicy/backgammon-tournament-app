# Quickstart: Roster Visibility (005)

## What Changed

Two files are modified:

1. **`src/views/liveView.js`** — `rosterListHtml()` wraps content in `.live-roster-inner`
2. **`styles.css`** — adds rules for `.live-roster__row`, `.live-roster__name`, `.live-roster__empty`

## How to Verify

```bash
npx serve . --listen 3456
```

1. Open `http://localhost:3456`
2. Start a tournament, add 3 players
3. Tap the "3 players" button — a card drops down showing all 3 names with Remove buttons
4. Tap again — card collapses, count remains visible

## How to Run Tests

```bash
npm test                          # unit tests (no changes expected)
npx playwright test tests/e2e/us6-player-management.test.js  # roster e2e tests
npx playwright test               # full suite
```

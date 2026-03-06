# Quickstart: Tap-to-Select (006)

## What Changed

Two files modified:

1. **`src/views/liveView.js`** — `newMatchFormHtml()` replaced with a 3-step player pick grid; new click handlers for `pick-player` and `deselect-player`; submit handler reads from `_selectedP1`/`_selectedP2` instead of `<select>` values; `playerSelectOptions()` removed
2. **`styles.css`** — new rules for `.pick-panel`, `.pick-grid`, `.pick-btn`, `.pick-confirm`, `.pick-pill`, `.pick-vs`, `.pick-start-form`

## How to Verify

```bash
npx serve . --listen 3456
```

1. Open `http://localhost:3456`
2. Start a tournament, add 3+ players
3. Tap "+ New Match" — a 2-column grid of player name buttons appears with "Pick Player 1:"
4. Tap a name — it highlights, prompt changes to "Pick Player 2:"
5. Tap another name — both names appear as pills with "vs", target input and Start button appear
6. Tap Start — match card appears, form collapses
7. To deselect: tap a selected pill to go back a step

## How to Run Tests

```bash
npm test                                              # unit tests
npx playwright test tests/e2e/us7-new-match-form.test.js  # match form e2e tests
npx playwright test                                   # full suite
```

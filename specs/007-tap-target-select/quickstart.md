# Quickstart: Tap-to-Select Target Score Grid (007)

## What Changed

Two files modified:

1. **`src/views/liveView.js`** — adds `_selectedTarget = 7` ephemeral state; updates `newMatchFormHtml()` confirm step to render a 10-button target grid instead of `<input type="number">`; adds `pick-target` click handler; updates `toggle-new-match` and submit handlers to use/reset `_selectedTarget`
2. **`styles.css`** — adds `.pick-target-grid` rule (5-column grid reusing `.pick-btn` styles from 006)

## How to Verify

```bash
npx serve . --listen 3456
```

1. Open `http://localhost:3456`
2. Start a tournament, add 2+ players
3. Tap "＋ New Match" → pick two players → confirm step appears
4. Verify 10 target buttons appear (3, 5, 7, 9, 11, 13, 15, 17, 19, 21) with 7 highlighted
5. Tap "11" → 11 is now highlighted, 7 is not
6. Tap Start → match card shows target of 11
7. Reopen form → 7 is pre-selected again

## How to Run Tests

```bash
npm test                                                         # unit tests
npx playwright test tests/e2e/us7-new-match-form.test.js        # match form e2e tests
npx playwright test                                              # full suite
```

## E2E Helper Update Pattern

Old (number input):
```javascript
await page.locator('input[data-start-target]').fill('7');
```

New (pick-target button):
```javascript
// Default (7) is pre-selected — no click needed if target=7
// For non-default:
await page.locator('[data-action="pick-target"]').filter({ hasText: '11' }).click();
```

Helpers that previously used `fill('1')` (not a preset) should be updated to omit the target step entirely (use default 7).

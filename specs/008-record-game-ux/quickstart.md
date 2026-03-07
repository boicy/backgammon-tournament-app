# Quickstart / Integration Scenarios: Record Game UX

These are the end-to-end verification scenarios to run via Playwright MCP after implementation.

## Setup (reuse across all scenarios)

```
1. Navigate to /
2. Clear localStorage
3. Reload /
4. Fill tournament name → "Test Night" → Submit
5. Add players: "Alice", "Bob"
6. Open + New Match → pick Alice → pick Bob → (target defaults to 7) → Start
```

---

## Scenario 1: Winner pick buttons appear (US1 AC1)

```
1. [Setup]
2. Locate the active match card → tap [data-action="record-game"]
3. Assert [data-game-form] is visible
4. Assert TWO [data-action="pick-winner"] buttons are visible
5. Assert NO [data-game-winner] <select> exists in the form
6. Assert button texts are "Alice" and "Bob"
```

Expected: two large buttons, no dropdown.

---

## Scenario 2: Tapping a winner button selects it (US1 AC2 + AC3)

```
1. [Setup] → expand game form
2. Assert neither button has class pick-btn--selected
3. Tap Alice's [data-action="pick-winner"] button
4. Assert Alice's button has class pick-btn--selected
5. Assert Bob's button does NOT have pick-btn--selected
6. Tap Bob's [data-action="pick-winner"] button
7. Assert Bob's button has class pick-btn--selected
8. Assert Alice's button does NOT have pick-btn--selected
```

Expected: only one button selected at a time.

---

## Scenario 3: Tapping selected button deselects (US1 AC4)

```
1. [Setup] → expand game form
2. Tap Alice's button → Alice selected
3. Tap Alice's button again
4. Assert neither button has pick-btn--selected
```

Expected: toggle-off behaviour.

---

## Scenario 4: Submit blocked without winner (US1 AC5)

```
1. [Setup] → expand game form
2. Do NOT tap any winner button
3. Tap [data-action="submit-game"]
4. Assert [data-game-error] is visible with error text
5. Assert form is still expanded (not submitted)
6. Assert score is still 0-0
```

Expected: inline error; no game recorded.

---

## Scenario 5: Submit with winner records game and collapses form (US1+US2 AC3)

```
1. [Setup] → expand game form
2. Tap Alice's button
3. Assert Alice selected
4. Tap [data-action="submit-game"]
5. Assert form collapses
6. Assert score shows 1 for Alice's side
```

Expected: game recorded; score updates in place.

---

## Scenario 6: Save button is prominent (US2 AC1 + AC2)

```
1. [Setup] → expand game form
2. Measure submit button height via evaluate(el => el.getBoundingClientRect().height)
3. Assert height >= 48
4. Measure submit button width and container width
5. Assert submit button width approximately equals container width (full-width CTA)
```

Expected: button is tall and full-width.

---

## Scenario 7: Winner state resets when form closes and reopens (regression)

```
1. [Setup] → expand game form
2. Tap Alice → Alice selected
3. Tap [data-action="record-game"] to close form
4. Tap [data-action="record-game"] to reopen form
5. Assert neither button has pick-btn--selected
```

Expected: clean state on reopen.

---

## Scenario 8: Correct player ID is recorded (regression — FR-010)

```
1. [Setup] → expand game form
2. Tap Bob's button (second player)
3. Tap [data-action="submit-game"]
4. Assert score: Bob's side shows 1, Alice's side shows 0
```

Expected: winner recorded as Bob regardless of player order.

---

## Existing helper compatibility check

All existing e2e tests that used `[data-game-winner].selectOption(...)` must be updated to:
```javascript
await card.locator('[data-action="pick-winner"]').filter({ hasText: winnerName }).click();
```

Files to update:
- `tests/e2e/us2-inline-recording.test.js`
- `tests/e2e/us3-night-leaderboard.test.js`
- `tests/e2e/us4-visual-refresh.test.js`
- `tests/e2e/us5-standings-live.test.js`
- `tests/e2e/t034-validation.test.js`
- `tests/e2e/us4-all-time-leaderboard.test.js`

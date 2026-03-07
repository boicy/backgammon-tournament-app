# Quickstart: Cancel New Match Creation (011)

## Run the App

```bash
npx serve .
# App runs at http://localhost:3000
```

## Run Unit Tests

```bash
npm test
# No new unit tests for this feature — all coverage is e2e
```

## Run E2E Tests (this feature)

```bash
npx playwright test tests/e2e/us11-cancel-new-match.test.js
```

## Run All E2E Tests

```bash
npx playwright test
```

## Manual Test Walkthrough

1. Open the app, start a tournament, add 3+ players
2. Open the new match form (tap "New Match")
3. Pick P1 — verify Cancel button is visible
4. Press Cancel — form should close, re-open to confirm reset
5. Repeat: pick P1, then deselect P1 — form should return to step 1
6. Pick P1 + P2 (confirm step) — press Cancel — form closes, clean state
7. Pick P1 + P2 (confirm step) — deselect one player — returns to step 1, target cleared

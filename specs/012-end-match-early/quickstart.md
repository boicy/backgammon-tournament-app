# Quickstart: 012-end-match-early

## Run the App

```bash
npx serve .          # http://localhost:3000
```

## Run Unit Tests

```bash
npm test             # Vitest — all unit tests
npm run test:watch   # TDD watch mode
```

## Run E2E Tests

```bash
# Start server first, then use Playwright MCP browser tools
# Tests live at: tests/e2e/012-end-match-early.spec.js
npx playwright test tests/e2e/012-end-match-early.spec.js
```

## Files Changed in This Feature

| File | Change |
|------|--------|
| `src/models/match.js` | Add `earlyMatchWinner()` |
| `src/store/store.js` | Add `endMatchEarly()` action |
| `src/models/matchStanding.js` | Fix loss guard for null winnerId |
| `src/views/liveView.js` | Update overflow handler; import `endMatchEarly` |
| `src/views/gameHistory.js` | Update `matchStatusLabel` for `endedEarly` flag |
| `styles.css` | Add `.badge-ended-early` style |

## Test Files

| File | What it covers |
|------|---------------|
| `tests/models/match.test.js` | `earlyMatchWinner()` unit tests |
| `tests/store/store.test.js` | `endMatchEarly()` store action tests |
| `tests/models/matchStanding.test.js` | Standings with null winnerId (tied early-end) |
| `tests/e2e/012-end-match-early.spec.js` | All acceptance scenarios end-to-end |

## Key Conventions

- TDD: Write failing tests BEFORE implementation code (constitution II)
- `escapeHtml()` on all user data inserted into innerHTML
- Event delegation on container — no direct element listeners
- Emit `state:matches:changed` + `state:standings:changed` after match state change
- `window.confirm` for confirmation dialogs (consistent with existing pattern)

# Quickstart: Concurrent Match Participation

**Feature**: 010-concurrent-matches
**Date**: 2026-03-07

## Files Changed

| File | Change |
|------|--------|
| `src/store/store.js` | Replace per-player active-match guard with per-pair duplicate guard in `startMatch()` |
| `src/views/liveView.js` | Add active-match count badge to player picker buttons |
| `styles.css` | Add `.pick-btn__badge` styles |
| `tests/store/store.test.js` | Replace two FR-012 tests; add duplicate-pair test |
| `tests/e2e/us10-concurrent-matches.test.js` | New file — Playwright e2e tests for all acceptance scenarios |

---

## Running Tests

```bash
# Unit tests (Vitest)
npm test

# E2E tests (Playwright — requires app to be served first)
npx serve .        # terminal 1
npx playwright test tests/e2e/us10-concurrent-matches.test.js  # terminal 2
```

## Manual Verification

1. Start the app: `npx serve .` → open `http://localhost:3000`
2. Create a tournament and add 3 players: Alice, Bob, Charlie.
3. Start a match: Alice vs Bob.
4. **Verify**: Alice and Bob show a badge `1` in the player picker.
5. Start a second match: Alice vs Charlie (should succeed).
6. **Verify**: Two active match cards appear on the live view.
7. Record a game in the Alice vs Bob match.
8. **Verify**: Alice vs Charlie score is unchanged.
9. Try to start another Alice vs Bob match (should be blocked with error message).
10. End the tournament — both incomplete matches should archive correctly.

## Key Code Locations

- Constraint to change: `src/store/store.js` lines 184–187 (`startMatch`)
- Player picker template: `src/views/liveView.js` `newMatchFormHtml()` function
- Tests to update: `tests/store/store.test.js` lines 706–713

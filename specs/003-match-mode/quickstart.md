# Quickstart & Test Scenarios: Match-Mode Tournament Nights

**Branch**: `003-match-mode` | **Date**: 2026-03-05

---

## Setup

```bash
npx serve .          # serve the app
npx playwright test  # run all e2e tests
npm test             # run all unit tests
```

---

## Scenario 1 — Basic match to completion (US1)

1. Open the app. Enter tournament name "Club Night" → submit.
2. Add player "Alice". Add player "Bob".
3. Tap **Start Match**. Select Alice vs Bob, target = 5. Confirm.
4. The match hub shows "Alice vs Bob (0 – 0 of 5)" under Active Matches.
5. Tap into the match. Record: standard win for Alice, cube 1 → score 1–0.
6. Record: gammon for Bob, cube 2 → score 1–4.
7. Record: standard win for Alice, cube 4 → score 5–4.
8. Match auto-completes. Alice shown as winner. Match moves to Completed.
9. Match detail becomes read-only (no Record button).

**Expected**: Match complete, Alice = winner, game log shows 3 games with correct points.

---

## Scenario 2 — Multiple simultaneous matches (US2)

1. Add 4 players: Alice, Bob, Charlie, Dave.
2. Start Match 1: Alice vs Bob, target 7.
3. Start Match 2: Charlie vs Dave, target 5.
4. Hub shows 2 active matches. Navigate into Match 1, record one game. Navigate to Match 2, record one game.
5. Verify scores are independent.
6. Attempt to start a third match with Alice (already in Match 1) → error shown, match not created.

**Expected**: Two independent matches, Alice blocked from second match.

---

## Scenario 3 — Ad-hoc player addition (US2)

1. Start a tournament. Add Alice and Bob. Start a match.
2. Mid-match: tap **Add Player**, enter "Charlie". Charlie appears in the player list.
3. Start a second match: Charlie vs Bob (Bob not in an active match).

**Expected**: Charlie addable at any time; immediately available for new matches.

---

## Scenario 4 — Night leaderboard (US3)

1. Complete two matches: Alice beats Bob (target 5), Alice beats Charlie (target 3).
2. View the Leaderboard tab.
3. Alice shows 2 wins. Bob and Charlie show 0 wins.
4. Alice ranks 1st.

**Expected**: Leaderboard sorts by match wins, tiebreaker by total points.

---

## Scenario 5 — Tiebreaker (US3)

1. Seed two complete matches: Alice wins vs Bob (Alice scores 5 pts), Charlie wins vs Dave (Charlie scores 8 pts). Both have 1 win.
2. View leaderboard.

**Expected**: Charlie ranks above Alice (1 win, 8 pts vs 1 win, 5 pts).

---

## Scenario 6 — Match abandonment (US2 edge case)

1. Start a match Alice vs Bob.
2. Record one game.
3. Tap **Abandon Match** → confirm.
4. Match moves to a "No Result" state in the hub. Neither player gets a win. Both players are freed to join new matches.

**Expected**: Abandoned match not counted in standings; players available again.

---

## Scenario 7 — All-time leaderboard with legacy archive (US4)

1. Seed `backgammon:archive` in localStorage with one pre-003 snapshot (has `games` field, no `matches` field).
2. Complete a match-based night and archive it.
3. Open the Club tab.

**Expected**: All-time table renders both archive entries without errors. Legacy winner credited with 1 tournament win.

---

## Scenario 8 — Player removal blocked (edge case FR-009)

1. Start a match between Alice and Bob.
2. Try to remove Alice from the player list while her match is active.

**Expected**: Remove button is disabled or shows an error. Alice cannot be removed.

---

## Manual Validation Checklist

- [ ] Match score updates immediately on game record
- [ ] Auto-complete fires the moment target is reached (not one game later)
- [ ] Active matches list updates without page refresh
- [ ] Adding a player mid-night works on mobile (375px viewport)
- [ ] All interactive elements ≥ 44×44px on mobile
- [ ] No horizontal scroll on any view at 375px
- [ ] Abandoned match shows distinct visual treatment (not win, not loss)
- [ ] Leaderboard tiebreaker (points) works correctly
- [ ] Legacy archive entries render in Club tab alongside new ones

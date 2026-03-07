/**
 * US10 — Concurrent Match Participation (010-concurrent-matches)
 *
 * US1 (P1): Start New Match While Another Is Active
 *   S1: Start Alice-vs-Bob then Alice-vs-Charlie → both active cards visible
 *   S2: Alice-vs-Bob active → open picker → Alice and Bob show .pick-btn__badge with text "1"
 *   S3: Charlie has no active match → Charlie's picker button has no .pick-btn__badge
 *   S4: Record a game in Alice-vs-Bob → Alice-vs-Charlie score still 0–0
 *
 * US2 (P2): Record Games Across Concurrent Matches
 *   S1: Record a game in Match 1 → Match 2 score stays 0–0
 *   S2: Complete Match 1 → Match 2 card remains .live-card--active
 *   S3: Open record-game form on Match 1; open on Match 2 → Match 1 form collapses
 *   S4: Complete both matches → navigate to Standings → both appear in results
 *
 * US3 (P3): Prevent Duplicate Active Matches
 *   S1: Start Alice-vs-Bob; attempt another Alice-vs-Bob → [data-match-error] visible
 *   S2: Complete Alice-vs-Bob; start new Alice-vs-Bob → succeeds
 */

import { test, expect } from './fixtures.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function setupTournament(page, { name = 'Concurrent Night', players = [] } = {}) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  await page.locator('#start-tournament-btn').click();
  await expect(page.locator('.view--live')).toBeVisible();
  for (const playerName of players) {
    await page.locator('[data-action="toggle-add-player"]').click();
    await page.locator('#player-name-input').fill(playerName);
    await page.locator('#add-player-form button[type="submit"]').click();
    await page.waitForTimeout(50);
  }
}

async function startMatch(page, p1Name, p2Name, target = 3) {
  const expanded = await page.locator('.live-new-match--expanded').isVisible().catch(() => false);
  if (!expanded) await page.locator('[data-action="toggle-new-match"]').click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: p1Name }).click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: p2Name }).click();
  await page.locator(`[data-action="pick-target"][data-target-value="${target}"]`).click();
  await page.locator('button[type="submit"]').filter({ hasText: 'Start' }).click();
  await page.waitForTimeout(50);
}

async function recordGame(page, card, winnerName) {
  const formVisible = await card.locator('[data-game-form]').isVisible().catch(() => false);
  if (!formVisible) await card.locator('[data-action="record-game"]').click();
  await card.locator('[data-action="pick-winner"]').filter({ hasText: winnerName }).click();
  await card.locator('[data-action="submit-game"]').click();
  await page.waitForTimeout(50);
}

// Record enough games to complete a match with the given target
async function completeMatch(page, card, winnerName, target = 3) {
  for (let i = 0; i < target; i++) {
    await recordGame(page, card, winnerName);
  }
}

// ---------------------------------------------------------------------------
// US1 — S1: Both active cards visible after starting two matches for same player
// ---------------------------------------------------------------------------

test('US1-S1 — start Alice-vs-Bob then Alice-vs-Charlie → both active cards visible', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
  await startMatch(page, 'Alice', 'Bob');
  await startMatch(page, 'Alice', 'Charlie');

  const activeCards = page.locator('.live-card--active');
  await expect(activeCards).toHaveCount(2);
});

// ---------------------------------------------------------------------------
// US1 — S2: Players already in a match show badge "1" in picker
// ---------------------------------------------------------------------------

test('US1-S2 — after starting Alice-vs-Bob, Alice and Bob show badge "1" in picker', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
  await startMatch(page, 'Alice', 'Bob');

  // Open the new-match picker
  const expanded = await page.locator('.live-new-match--expanded').isVisible().catch(() => false);
  if (!expanded) await page.locator('[data-action="toggle-new-match"]').click();

  const aliceBtn = page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' });
  const bobBtn = page.locator('[data-action="pick-player"]').filter({ hasText: 'Bob' });

  await expect(aliceBtn.locator('.pick-btn__badge')).toBeVisible();
  await expect(aliceBtn.locator('.pick-btn__badge')).toHaveText('1');
  await expect(bobBtn.locator('.pick-btn__badge')).toBeVisible();
  await expect(bobBtn.locator('.pick-btn__badge')).toHaveText('1');
});

// ---------------------------------------------------------------------------
// US1 — S3: Player with no active match shows no badge in picker
// ---------------------------------------------------------------------------

test('US1-S3 — Charlie has no active match → no .pick-btn__badge on Charlie button', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
  await startMatch(page, 'Alice', 'Bob');

  // Open picker
  const expanded = await page.locator('.live-new-match--expanded').isVisible().catch(() => false);
  if (!expanded) await page.locator('[data-action="toggle-new-match"]').click();

  const charlieBtn = page.locator('[data-action="pick-player"]').filter({ hasText: 'Charlie' });
  await expect(charlieBtn.locator('.pick-btn__badge')).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// US1 — S4 / US2 — S1: Recording a game in one match does not affect the other
// ---------------------------------------------------------------------------

test('US1-S4/US2-S1 — record a game in Alice-vs-Bob → Alice-vs-Charlie score still 0–0', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
  await startMatch(page, 'Alice', 'Bob');
  await startMatch(page, 'Alice', 'Charlie');

  // Find cards by player name text
  const bobCard = page.locator('.live-card--active').filter({ hasText: 'Bob' });
  const charlieCard = page.locator('.live-card--active').filter({ hasText: 'Charlie' });

  // Record a game in Alice-vs-Bob
  await recordGame(page, bobCard, 'Alice');

  // Alice-vs-Charlie should still have no games recorded
  await expect(charlieCard).toContainText('No games yet');
});

// ---------------------------------------------------------------------------
// US2 — S2: Completing one match leaves the other match active
// ---------------------------------------------------------------------------

test('US2-S2 — completing Alice-vs-Bob (target 3) → Alice-vs-Charlie remains active', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
  await startMatch(page, 'Alice', 'Bob', 3);
  await startMatch(page, 'Alice', 'Charlie');

  const bobCard = page.locator('.live-card--active').filter({ hasText: 'Bob' });
  await completeMatch(page, bobCard, 'Alice', 3);

  // Alice-vs-Bob should now be complete
  await expect(page.locator('.live-card--complete').filter({ hasText: 'Bob' })).toBeVisible();

  // Alice-vs-Charlie should still be active
  await expect(page.locator('.live-card--active').filter({ hasText: 'Charlie' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// US2 — S3: Opening record-game form on Match 2 collapses Match 1 form
// ---------------------------------------------------------------------------

test('US2-S3 — open record-game form on Match 2 → Match 1 form collapses', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
  await startMatch(page, 'Alice', 'Bob');
  await startMatch(page, 'Alice', 'Charlie');

  const bobCard = page.locator('.live-card--active').filter({ hasText: 'Bob' });
  const charlieCard = page.locator('.live-card--active').filter({ hasText: 'Charlie' });

  // Open form on first match
  await bobCard.locator('[data-action="record-game"]').click();
  await expect(bobCard.locator('[data-game-form]')).toBeVisible();

  // Open form on second match — first form should collapse
  await charlieCard.locator('[data-action="record-game"]').click();
  await expect(charlieCard.locator('[data-game-form]')).toBeVisible();
  await expect(bobCard.locator('[data-game-form]')).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// US2 — S4: Both completed matches appear in standings
// ---------------------------------------------------------------------------

test('US2-S4 — complete both concurrent matches → standings shows results from both', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
  await startMatch(page, 'Alice', 'Bob', 3);
  await startMatch(page, 'Alice', 'Charlie', 3);

  const bobCard = page.locator('.live-card--active').filter({ hasText: 'Bob' });
  const charlieCard = page.locator('.live-card--active').filter({ hasText: 'Charlie' });

  await completeMatch(page, bobCard, 'Alice', 3);
  await completeMatch(page, charlieCard, 'Alice', 3);

  // Navigate to standings
  await page.goto('/#/leaderboard');
  await expect(page.locator('.view--leaderboard, .leaderboard')).toBeVisible();

  // Alice should appear (won both matches)
  await expect(page.locator('text=Alice')).toBeVisible();
});

// ---------------------------------------------------------------------------
// US3 — S1: Attempting a duplicate active match shows error
// ---------------------------------------------------------------------------

test('US3-S1 — attempt second Alice-vs-Bob while first is active → error shown', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
  await startMatch(page, 'Alice', 'Bob');

  // Attempt duplicate
  await startMatch(page, 'Alice', 'Bob');

  const errorEl = page.locator('[data-match-error]');
  await expect(errorEl).toBeVisible();
  await expect(errorEl).toHaveText(/active match between these players/i);
});

// ---------------------------------------------------------------------------
// US3 — S2: After completing a match, a new match between same players succeeds
// ---------------------------------------------------------------------------

test('US3-S2 — complete Alice-vs-Bob then start new Alice-vs-Bob → succeeds', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
  await startMatch(page, 'Alice', 'Bob', 3);

  const bobCard = page.locator('.live-card--active').filter({ hasText: 'Bob' });
  await completeMatch(page, bobCard, 'Alice', 3);

  // Confirm first match is complete
  await expect(page.locator('.live-card--complete').filter({ hasText: 'Bob' })).toBeVisible();

  // Start a new Alice-vs-Bob match
  await startMatch(page, 'Alice', 'Bob', 3);

  // A new active card for Bob should appear
  await expect(page.locator('.live-card--active').filter({ hasText: 'Bob' })).toBeVisible();

  // No error shown
  await expect(page.locator('[data-match-error]')).not.toBeVisible();
});

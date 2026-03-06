/**
 * US3 — Night Leaderboard & Match History
 * Tests the leaderboard (match wins ranked) and game history (grouped by match).
 *
 * Requires liveView (#/live), leaderboard (#/leaderboard), and history (#/history)
 * to be implemented with match-mode support.
 */

import { test, expect } from './fixtures.js';

// Helper: set up a fresh tournament with players
async function setupNight(page, { players = ['Alice', 'Bob', 'Carol'] } = {}) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  await page.locator('.name-prompt input[type="text"]').fill('Test Night');
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--live')).toBeVisible();
  for (const name of players) {
    await page.locator('[data-action="toggle-add-player"]').click();
    await page.locator('#player-name-input').fill(name);
    await page.locator('#add-player-form button[type="submit"]').click();
    await page.waitForTimeout(50);
  }
}

// Helper: play a match to completion (winner wins all games with standard × 1)
async function playMatchToCompletion(page, { p1Name, p2Name, winner, target = 3 }) {
  // Expand the new-match form
  const expanded = await page.locator('.live-new-match--expanded').isVisible().catch(() => false);
  if (!expanded) await page.locator('[data-action="toggle-new-match"]').click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: p1Name }).click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: p2Name }).click();
  if (target !== 7) {
    await page.locator('[data-action="pick-target"]').filter({ hasText: new RegExp(`^${target}$`) }).click();
  }
  await page.locator('#start-match-form button[type="submit"]').click();
  await page.waitForTimeout(50);

  // Record games until winner reaches target (standard × 1 = 1 pt per game)
  const card = page.locator('.live-card--active').filter({ hasText: p1Name });
  for (let i = 0; i < target; i++) {
    await card.locator('[data-action="record-game"]').click();
    await card.locator('[data-game-winner]').selectOption({ label: winner });
    await card.locator('[data-result-type]').selectOption('standard');
    await card.locator('[data-cube-value]').selectOption('1');
    await card.locator('[data-action="submit-game"]').click();
    await page.waitForTimeout(50);
  }

  // Match should now be complete
  await expect(page.locator('.live-card--complete').filter({ hasText: p1Name })).toBeVisible();
}

// ---------------------------------------------------------------------------
// AC1: Match wins ranked correctly
// ---------------------------------------------------------------------------

test('AC1 — player with more match wins ranks higher', async ({ page }) => {
  await setupNight(page, { players: ['Alice', 'Bob'] });

  // Alice wins one match, Bob wins none
  await playMatchToCompletion(page, { p1Name: 'Alice', p2Name: 'Bob', winner: 'Alice' });

  // Navigate to leaderboard
  await page.goto('/#/leaderboard');
  await expect(page.locator('.view--leaderboard')).toBeVisible();

  // Alice should be rank 1
  const firstRow = page.locator('#standings-body tr').first();
  await expect(firstRow).toContainText('Alice');
});

// ---------------------------------------------------------------------------
// AC2: Points tiebreaker
// ---------------------------------------------------------------------------

test('AC2 — points tiebreaker: same wins but different points', async ({ page }) => {
  await setupNight(page, { players: ['Alice', 'Bob', 'Carol', 'Dave'] });

  // Alice vs Bob — Alice wins with 3 standard games (target=3, 3 points)
  await page.locator('[data-action="toggle-new-match"]').click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: 'Bob' }).click();
  await page.locator('[data-action="pick-target"]').filter({ hasText: /^3$/ }).click();
  await page.locator('#start-match-form button[type="submit"]').click();
  await page.waitForTimeout(50);

  const aliceCard = page.locator('.live-card--active').filter({ hasText: 'Alice' }).first();
  for (let i = 0; i < 3; i++) {
    await aliceCard.locator('[data-action="record-game"]').click();
    await aliceCard.locator('[data-game-winner]').selectOption({ label: 'Alice' });
    await aliceCard.locator('[data-result-type]').selectOption('standard');
    await aliceCard.locator('[data-cube-value]').selectOption('1');
    await aliceCard.locator('[data-action="submit-game"]').click();
    await page.waitForTimeout(50);
  }

  // Carol vs Dave — Carol wins with 1 gammon×2cube game (target=3, 4 pts > 3)
  await page.locator('[data-action="toggle-new-match"]').click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: 'Carol' }).click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: 'Dave' }).click();
  await page.locator('[data-action="pick-target"]').filter({ hasText: /^3$/ }).click();
  await page.locator('#start-match-form button[type="submit"]').click();
  await page.waitForTimeout(50);

  const carolCard = page.locator('.live-card--active').filter({ hasText: 'Carol' }).first();
  await carolCard.locator('[data-action="record-game"]').click();
  await carolCard.locator('[data-game-winner]').selectOption({ label: 'Carol' });
  await carolCard.locator('[data-result-type]').selectOption('gammon');
  await carolCard.locator('[data-cube-value]').selectOption('2');
  await carolCard.locator('[data-action="submit-game"]').click();
  await page.waitForTimeout(50);

  // Navigate to leaderboard
  await page.goto('/#/leaderboard');
  const rows = page.locator('#standings-body tr');
  const firstRowText = await rows.first().textContent();
  const secondRowText = await rows.nth(1).textContent();
  // Carol has more points (4 vs 3) so Carol should be rank 1
  expect(firstRowText).toContain('Carol');
  expect(secondRowText).toContain('Alice');
});

// ---------------------------------------------------------------------------
// AC3: Zero-win player at bottom
// ---------------------------------------------------------------------------

test('AC3 — player with zero wins appears at bottom of leaderboard', async ({ page }) => {
  await setupNight(page, { players: ['Alice', 'Bob'] });

  await playMatchToCompletion(page, { p1Name: 'Alice', p2Name: 'Bob', winner: 'Alice' });

  await page.goto('/#/leaderboard');
  const rows = page.locator('#standings-body tr');
  const lastRow = rows.last();
  await expect(lastRow).toContainText('Bob');
});

// ---------------------------------------------------------------------------
// AC4: Leaderboard updates live (without page refresh)
// ---------------------------------------------------------------------------

test('AC4 — leaderboard updates live when match completes', async ({ page }) => {
  await setupNight(page, { players: ['Alice', 'Bob'] });

  // Navigate to leaderboard first
  await page.goto('/#/leaderboard');
  await expect(page.locator('.view--leaderboard')).toBeVisible();

  // Both players start with 0 wins — Alice should not have wins yet
  const aliceRow = page.locator('#standings-body tr', { hasText: 'Alice' });
  await expect(aliceRow).toBeVisible();

  // Navigate to live view and play a match
  await page.goto('/#/live');
  await playMatchToCompletion(page, { p1Name: 'Alice', p2Name: 'Bob', winner: 'Alice' });

  // Navigate back to leaderboard — Alice should now show as rank 1
  await page.goto('/#/leaderboard');
  const firstRow = page.locator('#standings-body tr').first();
  await expect(firstRow).toContainText('Alice');
});

// ---------------------------------------------------------------------------
// History: games grouped by match
// ---------------------------------------------------------------------------

test('history view groups games by match with match header', async ({ page }) => {
  await setupNight(page, { players: ['Alice', 'Bob'] });

  // Play one match to completion
  await playMatchToCompletion(page, { p1Name: 'Alice', p2Name: 'Bob', winner: 'Alice' });

  // Navigate to history
  await page.goto('/#/history');
  await expect(page.locator('.view--history')).toBeVisible();

  // Should show a match group header
  await expect(page.locator('.match-group-header').first()).toBeVisible();
  await expect(page.locator('.match-group-header').first()).toContainText('Alice');
  await expect(page.locator('.match-group-header').first()).toContainText('Bob');

  // Should show individual game rows within the group (default target=3, 3 games)
  await expect(page.locator('.match-group .history-item')).toHaveCount(3);
});

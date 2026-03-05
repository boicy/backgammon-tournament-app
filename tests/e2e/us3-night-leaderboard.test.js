/**
 * US3 — Night Leaderboard & Match History
 * Tests the leaderboard (match wins ranked) and game history (grouped by match).
 *
 * Requires matchHub (#/players), matchDetail (#/match), leaderboard (#/leaderboard),
 * and history (#/history) to be implemented with match-mode support.
 */

import { test, expect } from './fixtures.js';

// Helper: set up a fresh tournament
async function setupNight(page, { players = ['Alice', 'Bob', 'Carol'] } = {}) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  await page.locator('.name-prompt input[type="text"]').fill('Test Night');
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--match-hub')).toBeVisible();
  for (const name of players) {
    await page.locator('[data-add-player-input]').fill(name);
    await page.locator('[data-add-player-form] button[type="submit"]').click();
  }
}

// Helper: play a match to completion (winner wins with standard single-point games)
async function playMatchToCompletion(page, { p1Name, p2Name, winner, target = 3 }) {
  // Start the match from matchHub
  await page.locator('select[data-start-p1]').selectOption({ label: p1Name });
  await page.locator('select[data-start-p2]').selectOption({ label: p2Name });
  await page.locator('input[data-start-target]').fill(String(target));
  await page.locator('button[data-action="start-match"]').click();
  // Enter the match
  const card = page.locator('.match-card--active', { hasText: p1Name }).first();
  await card.locator('button[data-action="enter-match"]').click();
  await expect(page.locator('.view--match')).toBeVisible();
  // Record games until winner reaches target
  for (let i = 0; i < target; i++) {
    await page.locator('select[data-game-winner]').selectOption({ label: winner });
    await page.locator('select[data-result-type]').selectOption('standard');
    await page.locator('select[data-cube-value]').selectOption('1');
    await page.locator('button[data-action="record-game"]').click();
  }
  await expect(page.locator('[data-testid="match-complete-banner"]')).toBeVisible();
  // Back to hub
  await page.locator('[data-action="back-to-hub"]').click();
  await expect(page.locator('.view--match-hub')).toBeVisible();
}

// ---------------------------------------------------------------------------
// AC1: Match wins ranked correctly
// ---------------------------------------------------------------------------

test('AC1 — player with more match wins ranks higher', async ({ page }) => {
  await setupNight(page, { players: ['Alice', 'Bob'] });

  // Alice wins one match, Bob wins none
  await playMatchToCompletion(page, { p1Name: 'Alice', p2Name: 'Bob', winner: 'Alice', target: 1 });

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

  // Alice beats Bob 1-0 (1 point), Carol beats Dave 4-0 (gammon×2=4 points)
  // Then Alice and Carol each have 1 win — Carol should rank higher via points

  // Alice vs Bob — Alice wins with 1 standard game (target=1)
  await page.locator('select[data-start-p1]').selectOption({ label: 'Alice' });
  await page.locator('select[data-start-p2]').selectOption({ label: 'Bob' });
  await page.locator('input[data-start-target]').fill('1');
  await page.locator('button[data-action="start-match"]').click();
  const aliceCard = page.locator('.match-card--active', { hasText: 'Alice' }).first();
  await aliceCard.locator('button[data-action="enter-match"]').click();
  await page.locator('select[data-game-winner]').selectOption({ label: 'Alice' });
  await page.locator('select[data-result-type]').selectOption('standard');
  await page.locator('select[data-cube-value]').selectOption('1');
  await page.locator('button[data-action="record-game"]').click();
  await page.locator('[data-action="back-to-hub"]').click();

  // Carol vs Dave — Carol wins with gammon×2 (target=4, one game worth 4 pts)
  await page.locator('select[data-start-p1]').selectOption({ label: 'Carol' });
  await page.locator('select[data-start-p2]').selectOption({ label: 'Dave' });
  await page.locator('input[data-start-target]').fill('4');
  await page.locator('button[data-action="start-match"]').click();
  const carolCard = page.locator('.match-card--active', { hasText: 'Carol' }).first();
  await carolCard.locator('button[data-action="enter-match"]').click();
  await page.locator('select[data-game-winner]').selectOption({ label: 'Carol' });
  await page.locator('select[data-result-type]').selectOption('gammon');
  await page.locator('select[data-cube-value]').selectOption('2');
  await page.locator('button[data-action="record-game"]').click();
  await page.locator('[data-action="back-to-hub"]').click();

  // Navigate to leaderboard
  await page.goto('/#/leaderboard');
  const rows = page.locator('#standings-body tr');
  const firstRowText = await rows.first().textContent();
  const secondRowText = await rows.nth(1).textContent();
  // Carol has more points (4 vs 1) so Carol should be rank 1
  expect(firstRowText).toContain('Carol');
  expect(secondRowText).toContain('Alice');
});

// ---------------------------------------------------------------------------
// AC3: Zero-win player at bottom
// ---------------------------------------------------------------------------

test('AC3 — player with zero wins appears at bottom of leaderboard', async ({ page }) => {
  await setupNight(page, { players: ['Alice', 'Bob'] });

  await playMatchToCompletion(page, { p1Name: 'Alice', p2Name: 'Bob', winner: 'Alice', target: 1 });

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

  // Navigate to matchHub and play a match
  await page.goto('/#/players');
  await playMatchToCompletion(page, { p1Name: 'Alice', p2Name: 'Bob', winner: 'Alice', target: 1 });

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
  await playMatchToCompletion(page, { p1Name: 'Alice', p2Name: 'Bob', winner: 'Alice', target: 2 });

  // Navigate to history
  await page.goto('/#/history');
  await expect(page.locator('.view--history')).toBeVisible();

  // Should show a match group header
  await expect(page.locator('.match-group-header').first()).toBeVisible();
  await expect(page.locator('.match-group-header').first()).toContainText('Alice');
  await expect(page.locator('.match-group-header').first()).toContainText('Bob');

  // Should show individual game rows within the group
  await expect(page.locator('.match-group .history-item')).toHaveCount(2);
});

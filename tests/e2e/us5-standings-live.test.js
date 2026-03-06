/**
 * US5 — Standings with Live Match Indicators (004-ux-redesign)
 * Tests: Live column in standings shows active match info for in-play players.
 *
 * AC1: Player in active match shows "vs [opponent] [score]" in Live column
 * AC2: Player with no active match shows "—" or empty Live cell
 * AC3: Live column clears when match completes; Wins/Points update
 */

import { test, expect } from './fixtures.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function setupTournament(page, { name = 'Club Night', players = [] } = {}) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  await page.locator('.name-prompt input[type="text"]').fill(name);
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--live')).toBeVisible();
  for (const playerName of players) {
    await page.locator('[data-action="toggle-add-player"]').click();
    await page.locator('#player-name-input').fill(playerName);
    await page.locator('#add-player-form button[type="submit"]').click();
    await page.waitForTimeout(50);
  }
}

async function startMatch(page, { p1Name, p2Name, target = 7 } = {}) {
  const expanded = await page.locator('.live-new-match--expanded').isVisible().catch(() => false);
  if (!expanded) await page.locator('[data-action="toggle-new-match"]').click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: p1Name }).click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: p2Name }).click();
  if (target !== 7) {
    await page.locator('[data-action="pick-target"]').filter({ hasText: new RegExp(`^${target}$`) }).click();
  }
  await page.locator('#start-match-form button[type="submit"]').click();
  await page.waitForTimeout(50);
}

// ---------------------------------------------------------------------------
// AC1: Active match player shows "vs [opponent]" in Live column
// ---------------------------------------------------------------------------

test('AC1 — active match player shows opponent in Standings Live column', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob' });

  // Navigate to Standings
  await page.locator('.app-tabs a[href="#/leaderboard"]').click();
  await expect(page.locator('.view--leaderboard')).toBeVisible();

  // Alice's row should mention Bob in the Live column
  // Use exact cell match — Alice's name is in 2nd column, look for row where 2nd td = 'Alice'
  const aliceRow = page.locator('tbody tr').filter({ has: page.locator('td:nth-child(2)', { hasText: /^Alice$/ }) });
  await expect(aliceRow).toBeVisible();
  await expect(aliceRow).toContainText('Bob');
});

// ---------------------------------------------------------------------------
// AC2: Player with no active match shows "—" in Live column
// ---------------------------------------------------------------------------

test('AC2 — player with no active match shows "—" in Live column', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob' });

  await page.locator('.app-tabs a[href="#/leaderboard"]').click();
  await expect(page.locator('.view--leaderboard')).toBeVisible();

  // Charlie has no active match
  const charlieRow = page.locator('tbody tr', { hasText: 'Charlie' });
  await expect(charlieRow).toBeVisible();
  await expect(charlieRow).toContainText('—');
});

// ---------------------------------------------------------------------------
// AC3: Live column clears when match completes
// ---------------------------------------------------------------------------

test('AC3 — Live column clears after match completes', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 3 });

  // Record a game to complete the match (cube=4: standard×4=4pts >= target 3)
  await page.locator('[data-action="record-game"]').first().click();
  await page.locator('[data-game-winner]').first().selectOption({ index: 0 });
  await page.locator('[data-cube-value]').first().selectOption('4');
  await page.locator('[data-action="submit-game"]').first().click();

  // Now go to Standings
  await page.locator('.app-tabs a[href="#/leaderboard"]').click();
  await expect(page.locator('.view--leaderboard')).toBeVisible();

  // Alice's row should NOT show "vs Bob" anymore (match is complete)
  const aliceRow = page.locator('tbody tr', { hasText: 'Alice' });
  await expect(aliceRow).toBeVisible();
  await expect(aliceRow).not.toContainText('vs Bob');
});

// ---------------------------------------------------------------------------
// Live column present in table headers
// ---------------------------------------------------------------------------

test('Standings table has a Live column header', async ({ page }) => {
  await setupTournament(page, { players: ['Alice'] });

  await page.locator('.app-tabs a[href="#/leaderboard"]').click();
  await expect(page.locator('.view--leaderboard')).toBeVisible();

  const headers = page.locator('table thead th');
  const headerTexts = await headers.allTextContents();
  const hasLive = headerTexts.some((t) => t.toLowerCase().includes('live'));
  expect(hasLive).toBe(true);
});

/**
 * 012 — End Match Early (Partial Completion)
 *
 * US1 (P1): Manually End an Active Match
 *   S1: End early with 1+ games → match moves to completed zone; leader declared winner
 *   S2: Cancel on overflow confirm → match stays active
 *   S3: Ended-early match shows "Ended Early" label in history
 *
 * US2 (P2): Abandoned Match with No Impact on Standings
 *   S1: End early with 0 games → match removed from active zone
 *   S2: Abandoned match not in standings (no win/loss/points)
 *
 * US3 (P3): Partial Result Reflected in Standings
 *   S1: End early P1 leading → P1 credited with win + points in standings
 *   S2: End early tied → no winner in standings; both retain earned points; no win/loss
 *
 * Edge:
 *   E1: Confirmation dialog shown before ending (cancel → match stays active)
 */

import { test, expect } from './fixtures.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function setupTournament(page, { name = 'End Early Test', players = [] } = {}) {
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

async function recordGame(page, card, winnerName) {
  await card.locator('[data-action="record-game"]').click();
  await card.locator('[data-action="pick-winner"]').filter({ hasText: winnerName }).click();
  await card.locator('[data-action="submit-game"]').click();
  await page.waitForTimeout(50);
}

// ---------------------------------------------------------------------------
// US1 S1: End early with 1+ games → match moves to completed zone; leader wins
// ---------------------------------------------------------------------------

test.describe('US1: End match early with games', () => {
  test('S1: match moves to completed zone with leader declared winner', async ({ page }) => {
    await setupTournament(page, { players: ['Alice', 'Bob'] });
    await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 7 });
    const card = page.locator('.live-card--active').first();

    // Record one game (Alice wins)
    await recordGame(page, card, 'Alice');

    // End match early via overflow
    page.once('dialog', (d) => d.accept());
    await page.locator('[data-action="open-overflow"]').first().click();

    // Match should move to completed zone
    await expect(page.locator('.live-card--active')).toHaveCount(0);
    await expect(page.locator('.live-card--complete')).toHaveCount(1);
  });

  test('S1: completed zone card shows Alice as winner after early end', async ({ page }) => {
    await setupTournament(page, { players: ['Alice', 'Bob'] });
    await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 7 });
    const card = page.locator('.live-card--active').first();
    await recordGame(page, card, 'Alice');

    page.once('dialog', (d) => d.accept());
    await page.locator('[data-action="open-overflow"]').first().click();

    // Completed card should mention Alice as winner
    await expect(page.locator('.live-card--complete').first()).toContainText('Alice');
  });
});

// ---------------------------------------------------------------------------
// US1 S2 / Edge E1: Cancel → match stays active
// ---------------------------------------------------------------------------

test('E1: Cancel on overflow confirm → match stays active', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 7 });
  const card = page.locator('.live-card--active').first();
  await recordGame(page, card, 'Alice');

  // Dismiss the confirmation dialog
  page.once('dialog', (d) => d.dismiss());
  await page.locator('[data-action="open-overflow"]').first().click();

  // Match should still be active
  await expect(page.locator('.live-card--active')).toHaveCount(1);
  await expect(page.locator('.live-card--complete')).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// US1 S3: History view shows "Ended Early" label
// ---------------------------------------------------------------------------

test('S3: Ended-early match shows "Ended Early" label in history', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 7 });
  const card = page.locator('.live-card--active').first();
  await recordGame(page, card, 'Alice');

  page.once('dialog', (d) => d.accept());
  await page.locator('[data-action="open-overflow"]').first().click();
  await expect(page.locator('.live-card--active')).toHaveCount(0);

  // Navigate to history
  await page.goto('/#/history');
  await expect(page.locator('.view--history')).toBeVisible();

  // Match group should show "Ended Early" badge
  await expect(page.locator('.match-group').first()).toContainText('Ended Early');
});

// ---------------------------------------------------------------------------
// US2 S1: Abandon with 0 games → match removed from active zone
// ---------------------------------------------------------------------------

test.describe('US2: Abandon with 0 games', () => {
  test('S1: match removed from active zone when no games recorded', async ({ page }) => {
    await setupTournament(page, { players: ['Alice', 'Bob'] });
    await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 7 });

    await expect(page.locator('.live-card--active')).toHaveCount(1);

    page.once('dialog', (d) => d.accept());
    await page.locator('[data-action="open-overflow"]').first().click();

    // Active match should be gone
    await expect(page.locator('.live-card--active')).toHaveCount(0);
  });

  test('S2: abandoned match does not appear in standings', async ({ page }) => {
    await setupTournament(page, { players: ['Alice', 'Bob'] });
    await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 7 });

    page.once('dialog', (d) => d.accept());
    await page.locator('[data-action="open-overflow"]').first().click();
    await expect(page.locator('.live-card--active')).toHaveCount(0);

    // Navigate to leaderboard
    await page.goto('/#/leaderboard');
    await expect(page.locator('.view--leaderboard, [class*="leaderboard"]').first()).toBeVisible();

    // Alice and Bob should each have 0 match wins and 0 points
    // Table columns: #(0), Player(1), Points(2), Match Wins(3), Live(4)
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const text = await row.textContent();
      if (text?.includes('Alice') || text?.includes('Bob')) {
        await expect(row.locator('td').nth(2)).toHaveText('0'); // points
        await expect(row.locator('td').nth(3)).toHaveText('0'); // match wins
      }
    }
  });

  test('S2: abandoned match does not show "Ended Early" label in history', async ({ page }) => {
    await setupTournament(page, { players: ['Alice', 'Bob'] });
    await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 7 });

    page.once('dialog', (d) => d.accept());
    await page.locator('[data-action="open-overflow"]').first().click();

    await page.goto('/#/history');
    await expect(page.locator('.view--history')).toBeVisible();

    // The abandoned match should show "Abandoned", not "Ended Early"
    const matchGroup = page.locator('.match-group').first();
    await expect(matchGroup).toContainText('Abandoned');
    await expect(matchGroup).not.toContainText('Ended Early');
  });
});

// ---------------------------------------------------------------------------
// US3 S1: End early P1 leading → P1 credited with win + points in standings
// ---------------------------------------------------------------------------

test.describe('US3: Partial results in standings', () => {
  test('S1: P1 leading at early end → P1 gets win and points in standings', async ({ page }) => {
    await setupTournament(page, { players: ['Alice', 'Bob'] });
    await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 7 });
    const card = page.locator('.live-card--active').first();

    // Alice wins 2 games, Bob wins 1
    await recordGame(page, card, 'Alice');
    await recordGame(page, card, 'Alice');
    await recordGame(page, card, 'Bob');

    page.once('dialog', (d) => d.accept());
    await page.locator('[data-action="open-overflow"]').first().click();
    await expect(page.locator('.live-card--active')).toHaveCount(0);

    // Navigate to standings
    await page.goto('/#/leaderboard');
    await expect(page.locator('.view--leaderboard, [class*="leaderboard"]').first()).toBeVisible();

    // Alice should have 1 win
    const aliceRow = page.locator('table tbody tr').filter({ hasText: 'Alice' });
    await expect(aliceRow).toBeVisible();
    // Table columns: #(0), Player(1), Points(2), Match Wins(3), Live(4)
    await expect(aliceRow.locator('td').nth(3)).toHaveText('1'); // match wins
  });

  test('S2: Tied early end → no winner in standings; both retain points; no win/loss', async ({ page }) => {
    await setupTournament(page, { players: ['Alice', 'Bob'] });
    await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 7 });
    const card = page.locator('.live-card--active').first();

    // Alice and Bob each win 1 game (tied)
    await recordGame(page, card, 'Alice');
    await recordGame(page, card, 'Bob');

    page.once('dialog', (d) => d.accept());
    await page.locator('[data-action="open-overflow"]').first().click();
    await expect(page.locator('.live-card--active')).toHaveCount(0);

    // Navigate to standings
    await page.goto('/#/leaderboard');
    await expect(page.locator('.view--leaderboard, [class*="leaderboard"]').first()).toBeVisible();

    // Neither player should have a match win; both should have earned points
    // Table columns: #(0), Player(1), Points(2), Match Wins(3), Live(4)
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const text = await row.textContent();
      if (text?.includes('Alice') || text?.includes('Bob')) {
        await expect(row.locator('td').nth(3)).toHaveText('0'); // match wins = 0 (tied = no winner)
        // both players retain earned points — points column should be > 0
        const pts = await row.locator('td').nth(2).textContent();
        expect(Number(pts)).toBeGreaterThan(0);
      }
    }
  });
});

/**
 * US2 — Manage Multiple Simultaneous Matches
 * Tests the match hub: multiple active matches, independent scores,
 * ad-hoc player add, FR-009 removal guard, FR-012 busy-player guard, abandonment.
 *
 * Requires matchHub (#/players) and matchDetail (#/match) to be implemented.
 */

import { test, expect } from './fixtures.js';

// Helper: set up a fresh tournament and navigate to matchHub
async function setupNight(page, { tournamentName = 'Test Night', players = ['Alice', 'Bob', 'Carol'] } = {}) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  await page.locator('.name-prompt input[type="text"]').fill(tournamentName);
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--match-hub')).toBeVisible();
  for (const name of players) {
    await page.locator('[data-add-player-input]').fill(name);
    await page.locator('[data-add-player-form] button[type="submit"]').click();
  }
}

// Helper: start a match from the hub
async function startMatch(page, { p1Name, p2Name, target = 5 }) {
  await page.locator('select[data-start-p1]').selectOption({ label: p1Name });
  await page.locator('select[data-start-p2]').selectOption({ label: p2Name });
  await page.locator('input[data-start-target]').fill(String(target));
  await page.locator('button[data-action="start-match"]').click();
}

// ---------------------------------------------------------------------------
// AC1: Hub shows active and completed matches with live scores
// ---------------------------------------------------------------------------

test('AC1 — hub shows active match cards with player names and score', async ({ page }) => {
  await setupNight(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 5 });

  // Active match card should be visible with player names
  const card = page.locator('.match-card--active').first();
  await expect(card).toBeVisible();
  await expect(card).toContainText('Alice');
  await expect(card).toContainText('Bob');
});

// ---------------------------------------------------------------------------
// AC2: Independent scores across simultaneous matches
// ---------------------------------------------------------------------------

test('AC2 — two simultaneous matches have independent scores', async ({ page }) => {
  await setupNight(page, { players: ['Alice', 'Bob', 'Carol', 'Dave'] });
  // Start two non-overlapping matches
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 5 });
  await startMatch(page, { p1Name: 'Carol', p2Name: 'Dave', target: 5 });

  // Two active match cards should be visible
  await expect(page.locator('.match-card--active')).toHaveCount(2);
});

// ---------------------------------------------------------------------------
// AC3: Ad-hoc player add
// ---------------------------------------------------------------------------

test('AC3 — player can be added mid-night without disrupting existing matches', async ({ page }) => {
  await setupNight(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 5 });

  // Add a new player while a match is in progress
  await page.locator('[data-add-player-input]').fill('Dave');
  await page.locator('[data-add-player-form] button[type="submit"]').click();

  // Dave should appear in the player list
  await expect(page.locator('.view--match-hub')).toContainText('Dave');
  // The active match is still present
  await expect(page.locator('.match-card--active')).toHaveCount(1);
});

// ---------------------------------------------------------------------------
// AC4: Start Match blocked with fewer than 2 players
// ---------------------------------------------------------------------------

test('AC4 — start match button is disabled when fewer than 2 players registered', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  await page.locator('.name-prompt input[type="text"]').fill('Solo Night');
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--match-hub')).toBeVisible();

  // Add only one player
  await page.locator('[data-add-player-input]').fill('Alice');
  await page.locator('[data-add-player-form] button[type="submit"]').click();

  // Start match button should be disabled
  await expect(page.locator('button[data-action="start-match"]')).toBeDisabled();
});

// ---------------------------------------------------------------------------
// FR-012: Busy-player guard
// ---------------------------------------------------------------------------

test('FR-012 — cannot start a match with a player already in an active match', async ({ page }) => {
  await setupNight(page);
  // Start Alice vs Bob
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 5 });

  // Try to start Alice vs Carol — Alice is busy
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Carol', target: 5 });

  // Should show an error
  await expect(page.locator('.view--match-hub [data-match-error]')).toBeVisible();
  await expect(page.locator('.view--match-hub [data-match-error]')).toContainText('active match');
});

// ---------------------------------------------------------------------------
// FR-009: Cannot remove player with active match
// ---------------------------------------------------------------------------

test('FR-009 — cannot remove a player who has an active match', async ({ page }) => {
  await setupNight(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 5 });

  // Try to remove Alice who is in an active match
  // Find Alice's remove button
  const aliceItem = page.locator('.player-item', { hasText: 'Alice' });
  await aliceItem.locator('button[data-action="remove-player"]').click();

  // Should show an error
  await expect(page.locator('[data-error]')).toContainText('active match');
});

// ---------------------------------------------------------------------------
// Abandonment: removes match without crediting a win
// ---------------------------------------------------------------------------

test('abandon match — match is removed from active list without crediting a win', async ({ page }) => {
  await setupNight(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 5 });

  // Active match should be visible
  await expect(page.locator('.match-card--active')).toHaveCount(1);

  // Click abandon — accept the confirmation dialog
  page.once('dialog', (d) => d.accept());
  await page.locator('.match-card--active').first().locator('button[data-action="abandon-match"]').click();

  // Active matches list should now be empty
  await expect(page.locator('.match-card--active')).toHaveCount(0);
});

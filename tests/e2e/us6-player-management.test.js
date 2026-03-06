/**
 * US6 — Collapsible Player Management (004-ux-redesign)
 * Tests: roster collapsed by default, + expands add-player, "N players" expands roster.
 *
 * AC1: Header shows "N players" + ＋, no roster visible on load
 * AC2: Tap ＋ → input appears, add player → input collapses, count increments
 * AC3: Tap player count → roster expands with Remove buttons
 * AC4: Tap player count again → roster collapses
 */

import { test, expect } from './fixtures.js';

async function createTournament(page, name = 'Club Night') {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  await page.locator('.name-prompt input[type="text"]').fill(name);
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--live')).toBeVisible();
}

async function addPlayer(page, name) {
  await page.locator('[data-action="toggle-add-player"]').click();
  await page.locator('#player-name-input').fill(name);
  await page.locator('#add-player-form button[type="submit"]').click();
  await page.waitForTimeout(50);
}

// ---------------------------------------------------------------------------
// AC1: Roster collapsed by default
// ---------------------------------------------------------------------------

test('AC1 — header shows player count and + button; roster hidden on load', async ({ page }) => {
  await createTournament(page);
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');

  // Header shows "2 players"
  await expect(page.locator('[data-action="toggle-roster"]')).toContainText('2 player');

  // No remove buttons visible (roster collapsed)
  await expect(page.locator('[data-action="remove-player"]')).toHaveCount(0);

  // + button is visible
  await expect(page.locator('[data-action="toggle-add-player"]')).toBeVisible();
});

// ---------------------------------------------------------------------------
// AC2: Tap + expands add-player input; adding player collapses input, increments count
// ---------------------------------------------------------------------------

test('AC2 — tapping + shows input; adding player collapses input and increments count', async ({ page }) => {
  await createTournament(page);

  // Initially 0 players
  await expect(page.locator('[data-action="toggle-roster"]')).toContainText('0 player');

  // Tap + to expand input
  await page.locator('[data-action="toggle-add-player"]').click();
  await expect(page.locator('#player-name-input')).toBeVisible();

  // Add a player
  await page.locator('#player-name-input').fill('Alice');
  await page.locator('#add-player-form button[type="submit"]').click();
  await page.waitForTimeout(100);

  // Input should be collapsed
  await expect(page.locator('#player-name-input')).not.toBeVisible();

  // Count should be 1
  await expect(page.locator('[data-action="toggle-roster"]')).toContainText('1 player');
});

// ---------------------------------------------------------------------------
// AC3: Tap player count expands roster with Remove buttons
// ---------------------------------------------------------------------------

test('AC3 — tapping player count expands roster with Remove buttons', async ({ page }) => {
  await createTournament(page);
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');

  // Tap "2 players" to expand roster
  await page.locator('[data-action="toggle-roster"]').click();

  // Remove buttons for each player should appear
  await expect(page.locator('[data-action="remove-player"]')).toHaveCount(2);
  await expect(page.locator('.live-roster')).toContainText('Alice');
  await expect(page.locator('.live-roster')).toContainText('Bob');
});

// ---------------------------------------------------------------------------
// AC4: Tap player count again collapses roster
// ---------------------------------------------------------------------------

test('AC3b — expanded roster shows each player name as text', async ({ page }) => {
  await createTournament(page);
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');

  await page.locator('[data-action="toggle-roster"]').click();
  const roster = page.locator('.live-roster');
  await expect(roster.locator('.live-roster__name').filter({ hasText: 'Alice' })).toBeVisible();
  await expect(roster.locator('.live-roster__name').filter({ hasText: 'Bob' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// AC4: Tap player count again collapses roster
// ---------------------------------------------------------------------------

test('AC4 — tapping player count again collapses the roster', async ({ page }) => {
  await createTournament(page);
  await addPlayer(page, 'Alice');

  // Expand roster
  await page.locator('[data-action="toggle-roster"]').click();
  await expect(page.locator('[data-action="remove-player"]')).toHaveCount(1);

  // Collapse roster
  await page.locator('[data-action="toggle-roster"]').click();
  await expect(page.locator('[data-action="remove-player"]')).toHaveCount(0);
});

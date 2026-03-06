/**
 * US7 — Collapsible New Match Form (004-ux-redesign)
 * Tests: + New Match toggle, inline form, disabled with <2 players.
 *
 * AC1: Tap ＋ New Match → inline form appears
 * AC2: Select players and target, submit → form collapses, new active card appears
 * AC3: + New Match button is disabled with fewer than 2 players
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
// AC1: Tap + New Match expands inline form
// ---------------------------------------------------------------------------

test('AC1 — tapping + New Match expands the inline match form', async ({ page }) => {
  await createTournament(page);
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');

  // Form should not be visible initially
  await expect(page.locator('#start-match-form')).not.toBeVisible();

  // Tap + New Match
  await page.locator('[data-action="toggle-new-match"]').click();

  // Form should expand with player selects
  await expect(page.locator('#start-match-form')).toBeVisible();
  await expect(page.locator('select[data-start-p1]')).toBeVisible();
  await expect(page.locator('select[data-start-p2]')).toBeVisible();
});

// ---------------------------------------------------------------------------
// AC2: Submit new match form → collapses, new active card appears
// ---------------------------------------------------------------------------

test('AC2 — submitting new match form creates active card and collapses form', async ({ page }) => {
  await createTournament(page);
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');

  // Expand form
  await page.locator('[data-action="toggle-new-match"]').click();
  await page.locator('select[data-start-p1]').selectOption({ label: 'Alice' });
  await page.locator('select[data-start-p2]').selectOption({ label: 'Bob' });
  await page.locator('input[data-start-target]').fill('7');
  await page.locator('#start-match-form button[type="submit"]').click();
  await page.waitForTimeout(100);

  // Form should be collapsed
  await expect(page.locator('#start-match-form')).not.toBeVisible();

  // New active match card should appear
  await expect(page.locator('.live-card--active')).toHaveCount(1);
  await expect(page.locator('.live-card--active')).toContainText('Alice');
  await expect(page.locator('.live-card--active')).toContainText('Bob');
});

// ---------------------------------------------------------------------------
// AC3: Button disabled with fewer than 2 players
// ---------------------------------------------------------------------------

test('AC3 — + New Match button is disabled with fewer than 2 players', async ({ page }) => {
  await createTournament(page);
  await addPlayer(page, 'Alice');

  await expect(page.locator('[data-action="toggle-new-match"]')).toBeDisabled();
});

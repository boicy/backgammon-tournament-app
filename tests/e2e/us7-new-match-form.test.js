/**
 * US7 — New Match Form: Tap-to-Select Players + Target Grid
 * AC1: + New Match → player pick grid with "Pick Player 1" prompt
 * AC2: Pick two players → confirmation row → target grid (10 buttons, 7 pre-selected)
 * AC3: Tap a target → it becomes selected, default deselects; Start → active card
 * AC4: + New Match disabled with fewer than 2 players
 * AC5: Reopening form resets target to default 7
 */
import { test, expect } from './fixtures.js';

const TARGET_PRESETS = [3, 5, 7, 9, 11, 13, 15, 17, 19, 21];

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

async function pickPlayers(page, p1Name, p2Name) {
  await page.locator('[data-action="toggle-new-match"]').click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: p1Name }).click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: p2Name }).click();
}

test('AC1 — tapping + New Match shows player pick grid', async ({ page }) => {
  await createTournament(page);
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');

  await expect(page.locator('.pick-grid')).not.toBeVisible();
  await page.locator('[data-action="toggle-new-match"]').click();

  await expect(page.locator('.pick-grid')).toBeVisible();
  await expect(page.locator('.pick-prompt')).toContainText('Pick Player 1');
  await expect(page.locator('[data-action="pick-player"]')).toHaveCount(2);

  // Pick Alice — her button should become disabled (can't pick same player twice)
  await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
  await expect(page.locator('.pick-prompt')).toContainText('Pick Player 2');
  await expect(page.locator('[data-player-id]').filter({ hasText: 'Alice' })).toBeDisabled();
});

test('AC2 — confirmation step shows target grid with 7 pre-selected', async ({ page }) => {
  await createTournament(page);
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');

  await pickPlayers(page, 'Alice', 'Bob');

  // Confirm step visible with player pills
  await expect(page.locator('.pick-confirm')).toBeVisible();
  await expect(page.locator('.pick-confirm')).toContainText('Alice');
  await expect(page.locator('.pick-confirm')).toContainText('Bob');

  // Target grid: 10 buttons, no number input
  const targetButtons = page.locator('[data-action="pick-target"]');
  await expect(targetButtons).toHaveCount(10);
  await expect(page.locator('input[data-start-target]')).toHaveCount(0);

  // Verify all preset values are present
  for (const v of TARGET_PRESETS) {
    await expect(targetButtons.filter({ hasText: new RegExp(`^${v}$`) })).toHaveCount(1);
  }

  // Default: 7 is pre-selected
  await expect(targetButtons.filter({ hasText: /^7$/ })).toHaveClass(/pick-btn--selected/);
  await expect(targetButtons.filter({ hasText: /^11$/ })).not.toHaveClass(/pick-btn--selected/);
});

test('AC3 — tapping a target selects it and Start uses that target', async ({ page }) => {
  await createTournament(page);
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');

  await pickPlayers(page, 'Alice', 'Bob');

  // Tap 11
  await page.locator('[data-action="pick-target"]').filter({ hasText: /^11$/ }).click();
  await expect(page.locator('[data-action="pick-target"]').filter({ hasText: /^11$/ })).toHaveClass(/pick-btn--selected/);
  await expect(page.locator('[data-action="pick-target"]').filter({ hasText: /^7$/ })).not.toHaveClass(/pick-btn--selected/);

  // Start → active card visible; form collapsed
  await page.locator('#start-match-form button[type="submit"]').click();
  await page.waitForTimeout(100);

  await expect(page.locator('#start-match-form')).not.toBeVisible();
  await expect(page.locator('.live-card--active')).toHaveCount(1);
  await expect(page.locator('.live-card--active')).toContainText('Alice');
  await expect(page.locator('.live-card--active')).toContainText('Bob');
});

test('AC4 — + New Match button is disabled with fewer than 2 players', async ({ page }) => {
  await createTournament(page);
  await addPlayer(page, 'Alice');
  await expect(page.locator('[data-action="toggle-new-match"]')).toBeDisabled();
});

test('AC5 — reopening form resets target selection to 7', async ({ page }) => {
  await createTournament(page);
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');

  // First open: pick players, pick target 13
  await pickPlayers(page, 'Alice', 'Bob');
  await page.locator('[data-action="pick-target"]').filter({ hasText: /^13$/ }).click();
  await expect(page.locator('[data-action="pick-target"]').filter({ hasText: /^13$/ })).toHaveClass(/pick-btn--selected/);

  // Close the form
  await page.locator('[data-action="toggle-new-match"]').click();
  await expect(page.locator('.live-new-match--expanded')).not.toBeVisible();

  // Reopen → pick players again → 7 should be pre-selected (not 13)
  await pickPlayers(page, 'Alice', 'Bob');
  await expect(page.locator('[data-action="pick-target"]').filter({ hasText: /^7$/ })).toHaveClass(/pick-btn--selected/);
  await expect(page.locator('[data-action="pick-target"]').filter({ hasText: /^13$/ })).not.toHaveClass(/pick-btn--selected/);
});

test('AC6 — tapping selected pill deselects and returns to previous step', async ({ page }) => {
  await createTournament(page);
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');
  await addPlayer(page, 'Carol');

  await page.locator('[data-action="toggle-new-match"]').click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: 'Bob' }).click();
  await expect(page.locator('.pick-confirm')).toBeVisible();

  // Deselect Bob (P2 pill) → back to Pick Player 2
  await page.locator('[data-action="deselect-player"]').filter({ hasText: 'Bob' }).click();
  await expect(page.locator('.pick-prompt')).toContainText('Pick Player 2');
  await expect(page.locator('.pick-confirm')).not.toBeVisible();

  // Pick Carol as P2 → confirm step with Alice vs Carol
  await page.locator('[data-action="pick-player"]').filter({ hasText: 'Carol' }).click();
  await expect(page.locator('.pick-confirm')).toBeVisible();

  // Deselect Alice (P1 pill at confirm) → Carol becomes P1, back to Pick Player 2
  await page.locator('[data-action="deselect-player"]').filter({ hasText: 'Alice' }).click();
  await expect(page.locator('.pick-prompt')).toContainText('Pick Player 2');
  await expect(page.locator('[data-player-id]').filter({ hasText: 'Carol' })).toBeDisabled();
});

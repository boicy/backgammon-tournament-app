/**
 * US7 — New Match Form: Tap-to-Select Players
 * AC1: + New Match → player pick grid with "Pick Player 1:" prompt
 * AC2: Pick two players → confirmation row → Start → active card
 * AC3: + New Match disabled with fewer than 2 players
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

test('AC2 — picking two players and submitting creates active card', async ({ page }) => {
  await createTournament(page);
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');

  await page.locator('[data-action="toggle-new-match"]').click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
  await expect(page.locator('.pick-prompt')).toContainText('Pick Player 2');

  await page.locator('[data-action="pick-player"]').filter({ hasText: 'Bob' }).click();
  await expect(page.locator('.pick-confirm')).toBeVisible();
  await expect(page.locator('.pick-confirm')).toContainText('Alice');
  await expect(page.locator('.pick-confirm')).toContainText('Bob');

  await page.locator('#start-match-form button[type="submit"]').click();
  await page.waitForTimeout(100);

  await expect(page.locator('#start-match-form')).not.toBeVisible();
  await expect(page.locator('.live-card--active')).toHaveCount(1);
  await expect(page.locator('.live-card--active')).toContainText('Alice');
  await expect(page.locator('.live-card--active')).toContainText('Bob');
});

test('AC3 — + New Match button is disabled with fewer than 2 players', async ({ page }) => {
  await createTournament(page);
  await addPlayer(page, 'Alice');
  await expect(page.locator('[data-action="toggle-new-match"]')).toBeDisabled();
});

test('AC4 — tapping selected pill deselects and returns to previous step', async ({ page }) => {
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
  // At step 2: Carol is now P1, her button is selected and disabled in the grid
  await expect(page.locator('[data-player-id]').filter({ hasText: 'Carol' })).toBeDisabled();
});

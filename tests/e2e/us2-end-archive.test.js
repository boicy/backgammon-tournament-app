import { test, expect } from '@playwright/test';

// Helpers
async function startTournament(page, name) {
  await expect(page.locator('.name-prompt')).toBeVisible();
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

async function recordGame(page, winnerName, loserName) {
  // Expand the new-match form if not already visible
  const expanded = await page.locator('.live-new-match--expanded').isVisible().catch(() => false);
  if (!expanded) await page.locator('[data-action="toggle-new-match"]').click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: winnerName }).click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: loserName }).click();
  await page.locator('#start-match-form button[type="submit"]').click();
  await page.waitForTimeout(50);
  // Record one game inline on the active card
  const card = page.locator('.live-card--active').first();
  await card.locator('[data-action="record-game"]').click();
  await card.locator('[data-action="pick-winner"]').filter({ hasText: winnerName }).click();
  await card.locator('[data-action="submit-game"]').click();
  await page.waitForTimeout(50);
}

async function setupTournamentWithGame(page, tournamentName = 'Test Night') {
  await startTournament(page, tournamentName);
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');
  await recordGame(page, 'Alice', 'Bob');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
});

test('AC1 — End Tournament with 2 players + 1 game shows confirm, archives, navigates to name prompt', async ({ page }) => {
  await setupTournamentWithGame(page);

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#hamburger-btn').click();
  await page.locator('[data-action="end-tournament"]').click();

  await expect(page.locator('.name-prompt')).toBeVisible();

  // Verify archive has 1 entry in Club tab
  await page.goto('/#/club');
  await expect(page.locator('.archive-item')).toHaveCount(1);
  await expect(page.locator('.archive-item').first()).toContainText('Test Night');
});

test('AC2 — starting new tournament with active players+games auto-archives before prompting', async ({ page }) => {
  await setupTournamentWithGame(page, 'First Night');

  // Navigate to name prompt (router allows /start without guard)
  await page.goto('/#/start');
  await expect(page.locator('.name-prompt')).toBeVisible();
  await page.locator('.name-prompt input[type="text"]').fill('Second Night');
  await page.locator('.name-prompt button[type="submit"]').click();

  await expect(page.locator('.view--live')).toBeVisible();
  await expect(page.locator('.tournament-name')).toContainText('Second Night');

  // Verify First Night was auto-archived
  await page.goto('/#/club');
  await expect(page.locator('.archive-item')).toHaveCount(1);
  await expect(page.locator('.archive-item').first()).toContainText('First Night');
});

test('AC3 — archived tournament visible in Club tab after page refresh', async ({ page }) => {
  await setupTournamentWithGame(page, 'Test Night');

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#hamburger-btn').click();
  await page.locator('[data-action="end-tournament"]').click();
  await expect(page.locator('.name-prompt')).toBeVisible();

  // Start new tournament then reload
  await page.locator('.name-prompt input[type="text"]').fill('New Night');
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--live')).toBeVisible();

  await page.reload();
  await expect(page.locator('.view--live')).toBeVisible();
  await page.goto('/#/club');
  await expect(page.locator('.archive-item')).toHaveCount(1);
  await expect(page.locator('.archive-item').first()).toContainText('Test Night');
});

test('AC4 — End Tournament with no players discards without archiving', async ({ page }) => {
  await startTournament(page, 'Empty Tournament');

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#hamburger-btn').click();
  await page.locator('[data-action="end-tournament"]').click();

  await expect(page.locator('.name-prompt')).toBeVisible();

  // Start new tournament and check club shows no archive
  await page.locator('.name-prompt input[type="text"]').fill('Next Night');
  await page.locator('.name-prompt button[type="submit"]').click();
  await page.goto('/#/club');
  await expect(page.locator('.archive-item')).toHaveCount(0);
});

test('Reset Tournament discards without archiving (FR-003 regression)', async ({ page }) => {
  await setupTournamentWithGame(page);

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#hamburger-btn').click();
  await page.locator('[data-action="reset-tournament"]').click();

  await expect(page.locator('.name-prompt')).toBeVisible();

  await page.locator('.name-prompt input[type="text"]').fill('Next Night');
  await page.locator('.name-prompt button[type="submit"]').click();
  await page.goto('/#/club');
  await expect(page.locator('.archive-item')).toHaveCount(0);
});

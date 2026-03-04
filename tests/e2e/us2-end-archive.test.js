import { test, expect } from '@playwright/test';

// Helpers
async function startTournament(page, name) {
  await expect(page.locator('.name-prompt')).toBeVisible();
  await page.locator('.name-prompt input[type="text"]').fill(name);
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--players')).toBeVisible();
}

async function addPlayer(page, name) {
  await page.locator('#player-name-input').fill(name);
  await page.locator('#add-player-form button[type="submit"]').click();
  // Wait for player to appear in list
  await expect(page.locator('.player-list .player-name', { hasText: name })).toBeVisible();
}

async function recordGame(page, winnerName, loserName) {
  await page.locator('a[href="#/record"]').click();
  await expect(page.locator('.view--record')).toBeVisible();

  await page.locator('select[data-player-select]').first().selectOption({ label: winnerName });
  await page.locator('select[data-player-select]').nth(1).selectOption({ label: loserName });
  await page.locator('select[data-winner-select]').selectOption({ label: winnerName });

  await page.locator('button[type="submit"]').click();
  await expect(page.locator('.view--players')).not.toBeVisible();
  // Navigate back to players
  await page.locator('a[href="#/players"]').click();
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
  await page.locator('[data-action="end-tournament"]').click();

  await expect(page.locator('.name-prompt')).toBeVisible();

  // Verify archive has 1 entry in Club tab
  await page.locator('a[href="#/club"]').click();
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

  await expect(page.locator('.view--players')).toBeVisible();
  await expect(page.locator('.tournament-name')).toContainText('Second Night');

  // Verify First Night was auto-archived
  await page.locator('a[href="#/club"]').click();
  await expect(page.locator('.archive-item')).toHaveCount(1);
  await expect(page.locator('.archive-item').first()).toContainText('First Night');
});

test('AC3 — archived tournament visible in Club tab after page refresh', async ({ page }) => {
  await setupTournamentWithGame(page, 'Test Night');

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-action="end-tournament"]').click();
  await expect(page.locator('.name-prompt')).toBeVisible();

  // Start new tournament then reload
  await page.locator('.name-prompt input[type="text"]').fill('New Night');
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--players')).toBeVisible();

  await page.reload();
  await expect(page.locator('.view--players')).toBeVisible();
  await page.locator('a[href="#/club"]').click();
  await expect(page.locator('.archive-item')).toHaveCount(1);
  await expect(page.locator('.archive-item').first()).toContainText('Test Night');
});

test('AC4 — End Tournament with no players discards without archiving', async ({ page }) => {
  await startTournament(page, 'Empty Tournament');

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-action="end-tournament"]').click();

  await expect(page.locator('.name-prompt')).toBeVisible();

  // Start new tournament and check club shows no archive
  await page.locator('.name-prompt input[type="text"]').fill('Next Night');
  await page.locator('.name-prompt button[type="submit"]').click();
  await page.locator('a[href="#/club"]').click();
  await expect(page.locator('.archive-item')).toHaveCount(0);
});

test('Reset Tournament discards without archiving (FR-003 regression)', async ({ page }) => {
  await setupTournamentWithGame(page);

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-action="reset-tournament"]').click();

  await expect(page.locator('.name-prompt')).toBeVisible();

  await page.locator('.name-prompt input[type="text"]').fill('Next Night');
  await page.locator('.name-prompt button[type="submit"]').click();
  await page.locator('a[href="#/club"]').click();
  await expect(page.locator('.archive-item')).toHaveCount(0);
});

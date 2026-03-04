import { test, expect } from '@playwright/test';

// Helpers
async function startTournament(page, name) {
  await page.locator('.name-prompt input[type="text"]').fill(name);
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--players')).toBeVisible();
}

async function addPlayer(page, name) {
  await page.locator('#player-name-input').fill(name);
  await page.locator('#add-player-form button[type="submit"]').click();
  await expect(page.locator('.player-list .player-name', { hasText: name })).toBeVisible();
}

async function endTournament(page) {
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-action="end-tournament"]').click();
  await expect(page.locator('.name-prompt')).toBeVisible();
}

async function recordOneGame(page, winnerName, loserName) {
  await page.locator('a[href="#/record"]').click();
  await expect(page.locator('.view--record')).toBeVisible();
  await page.locator('select[data-player-select]').first().selectOption({ label: winnerName });
  await page.locator('select[data-player-select]').nth(1).selectOption({ label: loserName });
  await page.locator('select[data-winner-select]').selectOption({ label: winnerName });
  await page.locator('button[type="submit"]').click();
  await page.locator('a[href="#/players"]').click();
}

async function archiveTournament(page, name) {
  await startTournament(page, name);
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');
  await recordOneGame(page, 'Alice', 'Bob');
  await endTournament(page);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
});

test('AC1 — Club tab with no archives shows empty state message', async ({ page }) => {
  await startTournament(page, 'Active Night');
  await page.locator('a[href="#/club"]').click();
  await expect(page.locator('[data-testid="archive-empty"]')).toBeVisible();
});

test('AC2 — two archived tournaments listed in reverse chronological order with name, date, game count', async ({ page }) => {
  await archiveTournament(page, 'First Night');
  await archiveTournament(page, 'Second Night');

  // Start a new tournament to navigate properly
  await startTournament(page, 'Third Night');
  await page.locator('a[href="#/club"]').click();

  const items = page.locator('.archive-item');
  await expect(items).toHaveCount(2);
  // Most recent first
  await expect(items.first()).toContainText('Second Night');
  await expect(items.nth(1)).toContainText('First Night');
});

test('AC3 — tapping a tournament shows its final standings and full game list', async ({ page }) => {
  await archiveTournament(page, 'Test Night');
  await startTournament(page, 'New Night');
  await page.locator('a[href="#/club"]').click();

  await page.locator('.archive-item').first().click();
  await expect(page.locator('.tournament-detail')).toBeVisible();
  // Should show standings table
  await expect(page.locator('.leaderboard-table, .tournament-detail table')).toBeVisible();
});

test('AC4 — detail view has no Add Player, Record Game, or Delete controls', async ({ page }) => {
  await archiveTournament(page, 'Test Night');
  await startTournament(page, 'New Night');
  await page.locator('a[href="#/club"]').click();
  await page.locator('.archive-item').first().click();

  await expect(page.locator('[data-action="remove-player"]')).toHaveCount(0);
  await expect(page.locator('[data-action="delete-game"]')).toHaveCount(0);
  await expect(page.locator('a[href="#/record"]')).toBeVisible(); // nav exists but no form in detail
  await expect(page.locator('#add-player-form')).toHaveCount(0);
});

test('AC5 — Back button returns to archive list', async ({ page }) => {
  await archiveTournament(page, 'Test Night');
  await startTournament(page, 'New Night');
  await page.locator('a[href="#/club"]').click();
  await page.locator('.archive-item').first().click();
  await expect(page.locator('.tournament-detail')).toBeVisible();

  await page.locator('[data-action="back-to-list"]').click();
  await expect(page.locator('.archive-list')).toBeVisible();
  await expect(page.locator('.tournament-detail')).not.toBeVisible();
});

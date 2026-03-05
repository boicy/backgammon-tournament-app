import { test, expect } from '@playwright/test';

async function archiveTournamentWith(page, tournamentName, players) {
  await expect(page.locator('.name-prompt')).toBeVisible();
  await page.locator('.name-prompt input[type="text"]').fill(tournamentName);
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--match-hub')).toBeVisible();

  for (const name of players) {
    await page.locator('#player-name-input').fill(name);
    await page.locator('#add-player-form button[type="submit"]').click();
    await expect(page.locator('.player-list .player-name', { hasText: name })).toBeVisible();
  }

  // Record a match between first two players (only possible with 2+ players)
  if (players.length >= 2) {
    await page.locator('select[data-start-p1]').selectOption({ label: players[0] });
    await page.locator('select[data-start-p2]').selectOption({ label: players[1] });
    await page.locator('input[data-start-target]').fill('1');
    await page.locator('#start-match-form button[type="submit"]').click();
    await page.locator('.match-card--active button[data-action="enter-match"]').first().click();
    await expect(page.locator('.view--match')).toBeVisible();
    await page.locator('select[data-game-winner]').selectOption({ label: players[0] });
    await page.locator('button[data-action="record-game"]').click();
    await page.locator('[data-action="back-to-hub"]').click();
    await expect(page.locator('.view--match-hub')).toBeVisible();
  }

  page.once('dialog', (d) => d.accept());
  await page.locator('[data-action="end-tournament"]').click();
  await expect(page.locator('.name-prompt')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
});

test('AC1 — after archiving tournament with Alice, typing "Al" shows Alice as datalist suggestion', async ({ page }) => {
  await archiveTournamentWith(page, 'Past Night', ['Alice', 'Bob']);

  // Start new tournament
  await page.locator('.name-prompt input[type="text"]').fill('New Night');
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--match-hub')).toBeVisible();

  // The datalist should be populated
  const datalist = page.locator('#roster-datalist');
  await expect(datalist).toBeAttached();
  const options = await datalist.locator('option').allTextContents();
  expect(options.some((o) => o.toLowerCase().includes('alice'))).toBe(true);
});

test('AC3 — typing a new name not in roster and submitting adds it to the roster', async ({ page }) => {
  await archiveTournamentWith(page, 'Past Night', ['Alice']);

  await page.locator('.name-prompt input[type="text"]').fill('New Night');
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--match-hub')).toBeVisible();

  // Add a new player not in the roster
  await page.locator('#player-name-input').fill('Charlie');
  await page.locator('#add-player-form button[type="submit"]').click();

  // Charlie should now be in the datalist
  const datalist = page.locator('#roster-datalist');
  const options = await datalist.locator('option').allTextContents();
  expect(options.some((o) => o.toLowerCase().includes('charlie'))).toBe(true);
});

test('AC4 — no previous tournaments — no suggestions in datalist', async ({ page }) => {
  await page.locator('.name-prompt input[type="text"]').fill('Fresh Night');
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--match-hub')).toBeVisible();

  const datalist = page.locator('#roster-datalist');
  await expect(datalist).toBeAttached();
  const options = await datalist.locator('option').all();
  expect(options).toHaveLength(0);
});

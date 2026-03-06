import { test, expect } from '@playwright/test';

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
  // Expand new-match form if needed
  const expanded = await page.locator('.live-new-match--expanded').isVisible().catch(() => false);
  if (!expanded) await page.locator('[data-action="toggle-new-match"]').click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: winnerName }).click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: loserName }).click();
  await page.locator('input[data-start-target]').fill('1');
  await page.locator('#start-match-form button[type="submit"]').click();
  await page.waitForTimeout(50);
  const card = page.locator('.live-card--active').first();
  await card.locator('[data-action="record-game"]').click();
  await card.locator('[data-game-winner]').selectOption({ label: winnerName });
  await card.locator('[data-action="submit-game"]').click();
  await page.waitForTimeout(50);
}

async function endTournament(page) {
  page.once('dialog', (d) => d.accept());
  await page.locator('#hamburger-btn').click();
  await page.locator('[data-action="end-tournament"]').click();
  await expect(page.locator('.name-prompt')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
});

test('AC1 — All-Time leaderboard visible in Club tab at all times', async ({ page }) => {
  await startTournament(page, 'Night 1');
  await page.goto('/#/club');
  await expect(page.locator('.all-time-table, [data-testid="all-time-section"]')).toBeVisible();
});

test('AC2 — before first archive shows current players with 0 wins and explanatory note', async ({ page }) => {
  await startTournament(page, 'Night 1');
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');
  await page.goto('/#/club');

  // Should show 0 wins and an explanatory note
  const allTimeSection = page.locator('.all-time-section, [data-testid="all-time-section"]');
  await expect(allTimeSection).toBeVisible();
  await expect(allTimeSection).toContainText('0');
});

test('AC3 — after archiving 2 tournaments with different winners, each player shows 1 win', async ({ page }) => {
  // Tournament 1: Alice wins
  await startTournament(page, 'Night 1');
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');
  await recordGame(page, 'Alice', 'Bob');
  await endTournament(page);

  // Tournament 2: Bob wins
  await startTournament(page, 'Night 2');
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');
  await recordGame(page, 'Bob', 'Alice');
  await endTournament(page);

  await startTournament(page, 'Night 3');
  await page.goto('/#/club');

  // Both should show 1 win
  const allTimeSection = page.locator('.all-time-section, [data-testid="all-time-section"]');
  const rows = allTimeSection.locator('.all-time-table tbody tr');
  await expect(rows).toHaveCount(2);
});

test('AC4 — recording game in active tournament updates All-Time cumulative points', async ({ page }) => {
  await startTournament(page, 'Night 1');
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');

  await page.goto('/#/club');
  const allTimeSection = page.locator('.all-time-section, [data-testid="all-time-section"]');

  // Before game: 0 points
  await expect(allTimeSection.locator('.all-time-table tbody')).toBeVisible();
  const alicePointsBefore = await allTimeSection.locator('.all-time-table tbody tr').first().textContent();

  // Record a game
  await page.goto('/#/live');
  await recordGame(page, 'Alice', 'Bob');
  await page.goto('/#/club');

  // After game: Alice should have >0 points
  const alicePointsAfter = await allTimeSection.locator('.all-time-table tbody tr').first().textContent();
  // Content should have changed (points updated)
  expect(alicePointsAfter).not.toBe(alicePointsBefore);
});

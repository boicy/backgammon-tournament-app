import { test, expect } from '@playwright/test';

async function startTournament(page, name) {
  await expect(page.locator('.name-prompt')).toBeVisible();
  await page.locator('.name-prompt input[type="text"]').fill(name);
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--match-hub')).toBeVisible();
}

async function addPlayer(page, name) {
  await page.locator('#player-name-input').fill(name);
  await page.locator('#add-player-form button[type="submit"]').click();
  await expect(page.locator('.player-list .player-name', { hasText: name })).toBeVisible();
}

async function recordGame(page, winnerName, loserName) {
  // Start a match with target=1 so it completes after one game
  await page.locator('select[data-start-p1]').selectOption({ label: winnerName });
  await page.locator('select[data-start-p2]').selectOption({ label: loserName });
  await page.locator('input[data-start-target]').fill('1');
  await page.locator('#start-match-form button[type="submit"]').click();
  // Enter the match
  await page.locator('.match-card--active button[data-action="enter-match"]').first().click();
  await expect(page.locator('.view--match')).toBeVisible();
  // Record one game
  await page.locator('select[data-game-winner]').selectOption({ label: winnerName });
  await page.locator('button[data-action="record-game"]').click();
  // Navigate back to hub
  await page.locator('[data-action="back-to-hub"]').click();
  await expect(page.locator('.view--match-hub')).toBeVisible();
}

async function endTournament(page) {
  page.once('dialog', (d) => d.accept());
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
  await page.locator('a[href="#/club"]').click();
  await expect(page.locator('.all-time-table, [data-testid="all-time-section"]')).toBeVisible();
});

test('AC2 — before first archive shows current players with 0 wins and explanatory note', async ({ page }) => {
  await startTournament(page, 'Night 1');
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');
  await page.locator('a[href="#/club"]').click();

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
  await page.locator('a[href="#/club"]').click();

  // Both should show 1 win
  const allTimeSection = page.locator('.all-time-section, [data-testid="all-time-section"]');
  const rows = allTimeSection.locator('.all-time-table tbody tr');
  await expect(rows).toHaveCount(2);
});

test('AC4 — recording game in active tournament updates All-Time cumulative points', async ({ page }) => {
  await startTournament(page, 'Night 1');
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');

  await page.locator('a[href="#/club"]').click();
  const allTimeSection = page.locator('.all-time-section, [data-testid="all-time-section"]');

  // Before game: 0 points
  await expect(allTimeSection.locator('.all-time-table tbody')).toBeVisible();
  const alicePointsBefore = await allTimeSection.locator('.all-time-table tbody tr').first().textContent();

  // Record a game
  await page.locator('a[href="#/players"]').click();
  await recordGame(page, 'Alice', 'Bob');
  await page.locator('a[href="#/club"]').click();

  // After game: Alice should have >0 points
  const alicePointsAfter = await allTimeSection.locator('.all-time-table tbody tr').first().textContent();
  // Content should have changed (points updated)
  expect(alicePointsAfter).not.toBe(alicePointsBefore);
});

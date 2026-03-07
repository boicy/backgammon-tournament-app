import { test, expect } from '@playwright/test';

// US1 — Name and Start a Tournament
// All tests clear localStorage first to simulate a fresh app state.

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
});

test('SC1 — fresh app with no localStorage shows name prompt, not player list', async ({ page }) => {
  await expect(page.locator('.name-prompt')).toBeVisible();
  await expect(page.locator('.view--live')).not.toBeVisible();
});

test('SC2 — clicking Start Tournament navigates directly to live view (no validation step)', async ({ page }) => {
  await page.locator('#start-tournament-btn').click();
  await expect(page.locator('.view--live')).toBeVisible();
  await expect(page.locator('.name-prompt')).not.toBeVisible();
});

test('SC3 — auto-generated name is visible in live view after starting tournament', async ({ page }) => {
  await page.locator('#start-tournament-btn').click();
  await expect(page.locator('.view--live')).toBeVisible();
  await expect(page.locator('.tournament-name')).toBeVisible();
});

test('SC4 — refreshing after starting preserves the auto-generated tournament name', async ({ page }) => {
  await page.locator('#start-tournament-btn').click();
  await expect(page.locator('.view--live')).toBeVisible();
  const nameBefore = (await page.locator('.tournament-name').textContent()).trim();

  await page.reload();
  await expect(page.locator('.tournament-name')).toHaveText(new RegExp(nameBefore.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

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

test('SC2 — submitting empty name shows validation error and stays on prompt', async ({ page }) => {
  const submitBtn = page.locator('.name-prompt button[type="submit"]');
  await submitBtn.click();
  await expect(page.locator('.name-prompt [data-error]')).toBeVisible();
  await expect(page.locator('.name-prompt')).toBeVisible();
});

test('SC3 — entering valid name navigates to Match Hub with name visible', async ({ page }) => {
  await page.locator('.name-prompt input[type="text"]').fill('April Club Night');
  await page.locator('.name-prompt button[type="submit"]').click();

  await expect(page.locator('.view--live')).toBeVisible();
  await expect(page.locator('.tournament-name')).toContainText('April Club Night');
});

test('SC4 — refreshing after naming preserves tournament name', async ({ page }) => {
  await page.locator('.name-prompt input[type="text"]').fill('Persistent Tournament');
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--live')).toBeVisible();

  await page.reload();
  await expect(page.locator('.tournament-name')).toContainText('Persistent Tournament');
});

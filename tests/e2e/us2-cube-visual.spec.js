/**
 * 013-cube-lozenges — US2: Visual Language Consistency
 *
 * Scenario: On a 375px-wide viewport (iPhone SE), open the game recording form
 * and verify all 7 cube value buttons are visible and tappable without horizontal scroll.
 */

import { test, expect } from './fixtures.js';

test.use({ viewport: { width: 375, height: 812 } });

async function setupAndOpenForm(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  await page.locator('.name-prompt input[type="text"]').fill('Cube Visual Test');
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--live')).toBeVisible();

  for (const name of ['Alice', 'Bob']) {
    await page.locator('[data-action="toggle-add-player"]').click();
    await page.locator('#player-name-input').fill(name);
    await page.locator('#add-player-form button[type="submit"]').click();
    await page.waitForTimeout(50);
  }

  await page.locator('[data-action="toggle-new-match"]').click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: 'Bob' }).click();
  await page.locator('[data-action="pick-target"][data-target-value="7"]').click();
  await page.locator('#start-match-form button[type="submit"]').click();
  await page.waitForTimeout(50);

  await page.locator('.live-card--active').first().locator('[data-action="record-game"]').click();
  await page.waitForTimeout(50);
}

test('US2: all 7 cube buttons visible and no horizontal scroll at 375px viewport', async ({ page }) => {
  await setupAndOpenForm(page);

  const cubeButtons = page.locator('[data-action="pick-cube-value"]');
  await expect(cubeButtons).toHaveCount(7);

  // All buttons must be visible (not clipped off-screen)
  for (let i = 0; i < 7; i++) {
    await expect(cubeButtons.nth(i)).toBeVisible();
  }

  // No horizontal overflow on the cube-pick-grid container
  const noHorizontalScroll = await page.evaluate(() => {
    const grid = document.querySelector('.cube-pick-grid');
    if (!grid) return false;
    return grid.scrollWidth <= grid.clientWidth + 1; // +1 for rounding
  });
  expect(noHorizontalScroll).toBe(true);
});

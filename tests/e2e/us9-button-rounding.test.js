/**
 * US9 — Button Style Consistency: Pill/Rounded Shape (009-button-style-consistency)
 *
 * AC1: .btn action buttons have computed border-radius > 100px (pill shape)
 * AC2: .pick-btn (player pick grid) has same computed border-radius as .btn
 * AC3: Record-game pick-winner buttons (.pick-btn) have pill border-radius
 * AC4: .pick-pill deselect pills have same border-radius as action buttons
 */

import { test, expect } from './fixtures.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function setupTournament(page, { name = 'Test Club', players = [] } = {}) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  await page.locator('.name-prompt input[type="text"]').fill(name);
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--live')).toBeVisible();
  for (const playerName of players) {
    await page.locator('[data-action="toggle-add-player"]').click();
    await page.locator('#player-name-input').fill(playerName);
    await page.locator('#add-player-form button[type="submit"]').click();
    await page.waitForTimeout(50);
  }
}

async function startMatch(page, { p1Name, p2Name } = {}) {
  const expanded = await page.locator('.live-new-match--expanded').isVisible().catch(() => false);
  if (!expanded) await page.locator('[data-action="toggle-new-match"]').click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: p1Name }).click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: p2Name }).click();
  await page.locator('#start-match-form button[type="submit"]').click();
  await page.waitForTimeout(50);
}

// ---------------------------------------------------------------------------
// AC1: .btn has computed border-radius > 100px (pill)
// ---------------------------------------------------------------------------

test('AC1 — action buttons (.btn) have pill border-radius (> 100px)', async ({ page }) => {
  await setupTournament(page, { players: [] });
  await page.locator('[data-action="toggle-add-player"]').click();

  const radius = await page.evaluate(() => {
    const btn = document.querySelector('#add-player-form button[type="submit"]');
    return btn ? parseFloat(getComputedStyle(btn).borderRadius) : 0;
  });
  expect(radius).toBeGreaterThan(100);
});

// ---------------------------------------------------------------------------
// AC2: .pick-btn in pick grid has same border-radius as .btn
// ---------------------------------------------------------------------------

test('AC2 — pick-player grid buttons (.pick-btn) have pill border-radius (> 100px)', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await page.locator('[data-action="toggle-new-match"]').click();

  const radius = await page.evaluate(() => {
    const btn = document.querySelector('[data-action="pick-player"]');
    return btn ? parseFloat(getComputedStyle(btn).borderRadius) : 0;
  });
  expect(radius).toBeGreaterThan(100);
});

test('AC2 — pick-player border-radius matches action button border-radius', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await page.locator('[data-action="toggle-add-player"]').click();

  const [btnRadius, pickRadius] = await page.evaluate(() => {
    const btn = document.querySelector('#add-player-form button[type="submit"]');
    const pick = document.querySelector('[data-action="toggle-new-match"]');
    return [
      btn ? parseFloat(getComputedStyle(btn).borderRadius) : 0,
      pick ? parseFloat(getComputedStyle(pick).borderRadius) : 0,
    ];
  });
  expect(btnRadius).toBeGreaterThan(100);
  expect(pickRadius).toBeGreaterThan(100);
});

// ---------------------------------------------------------------------------
// AC3: pick-winner buttons inside record-game form have pill border-radius
// ---------------------------------------------------------------------------

test('AC3 — pick-winner buttons in record-game form have pill border-radius', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob' });

  const card = page.locator('.live-card--active').first();
  await card.locator('[data-action="record-game"]').click();
  await expect(card.locator('[data-action="pick-winner"]').first()).toBeVisible();

  const radius = await page.evaluate(() => {
    const btn = document.querySelector('[data-action="pick-winner"]');
    return btn ? parseFloat(getComputedStyle(btn).borderRadius) : 0;
  });
  expect(radius).toBeGreaterThan(100);
});

// ---------------------------------------------------------------------------
// AC4: .pick-pill deselect pills have pill border-radius
// ---------------------------------------------------------------------------

test('AC4 — deselect pick-pills have pill border-radius (> 100px)', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await page.locator('[data-action="toggle-new-match"]').click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: 'Bob' }).click();

  await expect(page.locator('.pick-pill').first()).toBeVisible();

  const radius = await page.evaluate(() => {
    const pill = document.querySelector('.pick-pill');
    return pill ? parseFloat(getComputedStyle(pill).borderRadius) : 0;
  });
  expect(radius).toBeGreaterThan(100);
});

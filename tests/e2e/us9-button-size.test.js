/**
 * US9 — Button Style Consistency: Uniform Button Size (009-button-style-consistency)
 *
 * AC1: Add player submit button has `btn` and `btn-full` classes
 * AC2: Start Match submit button has `btn` and `btn-full` classes
 * AC3: Record Game toggle button has `btn` and `btn-full` classes
 * AC4: Save Game (submit-game) button has `btn` and `btn-full` classes
 * AC5: All action buttons have computed height >= 44px
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
// AC1: Add player submit button has btn + btn-full
// ---------------------------------------------------------------------------

test('AC1 — Add player submit button has btn and btn-full classes', async ({ page }) => {
  await setupTournament(page, { players: [] });
  await page.locator('[data-action="toggle-add-player"]').click();

  const submitBtn = page.locator('#add-player-form button[type="submit"]');
  await expect(submitBtn).toBeVisible();

  const classes = await submitBtn.getAttribute('class');
  expect(classes).toContain('btn');
  expect(classes).toContain('btn-full');
});

// ---------------------------------------------------------------------------
// AC2: Start Match submit button has btn + btn-full
// ---------------------------------------------------------------------------

test('AC2 — Start Match submit button has btn and btn-full classes', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await page.locator('[data-action="toggle-new-match"]').click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: 'Bob' }).click();

  const submitBtn = page.locator('#start-match-form button[type="submit"]');
  await expect(submitBtn).toBeVisible();

  const classes = await submitBtn.getAttribute('class');
  expect(classes).toContain('btn');
  expect(classes).toContain('btn-full');
});

// ---------------------------------------------------------------------------
// AC3: Record Game toggle button has btn + btn-full
// ---------------------------------------------------------------------------

test('AC3 — Record Game toggle button has btn and btn-full classes', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob' });

  const card = page.locator('.live-card--active').first();
  const recordBtn = card.locator('[data-action="record-game"]').first();
  await expect(recordBtn).toBeVisible();

  const classes = await recordBtn.getAttribute('class');
  expect(classes).toContain('btn');
  expect(classes).toContain('btn-full');
});

// ---------------------------------------------------------------------------
// AC4: Save Game (submit-game) button has btn + btn-full
// ---------------------------------------------------------------------------

test('AC4 — Save Game button has btn and btn-full classes', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob' });

  const card = page.locator('.live-card--active').first();
  await card.locator('[data-action="record-game"]').click();

  const saveBtn = card.locator('[data-action="submit-game"]');
  await expect(saveBtn).toBeVisible();

  const classes = await saveBtn.getAttribute('class');
  expect(classes).toContain('btn');
  expect(classes).toContain('btn-full');
});

// ---------------------------------------------------------------------------
// AC5: All action buttons have computed height >= 44px
// ---------------------------------------------------------------------------

test('AC5 — Add player submit button has computed height >= 44px', async ({ page }) => {
  await setupTournament(page, { players: [] });
  await page.locator('[data-action="toggle-add-player"]').click();

  const height = await page.evaluate(() => {
    const btn = document.querySelector('#add-player-form button[type="submit"]');
    return btn ? parseFloat(getComputedStyle(btn).height) : 0;
  });
  expect(height).toBeGreaterThanOrEqual(44);
});

test('AC5 — Record Game toggle button has computed height >= 44px', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob' });

  const height = await page.evaluate(() => {
    const btn = document.querySelector('[data-action="record-game"]');
    return btn ? parseFloat(getComputedStyle(btn).height) : 0;
  });
  expect(height).toBeGreaterThanOrEqual(44);
});

test('AC5 — Save Game button has computed height >= 44px', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob' });

  const card = page.locator('.live-card--active').first();
  await card.locator('[data-action="record-game"]').click();

  const height = await page.evaluate(() => {
    const btn = document.querySelector('[data-action="submit-game"]');
    return btn ? parseFloat(getComputedStyle(btn).height) : 0;
  });
  expect(height).toBeGreaterThanOrEqual(44);
});

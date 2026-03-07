/**
 * 013-cube-lozenges — US1: Cube Value Lozenge Selector
 *
 * Scenario 1: All 7 cube value buttons visible (no dropdown) when game recording form opens
 * Scenario 2: Value "1" lozenge has pick-btn--selected on form open (default state)
 * Scenario 3: Tapping cube value "4" gives it pick-btn--selected and removes it from "1"
 * Scenario 4: Submitting with cube value "2" and gammon win records 4 match points (2×2)
 */

import { test, expect } from './fixtures.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function setupTournament(page, players = ['Alice', 'Bob']) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  await page.locator('.name-prompt input[type="text"]').fill('Cube Test');
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--live')).toBeVisible();
  for (const name of players) {
    await page.locator('[data-action="toggle-add-player"]').click();
    await page.locator('#player-name-input').fill(name);
    await page.locator('#add-player-form button[type="submit"]').click();
    await page.waitForTimeout(50);
  }
}

async function startMatch(page, p1Name, p2Name, target = 7) {
  const expanded = await page.locator('.live-new-match--expanded').isVisible().catch(() => false);
  if (!expanded) await page.locator('[data-action="toggle-new-match"]').click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: p1Name }).click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: p2Name }).click();
  await page.locator(`[data-action="pick-target"][data-target-value="${target}"]`).click();
  await page.locator('#start-match-form button[type="submit"]').click();
  await page.waitForTimeout(50);
}

async function openGameForm(page) {
  const card = page.locator('.live-card--active').first();
  await card.locator('[data-action="record-game"]').click();
  await page.waitForTimeout(50);
  return card;
}

// ---------------------------------------------------------------------------
// Scenario 1: All 7 cube value buttons visible, no dropdown
// ---------------------------------------------------------------------------

test('S1: game recording form shows 7 cube value lozenge buttons, no dropdown', async ({ page }) => {
  await setupTournament(page);
  await startMatch(page, 'Alice', 'Bob');
  await openGameForm(page);

  const card = page.locator('.live-card--active').first();

  // 7 lozenge buttons must be present
  await expect(card.locator('[data-action="pick-cube-value"]')).toHaveCount(7);

  // No <select data-cube-value> dropdown
  await expect(card.locator('select[data-cube-value]')).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// Scenario 2: Value "1" pre-selected on form open
// ---------------------------------------------------------------------------

test('S2: cube value "1" lozenge is pre-selected when form opens', async ({ page }) => {
  await setupTournament(page);
  await startMatch(page, 'Alice', 'Bob');
  await openGameForm(page);

  const card = page.locator('.live-card--active').first();
  const btn1 = card.locator('[data-action="pick-cube-value"][data-cube-value="1"]');

  await expect(btn1).toHaveClass(/pick-btn--selected/);

  // All other cube buttons must NOT be selected
  for (const val of ['2', '4', '8', '16', '32', '64']) {
    const btn = card.locator(`[data-action="pick-cube-value"][data-cube-value="${val}"]`);
    await expect(btn).not.toHaveClass(/pick-btn--selected/);
  }
});

// ---------------------------------------------------------------------------
// Scenario 3: Tapping cube "4" selects it and deselects "1"
// ---------------------------------------------------------------------------

test('S3: tapping cube value "4" selects it and deselects "1"', async ({ page }) => {
  await setupTournament(page);
  await startMatch(page, 'Alice', 'Bob');
  await openGameForm(page);

  const card = page.locator('.live-card--active').first();
  const btn4 = card.locator('[data-action="pick-cube-value"][data-cube-value="4"]');
  const btn1 = card.locator('[data-action="pick-cube-value"][data-cube-value="1"]');

  await btn4.click();

  await expect(btn4).toHaveClass(/pick-btn--selected/);
  await expect(btn1).not.toHaveClass(/pick-btn--selected/);
});

// ---------------------------------------------------------------------------
// Scenario 4: Submit with cube "2" + gammon → 4 match points (2×2)
// ---------------------------------------------------------------------------

test('S4: submitting with cube value "2" and gammon records 4 match points', async ({ page }) => {
  await setupTournament(page);
  await startMatch(page, 'Alice', 'Bob');
  const card = await openGameForm(page);

  // Select cube value 2
  await card.locator('[data-action="pick-cube-value"][data-cube-value="2"]').click();

  // Select gammon result type
  await card.locator('[data-result-type="gammon"]').click();

  // Pick Alice as winner
  await card.locator('[data-action="pick-winner"]').filter({ hasText: 'Alice' }).click();

  // Submit
  await card.locator('[data-action="submit-game"]').click();
  await page.waitForTimeout(50);

  // Winner's score should be 4 (2 × 2 gammon = 4 match points)
  const scoreSpans = page.locator('[data-score-p1], [data-score-p2]');
  await expect(scoreSpans.filter({ hasText: '4' })).toHaveCount(1);
});

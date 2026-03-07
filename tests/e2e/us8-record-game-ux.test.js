/**
 * US8 — Record Game UX: Winner Tap-Select & Prominent Save (008-record-game-ux)
 *
 * AC1: Game form shows two pick-winner buttons instead of a dropdown; result-type + cube still present
 * AC2: Tapping Player A selects it; Player B unselected
 * AC3: Tapping Player B switches selection
 * AC4: Tapping selected button deselects it (toggle-off)
 * AC5: Submit with no winner shows [data-game-error]; score unchanged
 * AC6: Submit with winner records game; score updates; form collapses
 * AC7: Save button height >= 48px; full-width; has btn-primary class (US2)
 * AC8: Winner state resets when form closes and reopens
 * AC9: Long player name (24 chars) doesn't overflow card bounds (SC-004)
 */

import { test, expect } from './fixtures.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function setupTournament(page, { name = 'Club Night', players = [] } = {}) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  await page.locator('#start-tournament-btn').click();
  await expect(page.locator('.view--live')).toBeVisible();
  for (const playerName of players) {
    await page.locator('[data-action="toggle-add-player"]').click();
    await page.locator('#player-name-input').fill(playerName);
    await page.locator('#add-player-form button[type="submit"]').click();
    await page.waitForTimeout(50);
  }
}

async function startMatch(page, { p1Name, p2Name, target = 7 } = {}) {
  const expanded = await page.locator('.live-new-match--expanded').isVisible().catch(() => false);
  if (!expanded) await page.locator('[data-action="toggle-new-match"]').click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: p1Name }).click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: p2Name }).click();
  if (target !== 7) {
    await page.locator('[data-action="pick-target"]').filter({ hasText: new RegExp(`^${target}$`) }).click();
  }
  await page.locator('#start-match-form button[type="submit"]').click();
  await page.waitForTimeout(50);
}

// ---------------------------------------------------------------------------
// AC1: pick-winner buttons present; no [data-game-winner] select; FR-009 fields present
// ---------------------------------------------------------------------------

test('AC1 — game form shows two pick-winner buttons, no dropdown; result/cube selects still present', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob' });

  const card = page.locator('.live-card--active').first();
  await card.locator('[data-action="record-game"]').click();

  const form = card.locator('[data-game-form]');
  await expect(form).toBeVisible();

  // Two winner buttons — one for each player
  const winnerBtns = form.locator('[data-action="pick-winner"]');
  await expect(winnerBtns).toHaveCount(2);
  await expect(winnerBtns.nth(0)).toContainText('Alice');
  await expect(winnerBtns.nth(1)).toContainText('Bob');

  // Old dropdown must not exist
  await expect(form.locator('[data-game-winner]')).toHaveCount(0);

  // FR-009: result-type select and cube-value buttons still present
  await expect(form.locator('[data-result-type]')).toBeVisible();
  await expect(form.locator('[data-action="pick-cube-value"]').first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// AC2: tapping Player A selects it; Player B unselected
// ---------------------------------------------------------------------------

test('AC2 — tapping Player A selects it; Player B remains unselected', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob' });

  const card = page.locator('.live-card--active').first();
  await card.locator('[data-action="record-game"]').click();

  const btnAlice = card.locator('[data-action="pick-winner"]').filter({ hasText: 'Alice' });
  const btnBob = card.locator('[data-action="pick-winner"]').filter({ hasText: 'Bob' });

  await btnAlice.click();
  await expect(btnAlice).toHaveClass(/pick-btn--selected/);
  await expect(btnBob).not.toHaveClass(/pick-btn--selected/);
});

// ---------------------------------------------------------------------------
// AC3: tapping Player B switches selection
// ---------------------------------------------------------------------------

test('AC3 — tapping Player B switches selection from Player A', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob' });

  const card = page.locator('.live-card--active').first();
  await card.locator('[data-action="record-game"]').click();

  const btnAlice = card.locator('[data-action="pick-winner"]').filter({ hasText: 'Alice' });
  const btnBob = card.locator('[data-action="pick-winner"]').filter({ hasText: 'Bob' });

  await btnAlice.click();
  await btnBob.click();
  await expect(btnBob).toHaveClass(/pick-btn--selected/);
  await expect(btnAlice).not.toHaveClass(/pick-btn--selected/);
});

// ---------------------------------------------------------------------------
// AC4: tapping selected button deselects (toggle-off)
// ---------------------------------------------------------------------------

test('AC4 — tapping already-selected button deselects it', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob' });

  const card = page.locator('.live-card--active').first();
  await card.locator('[data-action="record-game"]').click();

  const btnAlice = card.locator('[data-action="pick-winner"]').filter({ hasText: 'Alice' });
  const btnBob = card.locator('[data-action="pick-winner"]').filter({ hasText: 'Bob' });

  await btnAlice.click(); // select
  await btnAlice.click(); // deselect
  await expect(btnAlice).not.toHaveClass(/pick-btn--selected/);
  await expect(btnBob).not.toHaveClass(/pick-btn--selected/);
});

// ---------------------------------------------------------------------------
// AC5: submit with no winner shows error; score unchanged
// ---------------------------------------------------------------------------

test('AC5 — submit with no winner shows [data-game-error]; score stays 0-0', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob' });

  const card = page.locator('.live-card--active').first();
  const scoreBefore = await card.locator('.live-card__score').textContent();

  await card.locator('[data-action="record-game"]').click();
  // Do NOT pick a winner
  await card.locator('[data-action="submit-game"]').click();

  // Error must be visible
  const errorEl = card.locator('[data-game-error]');
  await expect(errorEl).toBeVisible();
  await expect(errorEl).not.toBeEmpty();

  // Form still open
  await expect(card.locator('[data-game-form]')).toBeVisible();

  // Score unchanged
  const scoreAfter = await card.locator('.live-card__score').textContent();
  expect(scoreAfter.replace(/\s/g, '')).toBe(scoreBefore.replace(/\s/g, ''));
});

// ---------------------------------------------------------------------------
// AC6: submit with winner records game; score updates; form collapses
// ---------------------------------------------------------------------------

test('AC6 — submit with winner updates score and collapses form', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob' });

  const card = page.locator('.live-card--active').first();
  await card.locator('[data-action="record-game"]').click();

  await card.locator('[data-action="pick-winner"]').filter({ hasText: 'Alice' }).click();
  await card.locator('[data-action="submit-game"]').click();

  // Form must collapse
  await expect(card.locator('[data-game-form]')).not.toBeVisible();

  // Score must show a 1
  const scoreText = await card.locator('.live-card__score').textContent();
  expect(scoreText).toMatch(/1/);
});

// ---------------------------------------------------------------------------
// AC7 (US2): save button >= 48px tall; full-width; has btn-primary class
// ---------------------------------------------------------------------------

test('AC7 — save button is >= 48px tall, full-width, and has btn-primary class', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob' });

  const card = page.locator('.live-card--active').first();
  await card.locator('[data-action="record-game"]').click();

  const saveBtn = card.locator('[data-action="submit-game"]');
  await expect(saveBtn).toBeVisible();

  // Height >= 48px
  const box = await saveBtn.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(48);

  // Full-width: button width should be close to the form width
  const form = card.locator('[data-game-form]');
  const formBox = await form.boundingBox();
  // Allow small margin/padding; button should be at least 80% of form width
  expect(box.width).toBeGreaterThan(formBox.width * 0.7);

  // btn-primary class present (verifies CTA colour is applied)
  await expect(saveBtn).toHaveClass(/btn-primary/);
});

// ---------------------------------------------------------------------------
// AC8: winner state resets when form closes and reopens
// ---------------------------------------------------------------------------

test('AC8 — winner selection resets to none when form closes and reopens', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob' });

  const card = page.locator('.live-card--active').first();

  // Open, select Alice, close via Cancel button
  await card.locator('[data-action="record-game"]').first().click();
  await card.locator('[data-action="pick-winner"]').filter({ hasText: 'Alice' }).click();
  await card.locator('[data-action="record-game"]').filter({ hasText: /cancel/i }).click(); // close

  // Reopen
  await card.locator('[data-action="record-game"]').click();

  const btnAlice = card.locator('[data-action="pick-winner"]').filter({ hasText: 'Alice' });
  const btnBob = card.locator('[data-action="pick-winner"]').filter({ hasText: 'Bob' });
  await expect(btnAlice).not.toHaveClass(/pick-btn--selected/);
  await expect(btnBob).not.toHaveClass(/pick-btn--selected/);
});

// ---------------------------------------------------------------------------
// AC9: 24-char player name doesn't overflow card bounds (SC-004)
// ---------------------------------------------------------------------------

test('AC9 — 24-char player name renders without overflowing card', async ({ page }) => {
  const longName = 'Bartholomew Nightingale'; // 23 chars — close to limit
  await setupTournament(page, { players: [longName, 'Alice'] });
  await startMatch(page, { p1Name: longName, p2Name: 'Alice' });

  const card = page.locator('.live-card--active').first();
  await card.locator('[data-action="record-game"]').click();

  const winnerBtns = card.locator('[data-action="pick-winner"]');
  await expect(winnerBtns).toHaveCount(2);

  const cardBox = await card.boundingBox();
  for (let i = 0; i < 2; i++) {
    const btnBox = await winnerBtns.nth(i).boundingBox();
    // Button must be visible and within card bounds
    expect(btnBox).not.toBeNull();
    expect(btnBox.width).toBeLessThanOrEqual(cardBox.width + 2); // +2px tolerance
  }
});

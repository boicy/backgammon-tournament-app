/**
 * US2 — Inline Game Recording (004-ux-redesign)
 * Tests the inline game form on match cards in the Live view.
 *
 * AC1: Tap "Record Game" → inline form appears within card
 * AC2: Submit game → score updates in place, form collapses
 * AC3: Toggle "Record Game" off → form collapses without recording
 * AC4: Record game that completes match → card transitions to complete state
 * AC5 (edge case): Card A form stays open when state:matches:changed fires from Card B
 */

import { test, expect } from './fixtures.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function setupTournament(page, { name = 'Club Night', players = [] } = {}) {
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

async function startMatch(page, { p1Name, p2Name, target = 7 } = {}) {
  const expanded = await page.locator('.live-new-match--expanded').isVisible().catch(() => false);
  if (!expanded) await page.locator('[data-action="toggle-new-match"]').click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: p1Name }).click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: p2Name }).click();
  await page.locator('input[data-start-target]').fill(String(target));
  await page.locator('#start-match-form button[type="submit"]').click();
  await page.waitForTimeout(50);
}

// ---------------------------------------------------------------------------
// AC1: Record Game expands inline form within the card
// ---------------------------------------------------------------------------

test('AC1 — tapping Record Game expands inline form within the match card', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 7 });

  const card = page.locator('.live-card--active').first();
  await expect(card).toBeVisible();

  // Inline form should not be visible yet
  await expect(card.locator('[data-game-form]')).not.toBeVisible();

  // Tap Record Game
  await card.locator('[data-action="record-game"]').click();

  // Inline form should now be visible within the same card
  const form = card.locator('[data-game-form]');
  await expect(form).toBeVisible();

  // Form must contain winner select, result type select, cube value select
  await expect(form.locator('[data-game-winner]')).toBeVisible();
  await expect(form.locator('[data-result-type]')).toBeVisible();
  await expect(form.locator('[data-cube-value]')).toBeVisible();
});

// ---------------------------------------------------------------------------
// AC2: Submit game → score updates in place, form collapses
// ---------------------------------------------------------------------------

test('AC2 — submitting a game updates the score and collapses the form', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 7 });

  const card = page.locator('.live-card--active').first();

  // Expand inline form
  await card.locator('[data-action="record-game"]').click();
  const form = card.locator('[data-game-form]');
  await expect(form).toBeVisible();

  // Select Alice as winner (first option), standard result, cube 1 (defaults)
  const winnerSelect = card.locator('[data-game-winner]');
  await winnerSelect.selectOption({ index: 0 }); // player1 = Alice

  // Submit
  await card.locator('[data-action="submit-game"]').click();

  // Form must be collapsed
  await expect(form).not.toBeVisible();

  // Score must have updated — at least one score cell should show 1
  const scoreText = await card.locator('.live-card__score').textContent();
  expect(scoreText).toMatch(/1/);
});

// ---------------------------------------------------------------------------
// AC3: Toggle Record Game off → collapses without recording
// ---------------------------------------------------------------------------

test('AC3 — tapping Record Game again collapses form without recording', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 7 });

  const card = page.locator('.live-card--active').first();

  // Open form
  await card.locator('[data-action="record-game"]').click();
  await expect(card.locator('[data-game-form]')).toBeVisible();

  // Initial score is 0-0
  const scoreText = await card.locator('.live-card__score').textContent();

  // Close form using Cancel button (data-action="record-game" on cancel or direct toggle)
  const cancelOrToggle = card.locator('[data-action="record-game"]').last();
  await cancelOrToggle.click();

  // Form is collapsed
  await expect(card.locator('[data-game-form]')).not.toBeVisible();

  // Score unchanged (still 0-0)
  const scoreAfter = await card.locator('.live-card__score').textContent();
  expect(scoreAfter.replace(/\s/g, '')).toBe(scoreText.replace(/\s/g, ''));
});

// ---------------------------------------------------------------------------
// AC4: Game that completes match → card transitions to complete state
// ---------------------------------------------------------------------------

test('AC4 — winning last game transitions card to complete state', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  // Target 1 so the first game wins the match
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 1 });

  const activeCard = page.locator('.live-card--active').first();
  await expect(activeCard).toBeVisible();

  // Expand and record single game (wins the match)
  await activeCard.locator('[data-action="record-game"]').click();
  await activeCard.locator('[data-game-winner]').selectOption({ index: 0 });
  await activeCard.locator('[data-action="submit-game"]').click();

  // Card should now be in complete section
  await expect(page.locator('.live-card--complete')).toBeVisible();
  await expect(page.locator('.live-card--active')).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// AC5 (edge case): Single form constraint — opening card B collapses card A
// ---------------------------------------------------------------------------

test('AC5 — opening second card collapses first card form', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie', 'Dave'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 7 });
  await startMatch(page, { p1Name: 'Charlie', p2Name: 'Dave', target: 7 });

  const cards = page.locator('.live-card--active');
  await expect(cards).toHaveCount(2);

  const cardA = cards.nth(0);
  const cardB = cards.nth(1);

  // Expand card A
  await cardA.locator('[data-action="record-game"]').first().click();
  await expect(cardA.locator('[data-game-form]')).toBeVisible();

  // Expand card B — should collapse card A
  await cardB.locator('[data-action="record-game"]').first().click();

  // Card A form must be collapsed
  await expect(cardA.locator('[data-game-form]')).not.toBeVisible();

  // Card B form must be expanded
  await expect(cardB.locator('[data-game-form]')).toBeVisible();
});

// ---------------------------------------------------------------------------
// FR-009: Cannot remove player with active match
// ---------------------------------------------------------------------------

test('FR-009 — cannot remove player who has an active match', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 7 });

  // Expand roster
  await page.locator('[data-action="toggle-roster"]').click();

  // Try to remove Alice (who is in an active match)
  const aliceRow = page.locator('.live-roster__row', { hasText: 'Alice' });
  await aliceRow.locator('[data-action="remove-player"]').click();

  // Some error should surface (roster still shows Alice)
  await expect(aliceRow).toBeVisible();
});

// ---------------------------------------------------------------------------
// Overflow button: abandon match with confirmation
// ---------------------------------------------------------------------------

test('abandon match via overflow button removes it from active list', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 7 });

  await expect(page.locator('.live-card--active')).toHaveCount(1);

  // Accept confirmation dialog
  page.once('dialog', (d) => d.accept());
  await page.locator('[data-action="open-overflow"]').first().click();

  // Active match card should be gone
  await expect(page.locator('.live-card--active')).toHaveCount(0);
});

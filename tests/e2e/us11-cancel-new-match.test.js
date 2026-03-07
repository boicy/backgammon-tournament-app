/**
 * US11 — Cancel New Match Creation (011-cancel-new-match)
 *
 * US1 (P1): Cancel During Player Selection
 *   S1: Cancel button visible at pick step 1 (form open, no player picked)
 *   S2: Cancel button visible at pick step 2 (P1 picked)
 *   S3: Cancel button visible at confirm step (P1 + P2 picked)
 *   S4: Cancel at step 1 closes form
 *   S5: Cancel at step 2 closes form and clears P1 selection
 *   S6: Cancel at confirm step closes form and clears all selections
 *
 * US2 (P2): Deselect a Player to Go Back One Step
 *   S1: Deselect affordance present on P1 at step 2 (not disabled)
 *   S2: Deselect P1 at step 2 → returns to step 1, form stays open
 *   S3: Deselect P1 at confirm step → returns to step 1, target reset, form stays open
 *   S4: Deselect P2 at confirm step → returns to step 1, target reset, form stays open
 *
 * US3 (P3): Fresh State on Re-open
 *   S1: Pick P1 → toggle close → toggle open → step 1, no prior selection
 *   S2: Re-open always starts at step 1 with no players pre-selected
 */

import { test, expect } from './fixtures.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function setupTournament(page, { name = 'Cancel Test', players = [] } = {}) {
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

async function openNewMatchForm(page) {
  const expanded = await page.locator('.live-new-match--expanded').isVisible().catch(() => false);
  if (!expanded) await page.locator('[data-action="toggle-new-match"]').click();
  await expect(page.locator('.live-new-match--expanded')).toBeVisible();
}

// ---------------------------------------------------------------------------
// US1 (P1): Cancel During Player Selection
// ---------------------------------------------------------------------------

test.describe('US1: Cancel button visibility', () => {
  test('S1: Cancel button visible at step 1 (no player picked)', async ({ page }) => {
    await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
    await openNewMatchForm(page);
    // At step 1 (Pick Player 1), cancel button should be visible
    await expect(page.locator('[data-action="cancel-new-match"]')).toBeVisible();
  });

  test('S2: Cancel button visible at step 2 (P1 picked)', async ({ page }) => {
    await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
    await openNewMatchForm(page);
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
    // At step 2 (Pick Player 2), cancel button should still be visible
    await expect(page.locator('[data-action="cancel-new-match"]')).toBeVisible();
  });

  test('S3: Cancel button visible at confirm step', async ({ page }) => {
    await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
    await openNewMatchForm(page);
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Bob' }).click();
    // At confirm step, cancel button should be visible
    await expect(page.locator('.pick-confirm')).toBeVisible();
    await expect(page.locator('[data-action="cancel-new-match"]')).toBeVisible();
  });
});

test.describe('US1: Cancel button behaviour', () => {
  test('S4: Cancel at step 1 closes form', async ({ page }) => {
    await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
    await openNewMatchForm(page);
    // Form is open at step 1
    await expect(page.locator('.pick-prompt')).toHaveText('Pick Player 1');
    // Click cancel
    await page.locator('[data-action="cancel-new-match"]').click();
    // Form should be closed
    await expect(page.locator('.live-new-match--expanded')).not.toBeVisible();
  });

  test('S5: Cancel at step 2 closes form and clears P1 selection', async ({ page }) => {
    await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
    await openNewMatchForm(page);
    // Pick P1
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
    await expect(page.locator('.pick-prompt')).toHaveText('Pick Player 2');
    // Click cancel
    await page.locator('[data-action="cancel-new-match"]').click();
    // Form should be closed
    await expect(page.locator('.live-new-match--expanded')).not.toBeVisible();
    // Re-open: should be at step 1, no P1 pre-selected
    await openNewMatchForm(page);
    await expect(page.locator('.pick-prompt')).toHaveText('Pick Player 1');
    await expect(page.locator('.pick-btn--selected')).not.toBeVisible();
  });

  test('S6: Cancel at confirm step closes form and clears all selections', async ({ page }) => {
    await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
    await openNewMatchForm(page);
    // Pick P1 and P2 to reach confirm step
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Bob' }).click();
    await expect(page.locator('.pick-confirm')).toBeVisible();
    // Click cancel
    await page.locator('[data-action="cancel-new-match"]').click();
    // Form should be closed
    await expect(page.locator('.live-new-match--expanded')).not.toBeVisible();
    // Re-open: should be at step 1, no prior selections
    await openNewMatchForm(page);
    await expect(page.locator('.pick-prompt')).toHaveText('Pick Player 1');
    await expect(page.locator('.pick-btn--selected')).not.toBeVisible();
    await expect(page.locator('.pick-confirm')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// US2 (P2): Deselect a Player to Go Back One Step
// ---------------------------------------------------------------------------

test.describe('US2: Step-back deselect', () => {
  test('S1: Deselect affordance present and enabled for P1 at step 2', async ({ page }) => {
    await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
    await openNewMatchForm(page);
    // Pick P1 (Alice) — we are now at step 2
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
    await expect(page.locator('.pick-prompt')).toHaveText('Pick Player 2');
    // P1 (Alice) should have a deselect affordance that is NOT disabled
    const aliceDeselect = page.locator('[data-action="deselect-player"]').filter({ hasText: 'Alice' });
    await expect(aliceDeselect).toBeVisible();
    await expect(aliceDeselect).not.toBeDisabled();
  });

  test('S2: Deselect P1 at step 2 returns to step 1, form stays open', async ({ page }) => {
    await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
    await openNewMatchForm(page);
    // Pick P1 (Alice)
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
    await expect(page.locator('.pick-prompt')).toHaveText('Pick Player 2');
    // Deselect Alice (P1)
    await page.locator('[data-action="deselect-player"]').filter({ hasText: 'Alice' }).click();
    // Should return to step 1, form still open
    await expect(page.locator('.live-new-match--expanded')).toBeVisible();
    await expect(page.locator('.pick-prompt')).toHaveText('Pick Player 1');
    // No player should be selected
    await expect(page.locator('.pick-btn--selected')).not.toBeVisible();
  });
});

test.describe('US2: Confirm-step deselect returns to step 1', () => {
  test('S3: Deselect P1 at confirm step returns to step 1, target reset', async ({ page }) => {
    await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
    await openNewMatchForm(page);
    // Pick P1 and P2 to reach confirm step
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Bob' }).click();
    await expect(page.locator('.pick-confirm')).toBeVisible();
    // Change target to 5
    await page.locator('[data-action="pick-target"][data-target-value="5"]').click();
    // Deselect P1 (Alice)
    await page.locator('[data-action="deselect-player"]').filter({ hasText: 'Alice' }).click();
    // Should return to step 1, form still open
    await expect(page.locator('.live-new-match--expanded')).toBeVisible();
    await expect(page.locator('.pick-prompt')).toHaveText('Pick Player 1');
    // No player should be selected
    await expect(page.locator('.pick-btn--selected')).not.toBeVisible();
    // Navigate back to confirm to verify target was reset to 7
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Bob' }).click();
    await expect(page.locator('.pick-confirm')).toBeVisible();
    await expect(
      page.locator('[data-action="pick-target"][data-target-value="7"]'),
    ).toHaveClass(/pick-btn--selected/);
  });

  test('S4: Deselect P2 at confirm step returns to step 1, target reset', async ({ page }) => {
    await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
    await openNewMatchForm(page);
    // Pick P1 and P2 to reach confirm step
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Bob' }).click();
    await expect(page.locator('.pick-confirm')).toBeVisible();
    // Change target to 9
    await page.locator('[data-action="pick-target"][data-target-value="9"]').click();
    // Deselect P2 (Bob)
    await page.locator('[data-action="deselect-player"]').filter({ hasText: 'Bob' }).click();
    // Should return to step 1, form still open
    await expect(page.locator('.live-new-match--expanded')).toBeVisible();
    await expect(page.locator('.pick-prompt')).toHaveText('Pick Player 1');
    // Navigate back to confirm to verify target was reset to 7
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Bob' }).click();
    await expect(page.locator('.pick-confirm')).toBeVisible();
    await expect(
      page.locator('[data-action="pick-target"][data-target-value="7"]'),
    ).toHaveClass(/pick-btn--selected/);
  });
});

// ---------------------------------------------------------------------------
// US3 (P3): Fresh State on Re-open
// ---------------------------------------------------------------------------

test.describe('US3: Fresh state on re-open', () => {
  test('S1: Pick P1 → toggle close → re-open shows step 1, no prior selection', async ({ page }) => {
    await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
    await openNewMatchForm(page);
    // Pick P1 (Alice) — now at step 2
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
    await expect(page.locator('.pick-prompt')).toHaveText('Pick Player 2');
    // Toggle close via toggle button
    await page.locator('[data-action="toggle-new-match"]').click();
    await expect(page.locator('.live-new-match--expanded')).not.toBeVisible();
    // Re-open form
    await page.locator('[data-action="toggle-new-match"]').click();
    await expect(page.locator('.live-new-match--expanded')).toBeVisible();
    // Should be at step 1, no prior selection
    await expect(page.locator('.pick-prompt')).toHaveText('Pick Player 1');
    await expect(page.locator('.pick-btn--selected')).not.toBeVisible();
  });

  test('S2: Pick P1+P2 → toggle close → re-open shows step 1 clean', async ({ page }) => {
    await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie'] });
    await openNewMatchForm(page);
    // Pick both players → confirm step
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Bob' }).click();
    await expect(page.locator('.pick-confirm')).toBeVisible();
    // Toggle close
    await page.locator('[data-action="toggle-new-match"]').click();
    await expect(page.locator('.live-new-match--expanded')).not.toBeVisible();
    // Re-open form
    await page.locator('[data-action="toggle-new-match"]').click();
    await expect(page.locator('.live-new-match--expanded')).toBeVisible();
    // Should be at step 1, confirm screen gone, no selections
    await expect(page.locator('.pick-confirm')).not.toBeVisible();
    await expect(page.locator('.pick-prompt')).toHaveText('Pick Player 1');
    await expect(page.locator('.pick-btn--selected')).not.toBeVisible();
  });
});

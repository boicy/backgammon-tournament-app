/**
 * US1 — Create and Play a Match
 * Tests the match detail view: creating a match, recording games, auto-complete.
 *
 * Requires matchHub (#/players) and matchDetail (#/match) to be implemented.
 */

import { test, expect } from './fixtures.js';

// Helper: set up a fresh tournament with two players and navigate to matchHub
async function setupNight(page, { tournamentName = 'Test Night', p1 = 'Alice', p2 = 'Bob' } = {}) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  // Enter tournament name
  await page.locator('.name-prompt input[type="text"]').fill(tournamentName);
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--match-hub')).toBeVisible();
  // Add players
  await page.locator('[data-add-player-input]').fill(p1);
  await page.locator('[data-add-player-form] button[type="submit"]').click();
  await page.locator('[data-add-player-input]').fill(p2);
  await page.locator('[data-add-player-form] button[type="submit"]').click();
}

// Helper: create a match via matchHub and navigate to matchDetail
async function createMatch(page, { p1Name = 'Alice', p2Name = 'Bob', target = 5 } = {}) {
  await page.locator('select[data-start-p1]').selectOption({ label: p1Name });
  await page.locator('select[data-start-p2]').selectOption({ label: p2Name });
  await page.locator('input[data-start-target]').fill(String(target));
  await page.locator('button[data-action="start-match"]').click();
  // Click "Enter" on the newly created active match
  await page.locator('.match-card--active').first().locator('button[data-action="enter-match"]').click();
  await expect(page.locator('.view--match')).toBeVisible();
}

// Helper: record a game in matchDetail
async function recordGame(page, { winner = 'Alice', resultType = 'standard', cubeValue = '1' } = {}) {
  await page.locator('select[data-game-winner]').selectOption({ label: winner });
  await page.locator('select[data-result-type]').selectOption(resultType);
  await page.locator('select[data-cube-value]').selectOption(cubeValue);
  await page.locator('button[data-action="record-game"]').click();
}

// ---------------------------------------------------------------------------
// AC1: Match created with correct initial score (0–0)
// ---------------------------------------------------------------------------

test('AC1 — match created with target shown and initial score 0–0', async ({ page }) => {
  await setupNight(page);
  await createMatch(page, { target: 5 });

  await expect(page.locator('.view--match')).toBeVisible();
  await expect(page.locator('[data-testid="score-p1"]')).toContainText('0');
  await expect(page.locator('[data-testid="score-p2"]')).toContainText('0');
  await expect(page.locator('[data-testid="target-score"]')).toContainText('5');
});

// ---------------------------------------------------------------------------
// AC2: Auto-complete when target is reached
// ---------------------------------------------------------------------------

test('AC2 — match auto-completes when a player reaches the target score', async ({ page }) => {
  await setupNight(page);
  await createMatch(page, { target: 3 });

  // Record games: Alice wins 3 points (3 × standard × cube1)
  await recordGame(page, { winner: 'Alice', resultType: 'standard', cubeValue: '1' });
  await recordGame(page, { winner: 'Alice', resultType: 'standard', cubeValue: '1' });
  await recordGame(page, { winner: 'Alice', resultType: 'standard', cubeValue: '1' });

  await expect(page.locator('[data-testid="match-complete-banner"]')).toBeVisible();
  await expect(page.locator('[data-testid="match-complete-banner"]')).toContainText('Alice');
  await expect(page.locator('[data-testid="score-p1"]')).toContainText('3');
});

// ---------------------------------------------------------------------------
// AC3: Gammon × cube value points correctly applied
// ---------------------------------------------------------------------------

test('AC3 — gammon × cube-2 awards 4 points to winner', async ({ page }) => {
  await setupNight(page);
  await createMatch(page, { target: 11 });

  await recordGame(page, { winner: 'Alice', resultType: 'gammon', cubeValue: '2' });

  await expect(page.locator('[data-testid="score-p1"]')).toContainText('4');
});

// ---------------------------------------------------------------------------
// AC4: Completed match is read-only (no further games can be added)
// ---------------------------------------------------------------------------

test('AC4 — game form is hidden after match completes', async ({ page }) => {
  await setupNight(page);
  await createMatch(page, { target: 1 });

  // Win in one game (target = 1)
  await recordGame(page, { winner: 'Alice', resultType: 'standard', cubeValue: '1' });

  await expect(page.locator('[data-testid="match-complete-banner"]')).toBeVisible();
  await expect(page.locator('[data-game-form]')).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// Additional: back button returns to hub
// ---------------------------------------------------------------------------

test('back button from match detail returns to match hub', async ({ page }) => {
  await setupNight(page);
  await createMatch(page, { target: 5 });

  await page.locator('[data-action="back-to-hub"]').click();
  await expect(page.locator('.view--match-hub')).toBeVisible();
});

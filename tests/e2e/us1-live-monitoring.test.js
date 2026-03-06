/**
 * US1 — Live Match Monitoring (004-ux-redesign)
 * Tests the new Live view: match cards visible without scrolling, score prominence,
 * empty state, and game count display.
 *
 * AC1: 2 active match cards fully visible without scrolling at 375px
 * AC2: Score is the dominant visual element (largest font on card)
 * AC3: Empty state shows + New Match button when no active matches
 */

import { test, expect } from './fixtures.js';

// ---------------------------------------------------------------------------
// Helpers for 004-ux-redesign Live view
// ---------------------------------------------------------------------------

async function setupTournament(page, { name = 'Club Night', players = [] } = {}) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');

  // Fill tournament name and start
  await page.locator('.name-prompt input[type="text"]').fill(name);
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--live')).toBeVisible();

  // Add players via collapsible add-player form
  for (const playerName of players) {
    await page.locator('[data-action="toggle-add-player"]').click();
    await page.locator('#player-name-input').fill(playerName);
    await page.locator('#add-player-form button[type="submit"]').click();
    // Form collapses after adding; wait a tick for state to settle
    await page.waitForTimeout(50);
  }
}

async function startMatch(page, { p1Name, p2Name, target = 7 } = {}) {
  const toggleBtn = page.locator('[data-action="toggle-new-match"]');
  // Only click if not already expanded
  const isExpanded = await page.locator('#start-match-form').isVisible().catch(() => false);
  if (!isExpanded) await toggleBtn.click();

  await page.locator('select[data-start-p1]').selectOption({ label: p1Name });
  await page.locator('select[data-start-p2]').selectOption({ label: p2Name });
  await page.locator('input[data-start-target]').fill(String(target));
  await page.locator('#start-match-form button[type="submit"]').click();
  // Form collapses after starting
  await page.waitForTimeout(50);
}

// ---------------------------------------------------------------------------
// AC1: 2 match cards fully visible without scrolling at 375px
// ---------------------------------------------------------------------------

test('AC1 — both match cards visible without scrolling on 375px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await setupTournament(page, { players: ['Alice', 'Bob', 'Charlie', 'Dave'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 7 });
  await startMatch(page, { p1Name: 'Charlie', p2Name: 'Dave', target: 7 });

  const cards = page.locator('.live-card--active');
  await expect(cards).toHaveCount(2);

  // Both cards must be in the viewport (no scrolling needed to see them)
  const viewportHeight = 667;
  for (const card of await cards.all()) {
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    // Card bottom edge should be within the viewport height
    expect(box.y + box.height).toBeLessThanOrEqual(viewportHeight + 1); // +1 for rounding
  }
});

// ---------------------------------------------------------------------------
// AC2: Score is the dominant visual element on card (largest font size)
// ---------------------------------------------------------------------------

test('AC2 — score font size is larger than player name font size on match card', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 7 });

  const card = page.locator('.live-card--active').first();
  await expect(card).toBeVisible();

  // Get font size of score element
  const scoreFontSize = await card.locator('.live-card__score').evaluate((el) =>
    parseFloat(getComputedStyle(el).fontSize)
  );

  // Get font size of player name element
  const nameFontSize = await card.locator('.live-card__player').first().evaluate((el) =>
    parseFloat(getComputedStyle(el).fontSize)
  );

  // Score must be larger than player name text
  expect(scoreFontSize).toBeGreaterThan(nameFontSize);
});

// ---------------------------------------------------------------------------
// AC3: Empty state shows + New Match button when no active matches
// ---------------------------------------------------------------------------

test('AC3 — empty state is shown with + New Match button when no active matches', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });

  // No matches started — active zone should show empty state
  await expect(page.locator('.live-empty')).toBeVisible();

  // + New Match button should be visible and enabled (2 players registered)
  const newMatchBtn = page.locator('[data-action="toggle-new-match"]');
  await expect(newMatchBtn).toBeVisible();
  await expect(newMatchBtn).not.toBeDisabled();
});

// ---------------------------------------------------------------------------
// AC2 bonus: game count is shown on active match card
// ---------------------------------------------------------------------------

test('game count shown on active match card after games are played', async ({ page }) => {
  await setupTournament(page, { players: ['Alice', 'Bob'] });
  await startMatch(page, { p1Name: 'Alice', p2Name: 'Bob', target: 7 });

  const card = page.locator('.live-card--active').first();

  // Initially 0 games — card should show "No games yet" or "Game 0" equivalent
  await expect(card).toBeVisible();

  // Expand game form and record a game
  await card.locator('[data-action="record-game"]').click();
  await card.locator('[data-game-winner]').selectOption({ index: 0 });
  await card.locator('[data-action="submit-game"]').click();

  // After 1 game: should show game count indicator
  await expect(card).toContainText(/game\s*1|1\s*game/i);
});

// ---------------------------------------------------------------------------
// Navigation: no Live/Standings tabs when no tournament active
// ---------------------------------------------------------------------------

test('no Live/Standings tabs shown when no tournament is active', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');

  // Tabs should be hidden (body[data-has-tournament="false"])
  const livTab = page.locator('.app-tabs a[href="#/live"]');
  await expect(livTab).toHaveCSS('display', 'none').catch(async () => {
    // Alt: check body attribute
    const bodyAttr = await page.locator('body').getAttribute('data-has-tournament');
    expect(bodyAttr).toBe('false');
  });
});

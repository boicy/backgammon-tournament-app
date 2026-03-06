/**
 * US3 — Simplified Navigation (004-ux-redesign)
 * Tests: 2 tabs + hamburger during tournament; only hamburger when no tournament;
 * menu contents; End Tournament; legacy route redirects; menu closes on tab click.
 *
 * AC1: Active tournament → 2 tabs (Live, Standings) + ☰ visible
 * AC2: ☰ menu contains History, Club, divider, End Tournament, Reset Tournament
 * AC3: No tournament → no tabs, only ☰ (History + Club in menu only)
 * AC4: End Tournament in menu → confirm → back to Start Tournament state
 * Edge cases: #/match → #/live redirect; #/players → #/live redirect; menu closes on tab click
 */

import { test, expect } from './fixtures.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function freshStart(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
}

async function createTournament(page, name = 'Club Night') {
  await freshStart(page);
  await page.locator('.name-prompt input[type="text"]').fill(name);
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--live')).toBeVisible();
}

// ---------------------------------------------------------------------------
// AC1: Active tournament → 2 tabs + ☰
// ---------------------------------------------------------------------------

test('AC1 — active tournament shows Live and Standings tabs plus hamburger button', async ({ page }) => {
  await createTournament(page);

  // Live tab visible
  await expect(page.locator('.app-tabs a[href="#/live"]')).toBeVisible();
  // Standings tab visible
  await expect(page.locator('.app-tabs a[href="#/leaderboard"]')).toBeVisible();
  // Hamburger button visible
  await expect(page.locator('#hamburger-btn')).toBeVisible();
});

// ---------------------------------------------------------------------------
// AC2: ☰ menu contains expected items
// ---------------------------------------------------------------------------

test('AC2 — hamburger menu contains History, Club, divider, End Tournament, Reset Tournament', async ({ page }) => {
  await createTournament(page);

  // Open menu
  await page.locator('#hamburger-btn').click();
  const menu = page.locator('#hamburger-menu');
  await expect(menu).toBeVisible();

  // Check items
  await expect(menu.locator('a[href="#/history"]')).toBeVisible();
  await expect(menu.locator('a[href="#/club"]')).toBeVisible();
  await expect(menu.locator('[data-action="end-tournament"]')).toBeVisible();
  await expect(menu.locator('[data-action="reset-tournament"]')).toBeVisible();
  // Divider between nav links and tournament actions
  await expect(menu.locator('#menu-divider-tournament')).toBeVisible();
});

// ---------------------------------------------------------------------------
// AC3: No tournament → no Live/Standings tabs, ☰ shows History + Club only
// ---------------------------------------------------------------------------

test('AC3 — no tournament hides Live/Standings tabs, menu has only History and Club', async ({ page }) => {
  await freshStart(page);

  // Tabs should be hidden (display: none via body[data-has-tournament="false"])
  const bodyAttr = await page.locator('body').getAttribute('data-has-tournament');
  expect(bodyAttr).toBe('false');

  // Live/Standings tabs should not be visually present
  const liveTab = page.locator('.app-tabs a[href="#/live"]');
  const isVisible = await liveTab.isVisible().catch(() => false);
  if (isVisible) {
    // If present in DOM, it must have display:none
    const display = await liveTab.evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe('none');
  }

  // Hamburger button is always visible
  await expect(page.locator('#hamburger-btn')).toBeVisible();

  // Open menu and verify no End/Reset tournament items
  await page.locator('#hamburger-btn').click();
  const menu = page.locator('#hamburger-menu');
  await expect(menu).toBeVisible();
  await expect(menu.locator('[data-action="end-tournament"]')).not.toBeVisible();
  await expect(menu.locator('[data-action="reset-tournament"]')).not.toBeVisible();
  // But History and Club should be present
  await expect(menu.locator('a[href="#/history"]')).toBeVisible();
  await expect(menu.locator('a[href="#/club"]')).toBeVisible();
});

// ---------------------------------------------------------------------------
// AC4: End Tournament → confirmation → back to Start Tournament state
// ---------------------------------------------------------------------------

test('AC4 — End Tournament in menu archives tournament and returns to Start state', async ({ page }) => {
  await createTournament(page, 'Night to End');

  // Open menu
  await page.locator('#hamburger-btn').click();

  // Accept confirmation dialog
  page.once('dialog', (d) => d.accept());
  await page.locator('[data-action="end-tournament"]').click();

  // Should be back at Start Tournament prompt
  await expect(page.locator('.name-prompt')).toBeVisible();

  // body should have no tournament
  const bodyAttr = await page.locator('body').getAttribute('data-has-tournament');
  expect(bodyAttr).toBe('false');
});

// ---------------------------------------------------------------------------
// Edge case: #/match redirects to #/live
// ---------------------------------------------------------------------------

test('edge case — navigating to #/match redirects to #/live', async ({ page }) => {
  await createTournament(page);

  await page.goto('/#/match');
  await page.waitForURL(/\#\/live/);
  await expect(page.locator('.view--live')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Edge case: #/players redirects to #/live
// ---------------------------------------------------------------------------

test('edge case — navigating to #/players redirects to #/live', async ({ page }) => {
  await createTournament(page);

  await page.goto('/#/players');
  await page.waitForURL(/\#\/live/);
  await expect(page.locator('.view--live')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Edge case: hamburger menu closes when a nav tab is clicked
// ---------------------------------------------------------------------------

test('edge case — hamburger menu closes when Live tab is clicked', async ({ page }) => {
  await createTournament(page);

  // Open menu
  await page.locator('#hamburger-btn').click();
  await expect(page.locator('#hamburger-menu')).toBeVisible();

  // Click the Live tab
  await page.locator('.app-tabs a[href="#/live"]').click();

  // Menu should be closed
  await expect(page.locator('#hamburger-menu')).not.toHaveClass(/open/);
});

// ---------------------------------------------------------------------------
// Reset Tournament → does NOT archive, returns to Start state
// ---------------------------------------------------------------------------

test('Reset Tournament discards data and returns to Start state', async ({ page }) => {
  await createTournament(page, 'Night to Reset');

  await page.locator('#hamburger-btn').click();

  page.once('dialog', (d) => d.accept());
  await page.locator('[data-action="reset-tournament"]').click();

  await expect(page.locator('.name-prompt')).toBeVisible();

  const bodyAttr = await page.locator('body').getAttribute('data-has-tournament');
  expect(bodyAttr).toBe('false');
});

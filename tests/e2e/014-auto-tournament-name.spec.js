/**
 * 014 — Auto-Name Tournament by Date and Time
 *
 * US1 (P1): Tournament Named Automatically When Started
 *   S1: Start tournament → no name prompt → lands directly on live view
 *   S2: Auto-generated name matches HH:mm. dddd, MMM d, yyyy format
 *   S3: No text input shown at start view
 *
 * US2 (P1): User Can Still End a Tournament Manually
 *   S1: Start → end via hamburger → app navigates to start view
 *   S2: Ended tournament archived with auto-generated date/time name
 *
 * US3 (P1): Reset Tournament Retains Current Name
 *   S1: Start → note name → reset → live view shown, same name, players/matches cleared
 *   S2: No name prompt shown after reset
 *
 * US4 (P2): Archived Tournament Shows Auto-Generated Name in History
 *   S1: Full flow → club history shows correctly formatted date/time name
 *
 * FR-008: Backward Compatibility
 *   E1: Pre-existing manually-named archive entries still display correctly
 */

import { test, expect } from './fixtures.js';

const DATE_NAME_RE = /^\d{2}:\d{2}\. \w+, \w+ \d+, \d{4}$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function setupTournament(page, { players = [] } = {}) {
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

async function startMatch(page, p1Name, p2Name, target = 3) {
  const expanded = await page.locator('.live-new-match--expanded').isVisible().catch(() => false);
  if (!expanded) await page.locator('[data-action="toggle-new-match"]').click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: p1Name }).click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: p2Name }).click();
  await page.locator(`[data-action="pick-target"][data-target-value="${target}"]`).click();
  await page.locator('#start-match-form button[type="submit"]').click();
  await page.waitForTimeout(50);
}

async function recordGame(page, winnerName) {
  const card = page.locator('.live-card--active').first();
  await card.locator('[data-action="record-game"]').click();
  await card.locator('[data-action="pick-winner"]').filter({ hasText: winnerName }).click();
  await card.locator('[data-action="submit-game"]').click();
  await page.waitForTimeout(50);
}

// ---------------------------------------------------------------------------
// US1: Tournament Named Automatically When Started
// ---------------------------------------------------------------------------

test.describe('US1: Tournament named automatically when started', () => {
  test('S1: clicking Start Tournament proceeds directly to live view without name prompt', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');

    // Start view has button, not text input
    await expect(page.locator('#start-tournament-btn')).toBeVisible();
    await expect(page.locator('#tournament-name-input')).not.toBeAttached();

    await page.locator('#start-tournament-btn').click();
    await expect(page.locator('.view--live')).toBeVisible();
  });

  test('S2: auto-generated name matches HH:mm. dddd, MMM d, yyyy format', async ({ page }) => {
    await setupTournament(page);
    const name = (await page.locator('.tournament-name').innerText()).trim();
    expect(name).toMatch(DATE_NAME_RE);
  });

  test('S3: no text input shown at start view', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await expect(page.locator('#tournament-name-input')).not.toBeAttached();
  });
});

// ---------------------------------------------------------------------------
// US2: User Can Still End a Tournament Manually
// ---------------------------------------------------------------------------

test.describe('US2: User can still end a tournament manually', () => {
  test('S1: end tournament via hamburger navigates to start view', async ({ page }) => {
    await setupTournament(page);
    page.once('dialog', (d) => d.accept());
    await page.locator('#hamburger-btn').click();
    await page.locator('[data-action="end-tournament"]').click();
    await expect(page.locator('.name-prompt')).toBeVisible();
    await expect(page.locator('.view--live')).not.toBeVisible();
  });

  test('S2: ended tournament is archived with auto-generated date/time name', async ({ page }) => {
    await setupTournament(page, { players: ['Alice', 'Bob'] });

    await startMatch(page, 'Alice', 'Bob', 3);
    await recordGame(page, 'Alice');

    page.once('dialog', (d) => d.accept());
    await page.locator('#hamburger-btn').click();
    await page.locator('[data-action="end-tournament"]').click();
    await expect(page.locator('.name-prompt')).toBeVisible();

    await page.goto('/#/club');
    // Archive entry name must match the date/time format
    await expect(page.locator('.archive-item-name').first()).toHaveText(DATE_NAME_RE);
  });
});

// ---------------------------------------------------------------------------
// US3: Reset Tournament Retains Current Name
// ---------------------------------------------------------------------------

test.describe('US3: Reset tournament retains current name', () => {
  test('S1: reset shows live view with same name, players and matches cleared', async ({ page }) => {
    await setupTournament(page, { players: ['Alice', 'Bob'] });
    const nameBefore = (await page.locator('.tournament-name').innerText()).trim();
    expect(nameBefore).toMatch(DATE_NAME_RE);

    await startMatch(page, 'Alice', 'Bob', 3);
    await expect(page.locator('.live-card--active')).toBeVisible();

    page.once('dialog', (d) => d.accept());
    await page.locator('#hamburger-btn').click();
    await page.locator('[data-action="reset-tournament"]').click();

    // Should be on live view (not start)
    await expect(page.locator('.view--live')).toBeVisible();

    // Same tournament name preserved
    const nameAfter = (await page.locator('.tournament-name').innerText()).trim();
    expect(nameAfter).toBe(nameBefore);

    // Active matches cleared
    await expect(page.locator('.live-card--active')).not.toBeVisible();
  });

  test('S2: no name prompt shown after reset', async ({ page }) => {
    await setupTournament(page);
    page.once('dialog', (d) => d.accept());
    await page.locator('#hamburger-btn').click();
    await page.locator('[data-action="reset-tournament"]').click();

    await expect(page.locator('.view--live')).toBeVisible();
    await expect(page.locator('#start-tournament-btn')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// US4: Archived Tournament Shows Auto-Generated Name in History
// ---------------------------------------------------------------------------

test.describe('US4: Archived tournament shows auto-generated name in Club history', () => {
  test('S1: full flow — club history shows correctly formatted date/time name', async ({ page }) => {
    await setupTournament(page, { players: ['Alice', 'Bob'] });

    await startMatch(page, 'Alice', 'Bob', 3);
    await recordGame(page, 'Alice');

    page.once('dialog', (d) => d.accept());
    await page.locator('#hamburger-btn').click();
    await page.locator('[data-action="end-tournament"]').click();
    await expect(page.locator('.name-prompt')).toBeVisible();

    await page.goto('/#/club');
    // Archive entry name must match the date/time format
    await expect(page.locator('.archive-item-name').first()).toHaveText(DATE_NAME_RE);
  });
});

// ---------------------------------------------------------------------------
// FR-008: Backward Compatibility — Legacy archive entries
// ---------------------------------------------------------------------------

test.describe('FR-008: Legacy archive entries still display correctly', () => {
  test('E1: pre-existing manually-named tournament entry renders in club view', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { localStorage.clear(); });
    await page.evaluate(() => {
      const legacyArchive = [{
        id: 'legacy-001',
        name: 'Club Night',
        date: new Date('2025-01-15').toISOString(),
        archivedAt: new Date('2025-01-15').getTime(),
        status: 'archived',
        gameCount: 1,
        winnerName: 'Alice',
        finalStandings: [
          { name: 'Alice', matchPoints: 5, wins: 1, losses: 0, rank: 1 },
          { name: 'Bob', matchPoints: 0, wins: 0, losses: 1, rank: 2 },
        ],
        players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
        matches: [{
          id: 'm1', player1Id: 'p1', player2Id: 'p2', targetScore: 5,
          status: 'complete', winnerId: 'p1', startedAt: Date.now(), completedAt: Date.now(),
          games: [{ id: 'g1', winnerId: 'p1', matchPoints: 5, resultType: 'standard', cubeValue: 1 }],
        }],
      }];
      localStorage.setItem('backgammon:archive', JSON.stringify(legacyArchive));
    });
    // Full reload so loadFromStorage() picks up the seeded archive
    await page.goto('/');
    await page.goto('/#/club');
    await expect(page.locator('.archive-item-name').first()).toContainText('Club Night');
  });
});

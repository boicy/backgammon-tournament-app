/**
 * US4 — All-Time Leaderboard Backward Compatibility
 * Tests that the Club tab renders correctly with mixed archive types:
 * - Legacy snapshots (pre-003, have `games` field, no `matches`)
 * - Match-based snapshots (post-003, have `matches` field)
 *
 * Requires Club view (#/club) with backward-compat rendering.
 */

import { test, expect } from './fixtures.js';

// Seed a legacy snapshot (game-based, no matches field) directly into localStorage
function seedLegacyArchive() {
  return [
    {
      id: 'legacy-1',
      name: 'Legacy Night',
      date: '2025-06-01T00:00:00.000Z',
      archivedAt: 1000,
      players: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      games: [
        { id: 'g1', player1Id: 'p1', player2Id: 'p2', winnerId: 'p1',
          resultType: 'standard', cubeValue: 1, matchPoints: 1, timestamp: 1000, sequence: 1 },
      ],
      finalStandings: [
        { name: 'Alice', matchPoints: 1, wins: 1, losses: 0, rank: 1 },
        { name: 'Bob', matchPoints: 0, wins: 0, losses: 1, rank: 2 },
      ],
      winnerName: 'Alice',
      gameCount: 1,
    },
  ];
}

// Seed a match-based snapshot (post-003)
function seedMatchArchive() {
  return [
    {
      id: 'match-1',
      name: 'Match Night',
      date: '2026-01-01T00:00:00.000Z',
      archivedAt: 2000,
      players: [
        { id: 'p3', name: 'Carol' },
        { id: 'p4', name: 'Dave' },
      ],
      matches: [
        { id: 'm1', player1Id: 'p3', player2Id: 'p4', targetScore: 5,
          status: 'complete', winnerId: 'p3', startedAt: 1000, completedAt: 2000,
          games: [
            { id: 'g1', player1Id: 'p3', player2Id: 'p4', winnerId: 'p3',
              resultType: 'standard', cubeValue: 1, matchPoints: 1, timestamp: 1000, sequence: 1 },
          ] },
      ],
      finalStandings: [
        { name: 'Carol', matchPoints: 1, wins: 1, losses: 0, rank: 1 },
        { name: 'Dave', matchPoints: 0, wins: 0, losses: 1, rank: 2 },
      ],
      winnerName: 'Carol',
      gameCount: 1,
    },
  ];
}

// Helper: seed archive and reload app
async function seedAndLoad(page, archive) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.evaluate((a) => {
    localStorage.setItem('backgammon:archive', JSON.stringify(a));
  }, archive);
  // Full reload to trigger loadFromStorage with seeded archive
  await page.goto('/');
  // Navigate to club (hash change — club is unguarded)
  await page.evaluate(() => { window.location.hash = '#/club'; });
  await expect(page.locator('.view--club')).toBeVisible();
}

// ---------------------------------------------------------------------------
// AC1: Mixed archive renders all-time table without errors
// ---------------------------------------------------------------------------

test('AC1 — mixed archive (legacy + match-based) renders all-time table', async ({ page }) => {
  const mixedArchive = [...seedLegacyArchive(), ...seedMatchArchive()];
  await seedAndLoad(page, mixedArchive);

  // All-time table should render without errors
  const allTimeSection = page.locator('[data-testid="all-time-section"]');
  await expect(allTimeSection).toBeVisible();
  await expect(allTimeSection).not.toContainText('undefined');

  // Should show players from both tournaments
  await expect(allTimeSection).toContainText('Alice');
  await expect(allTimeSection).toContainText('Carol');
});

// ---------------------------------------------------------------------------
// AC2: Legacy winner credited correctly
// ---------------------------------------------------------------------------

test('AC2 — legacy snapshot winner is credited in all-time table', async ({ page }) => {
  await seedAndLoad(page, seedLegacyArchive());

  const allTimeSection = page.locator('[data-testid="all-time-section"]');
  // Alice is the winner of the legacy tournament
  const aliceRow = allTimeSection.locator('tr', { hasText: 'Alice' });
  await expect(aliceRow).toBeVisible();
  // Alice should have 1 tournament win
  await expect(aliceRow).toContainText('1');
});

// ---------------------------------------------------------------------------
// AC3: Match-based snapshot detail renders match list (not game list)
// ---------------------------------------------------------------------------

test('AC3 — match-based snapshot detail shows match list', async ({ page }) => {
  await seedAndLoad(page, seedMatchArchive());

  // Click on the match-based tournament
  await page.locator('.archive-item', { hasText: 'Match Night' }).click();
  await expect(page.locator('.tournament-detail')).toBeVisible();

  // Should show the match detail (Carol vs Dave)
  await expect(page.locator('.tournament-detail')).toContainText('Carol');
  await expect(page.locator('.tournament-detail')).toContainText('Dave');
});

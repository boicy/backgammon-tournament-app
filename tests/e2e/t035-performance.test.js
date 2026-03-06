import { test, expect } from '@playwright/test';

// Generate 52 TournamentSnapshot fixtures inside the browser to avoid
// serializing large payloads across the Playwright/browser boundary.
async function seedLargeArchive(page) {
  await page.evaluate(() => {
    const players = Array.from({ length: 20 }, (_, j) => ({
      id: `p${j}`, name: `Player ${j + 1}`,
    }));

    const snapshots = Array.from({ length: 52 }, (_, i) => ({
      id: `snap-${i}`,
      name: `Night ${i + 1}`,
      date: new Date(Date.now() - i * 86400000).toISOString(),
      archivedAt: Date.now() - i * 86400000,
      players,
      games: Array.from({ length: 200 }, (_, k) => ({
        id: `g${i}-${k}`,
        player1Id: `p${k % 20}`,
        player2Id: `p${(k + 1) % 20}`,
        winnerId: `p${k % 20}`,
        resultType: 'standard',
        cubeValue: 1,
        matchPoints: 1,
        timestamp: Date.now() - i * 86400000 - k * 1000,
        sequence: k + 1,
      })),
      finalStandings: players.map((p, idx) => ({
        rank: idx + 1,
        name: p.name,
        matchPoints: Math.max(0, 200 - idx * 10),
        wins: Math.max(0, 10 - idx),
        losses: idx,
      })),
      winnerName: 'Player 1',
      gameCount: 200,
    }));

    localStorage.setItem('backgammon:archive', JSON.stringify(snapshots));
    localStorage.setItem('backgammon:tournament', JSON.stringify({
      id: 'active', name: 'Active Night', date: new Date().toISOString(), status: 'active',
    }));
    localStorage.setItem('backgammon:players', '[]');
    localStorage.setItem('backgammon:matches', '[]');
  });
  await page.reload();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
});

test('T035 — Club tab renders 52 snapshots in <100ms', async ({ page }) => {
  await seedLargeArchive(page);

  // Warm up: navigate to club once so the ES module is cached
  await page.goto('/#/club');
  await expect(page.locator('.view--club')).toBeVisible();

  // Navigate away, then measure second render (cached module = pure DOM work)
  await page.goto('/#/live');
  await expect(page.locator('.view--live')).toBeVisible();

  const renderMs = await page.evaluate(() =>
    new Promise((resolve) => {
      const t0 = performance.now();
      window.location.hash = '#/club';
      const poll = () => {
        if (document.querySelector('.archive-list, [data-testid="archive-empty"]')) {
          resolve(performance.now() - t0);
        } else {
          requestAnimationFrame(poll);
        }
      };
      requestAnimationFrame(poll);
    }),
  );

  await expect(page.locator('.view--club')).toBeVisible();
  // Verify 52 items are rendered
  await expect(page.locator('.archive-item')).toHaveCount(52);

  expect(renderMs, `Club tab rendered in ${renderMs.toFixed(1)}ms (limit 100ms)`).toBeLessThan(100);
});

test('T035 — deriveAllTimeStandings computes 52 snapshots in <50ms', async ({ page }) => {
  await seedLargeArchive(page);

  // Navigate to club to ensure the app module graph is loaded
  await page.goto('/#/club');
  await expect(page.locator('.view--club')).toBeVisible();

  const computeMs = await page.evaluate(async () => {
    const { deriveAllTimeStandings } = await import('/src/models/allTimeStanding.js');
    const archive = JSON.parse(localStorage.getItem('backgammon:archive') || '[]');

    const t0 = performance.now();
    const standings = deriveAllTimeStandings(archive, null, [], []);
    const elapsed = performance.now() - t0;

    // Sanity check: 20 players across 52 tournaments
    if (standings.length !== 20) throw new Error(`Expected 20 standings, got ${standings.length}`);
    return elapsed;
  });

  expect(computeMs, `deriveAllTimeStandings took ${computeMs.toFixed(2)}ms (limit 50ms)`).toBeLessThan(50);
});

test('T035 — cleanup: large archive fixture is removable', async ({ page }) => {
  await seedLargeArchive(page);

  await page.evaluate(() => {
    localStorage.removeItem('backgammon:archive');
  });

  const archive = await page.evaluate(() => localStorage.getItem('backgammon:archive'));
  expect(archive).toBeNull();
});

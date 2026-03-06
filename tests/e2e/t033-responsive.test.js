import { test, expect } from '@playwright/test';

async function expectNoHorizontalScroll(page) {
  const hasScroll = await page.evaluate(
    () => document.body.scrollWidth > window.innerWidth + 1,
  );
  expect(hasScroll, 'Page should not have horizontal scroll').toBe(false);
}

async function seedActive(page, withArchive = false) {
  await page.evaluate((withArchive) => {
    const tournament = { id: 'tid', name: 'Test Night', date: new Date().toISOString(), status: 'active' };
    const players = [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }];
    const games = [{
      id: 'g1', player1Id: 'p1', player2Id: 'p2', winnerId: 'p1',
      resultType: 'standard', cubeValue: 1, matchPoints: 1,
      timestamp: Date.now(), sequence: 1,
    }];
    localStorage.setItem('backgammon:tournament', JSON.stringify(tournament));
    localStorage.setItem('backgammon:players', JSON.stringify(players));
    const matches = [{
      id: 'm1', player1Id: 'p1', player2Id: 'p2', targetScore: 7,
      status: 'active', winnerId: null, startedAt: Date.now() - 1000, completedAt: null,
      games,
    }];
    localStorage.setItem('backgammon:matches', JSON.stringify(matches));
    if (withArchive) {
      const archive = [{
        id: 'a1', name: 'Past Night', date: new Date(Date.now() - 86400000).toISOString(),
        archivedAt: Date.now() - 86400000, players, games,
        finalStandings: [
          { rank: 1, name: 'Alice', matchPoints: 1, wins: 1, losses: 0 },
          { rank: 2, name: 'Bob', matchPoints: 0, wins: 0, losses: 1 },
        ],
        winnerName: 'Alice', gameCount: 1,
      }];
      localStorage.setItem('backgammon:archive', JSON.stringify(archive));
    }
  }, withArchive);
  await page.reload();
}

for (const [label, width, height] of [['mobile', 375, 812], ['tablet', 768, 1024]]) {
  test.describe(`T033 — ${label} (${width}px)`, () => {
    test.use({ viewport: { width, height } });

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => localStorage.clear());
      await page.goto('/');
    });

    test('name prompt — no horizontal scroll', async ({ page }) => {
      await expect(page.locator('.name-prompt')).toBeVisible();
      await expectNoHorizontalScroll(page);
    });

    test('live view — no horizontal scroll', async ({ page }) => {
      await seedActive(page);
      await page.goto('/#/live');
      await expect(page.locator('.view--live')).toBeVisible();
      await expectNoHorizontalScroll(page);
    });

    test('club tab archive list — no horizontal scroll', async ({ page }) => {
      await seedActive(page, true);
      await page.goto('/#/club');
      await expect(page.locator('.view--club')).toBeVisible();
      await expectNoHorizontalScroll(page);
    });

    test('tournament detail view — no horizontal scroll', async ({ page }) => {
      await seedActive(page, true);
      await page.goto('/#/club');
      await page.locator('.archive-item').first().click();
      await expect(page.locator('.tournament-detail')).toBeVisible();
      await expectNoHorizontalScroll(page);
    });

    test('add-player submit button meets 44px touch target', async ({ page }) => {
      await seedActive(page);
      await page.goto('/#/live');
      await expect(page.locator('.view--live')).toBeVisible();
      // Open add-player form first
      await page.locator('[data-action="toggle-add-player"]').click();
      const box = await page.locator('#add-player-form button[type="submit"]').boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
    });

    test('end-tournament button meets 44px touch target', async ({ page }) => {
      await seedActive(page);
      await page.goto('/#/live');
      await expect(page.locator('.view--live')).toBeVisible();
      // Open hamburger menu to make button visible
      await page.locator('#hamburger-btn').click();
      const box = await page.locator('[data-action="end-tournament"]').boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
    });
  });
}

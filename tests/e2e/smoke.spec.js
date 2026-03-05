import { test, expect } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  // Clear localStorage and seed an active tournament so the router guard
  // does not redirect to #/start (the router guard is tested in us1 tests).
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('backgammon:tournament', JSON.stringify({
      id: 'smoke-tid', name: 'Smoke Test', date: new Date().toISOString(), status: 'active',
    }));
  });
  await page.reload();
});

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

test('loads and shows the Match Hub view by default', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/#\/players/);
  await expect(page.locator('.view--match-hub h2')).toContainText('Match Hub');
});

test('navigation links switch views', async ({ page }) => {
  await page.goto('/');

  await page.click('a[href="#/leaderboard"]');
  await expect(page.locator('h2')).toContainText('Leaderboard');

  await page.click('a[href="#/history"]');
  await expect(page.locator('h2')).toContainText('Game History');

  await page.click('a[href="#/club"]');
  await expect(page.locator('h2').first()).toContainText('All-Time');

  await page.click('a[href="#/players"]');
  await expect(page.locator('.view--match-hub h2')).toContainText('Match Hub');
});

// ---------------------------------------------------------------------------
// Player Management
// ---------------------------------------------------------------------------

test('can add a player', async ({ page }) => {
  await page.goto('/#/players');
  await page.fill('input[type="text"]', 'Alice');
  await page.click('button[type="submit"]');
  await expect(page.locator('.player-list')).toContainText('Alice');
});

test('shows error for duplicate player name', async ({ page }) => {
  await page.goto('/#/players');
  await page.fill('input[type="text"]', 'Alice');
  await page.click('button[type="submit"]');
  await page.fill('input[type="text"]', 'Alice');
  await page.click('button[type="submit"]');
  await expect(page.locator('[data-error]')).toBeVisible();
});

test('can remove a player with no matches', async ({ page }) => {
  await page.goto('/#/players');
  await page.fill('input[type="text"]', 'Alice');
  await page.click('button[type="submit"]');
  await page.click('[data-action="remove-player"]');
  await expect(page.locator('.player-list')).not.toBeVisible();
});

test('players persist after page reload', async ({ page }) => {
  await page.goto('/#/players');
  await page.fill('input[type="text"]', 'Alice');
  await page.click('button[type="submit"]');
  await page.fill('input[type="text"]', 'Bob');
  await page.locator('#add-player-form button[type="submit"]').click();

  await page.reload();
  await expect(page.locator('.player-list')).toContainText('Alice');
  await expect(page.locator('.player-list')).toContainText('Bob');
});

// ---------------------------------------------------------------------------
// Match Recording (Match Mode)
// ---------------------------------------------------------------------------

test.describe('Match Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const tournament = { id: 'tid', name: 'Test', date: new Date().toISOString(), status: 'active' };
      const players = [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ];
      localStorage.setItem('backgammon:tournament', JSON.stringify(tournament));
      localStorage.setItem('backgammon:players', JSON.stringify(players));
      localStorage.setItem('backgammon:matches', '[]');
    });
    await page.reload();
    await page.goto('/#/players');
  });

  test('can start a match between two players', async ({ page }) => {
    await page.locator('select[data-start-p1]').selectOption({ label: 'Alice' });
    await page.locator('select[data-start-p2]').selectOption({ label: 'Bob' });
    await page.locator('#start-match-form button[type="submit"]').click();
    await expect(page.locator('.match-card--active')).toBeVisible();
    await expect(page.locator('.match-card--active')).toContainText('Alice');
    await expect(page.locator('.match-card--active')).toContainText('Bob');
  });

  test('shows error when same player selected for both roles', async ({ page }) => {
    await page.locator('select[data-start-p1]').selectOption({ label: 'Alice' });
    await page.locator('select[data-start-p2]').selectOption({ label: 'Alice' });
    await page.locator('#start-match-form button[type="submit"]').click();
    await expect(page.locator('[data-match-error]')).toBeVisible();
  });

  test('records a game and score updates in match detail', async ({ page }) => {
    await page.locator('select[data-start-p1]').selectOption({ label: 'Alice' });
    await page.locator('select[data-start-p2]').selectOption({ label: 'Bob' });
    await page.locator('#start-match-form button[type="submit"]').click();
    await page.locator('.match-card--active button[data-action="enter-match"]').first().click();
    await expect(page.locator('.view--match')).toBeVisible();

    await page.locator('select[data-game-winner]').selectOption({ label: 'Alice' });
    await page.locator('button[data-action="record-game"]').click();

    // Alice's score should be 1 (standard × cube 1 = 1 pt)
    await expect(page.locator('[data-testid="score-p1"]')).toContainText('1');
  });
});

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

test.describe('Leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const tournament = { id: 'tid', name: 'Test', date: new Date().toISOString(), status: 'active' };
      const players = [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }];
      const matches = [{
        id: 'm1', player1Id: 'p1', player2Id: 'p2', targetScore: 8,
        status: 'complete', winnerId: 'p1',
        startedAt: Date.now() - 1000, completedAt: Date.now(),
        games: [{
          id: 'g1', player1Id: 'p1', player2Id: 'p2', winnerId: 'p1',
          resultType: 'gammon', cubeValue: 4, matchPoints: 8,
          timestamp: Date.now(), sequence: 1,
        }],
      }];
      localStorage.setItem('backgammon:tournament', JSON.stringify(tournament));
      localStorage.setItem('backgammon:players', JSON.stringify(players));
      localStorage.setItem('backgammon:matches', JSON.stringify(matches));
    });
    await page.reload();
    await page.goto('/#/leaderboard');
  });

  test('shows players ranked by match points', async ({ page }) => {
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toContainText('Alice');
    await expect(rows.first().locator('.pts-cell')).toContainText('8');
  });

  test('rank-1 row has visual distinction', async ({ page }) => {
    await expect(page.locator('tbody tr.rank-1')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Game History
// ---------------------------------------------------------------------------

test.describe('Game History', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const tournament = { id: 'tid', name: 'Test', date: new Date().toISOString(), status: 'active' };
      const players = [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }];
      const matches = [{
        id: 'm1', player1Id: 'p1', player2Id: 'p2', targetScore: 7,
        status: 'active', winnerId: null,
        startedAt: Date.now() - 1000, completedAt: null,
        games: [{
          id: 'g1', player1Id: 'p1', player2Id: 'p2', winnerId: 'p1',
          resultType: 'gammon', cubeValue: 4, matchPoints: 8,
          timestamp: Date.now(), sequence: 1,
        }],
      }];
      localStorage.setItem('backgammon:tournament', JSON.stringify(tournament));
      localStorage.setItem('backgammon:players', JSON.stringify(players));
      localStorage.setItem('backgammon:matches', JSON.stringify(matches));
    });
    await page.reload();
    await page.goto('/#/history');
  });

  test('shows match group with game entry', async ({ page }) => {
    await expect(page.locator('.match-group')).toBeVisible();
    await expect(page.locator('.history-item')).toBeVisible();
    await expect(page.locator('.history-item')).toContainText('8');
  });

  test('shows player names in match group header', async ({ page }) => {
    await expect(page.locator('.match-group-header')).toContainText('Alice');
    await expect(page.locator('.match-group-header')).toContainText('Bob');
  });
});

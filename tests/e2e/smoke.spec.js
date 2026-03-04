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

test('loads and shows the Players view by default', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/#\/players/);
  await expect(page.locator('h2')).toContainText('Players');
});

test('navigation links switch views', async ({ page }) => {
  await page.goto('/');

  await page.click('a[href="#/record"]');
  await expect(page.locator('h2')).toContainText('Record Game');

  await page.click('a[href="#/leaderboard"]');
  await expect(page.locator('h2')).toContainText('Leaderboard');

  await page.click('a[href="#/history"]');
  await expect(page.locator('h2')).toContainText('Game History');

  await page.click('a[href="#/club"]');
  await expect(page.locator('h2').first()).toContainText('All-Time');

  await page.click('a[href="#/players"]');
  await expect(page.locator('.view--players h2')).toContainText('Players');
});

// ---------------------------------------------------------------------------
// US1: Player Registration
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

test('can remove a player with no games', async ({ page }) => {
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
  await page.click('button[type="submit"]');

  await page.reload();
  await expect(page.locator('.player-list')).toContainText('Alice');
  await expect(page.locator('.player-list')).toContainText('Bob');
});

// ---------------------------------------------------------------------------
// US2: Record Game
// ---------------------------------------------------------------------------

test.describe('Record Game', () => {
  test.beforeEach(async ({ page }) => {
    // Set up two players via localStorage for speed
    await page.goto('/');
    await page.evaluate(() => {
      const tournament = { id: 'tid', name: 'Test', date: new Date().toISOString(), status: 'active' };
      const players = [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ];
      localStorage.setItem('backgammon:tournament', JSON.stringify(tournament));
      localStorage.setItem('backgammon:players', JSON.stringify(players));
      localStorage.setItem('backgammon:games', '[]');
    });
    // Reload so loadFromStorage() picks up the seeded data, then navigate via hash
    await page.reload();
    await page.goto('/#/record');
  });

  test('shows player dropdowns populated from state', async ({ page }) => {
    // <option> elements inside a closed <select> are not "visible" in Playwright;
    // use toContainText on the <select> itself to verify options are present.
    const p1Select = page.locator('select[data-player-select]').first();
    await expect(p1Select).toContainText('Alice');
    await expect(p1Select).toContainText('Bob');
  });

  test('records a standard game and awards 1 match point', async ({ page }) => {
    // Each <select data-player-select> lives in its own <div>, so :nth-of-type
    // won't cross parent boundaries — use Playwright's .nth() instead.
    await page.locator('select[data-player-select]').first().selectOption('p1');
    await page.locator('select[data-player-select]').nth(1).selectOption('p2');
    await page.selectOption('select[data-winner-select]', 'p1');

    await page.click('button[type="submit"]');

    // Navigate to leaderboard and verify Alice has 1 pt
    await page.click('a[href="#/leaderboard"]');
    const aliceRow = page.locator('tbody tr', { hasText: 'Alice' });
    await expect(aliceRow.locator('.pts-cell')).toContainText('1');
  });

  test('shows error when same player selected for both roles', async ({ page }) => {
    await page.locator('select[data-player-select]').first().selectOption('p1');
    await page.locator('select[data-player-select]').nth(1).selectOption('p1');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-error]')).toBeVisible();
  });

  test('cube value selector appears when toggle is enabled', async ({ page }) => {
    await expect(page.locator('[data-cube-values]')).toBeHidden();
    // The checkbox input is visually hidden by CSS; click its visible label instead.
    await page.click('label[for="cube-toggle"]');
    await expect(page.locator('[data-cube-values]')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// US3: Leaderboard
// ---------------------------------------------------------------------------

test.describe('Leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const tournament = { id: 'tid', name: 'Test', date: new Date().toISOString(), status: 'active' };
      const players = [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }];
      const games = [{
        id: 'g1', player1Id: 'p1', player2Id: 'p2', winnerId: 'p1',
        resultType: 'gammon', cubeValue: 4, matchPoints: 8,
        timestamp: Date.now(), sequence: 1,
      }];
      localStorage.setItem('backgammon:tournament', JSON.stringify(tournament));
      localStorage.setItem('backgammon:players', JSON.stringify(players));
      localStorage.setItem('backgammon:games', JSON.stringify(games));
    });
    // Reload so loadFromStorage() picks up the seeded data, then navigate via hash
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
// US4: Game History
// ---------------------------------------------------------------------------

test.describe('Game History', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const tournament = { id: 'tid', name: 'Test', date: new Date().toISOString(), status: 'active' };
      const players = [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }];
      const games = [{
        id: 'g1', player1Id: 'p1', player2Id: 'p2', winnerId: 'p1',
        resultType: 'gammon', cubeValue: 4, matchPoints: 8,
        timestamp: Date.now(), sequence: 1,
      }];
      localStorage.setItem('backgammon:tournament', JSON.stringify(tournament));
      localStorage.setItem('backgammon:players', JSON.stringify(players));
      localStorage.setItem('backgammon:games', JSON.stringify(games));
    });
    // Reload so loadFromStorage() picks up the seeded data, then navigate via hash
    await page.reload();
    await page.goto('/#/history');
  });

  test('shows game entry with match points', async ({ page }) => {
    await expect(page.locator('[data-game-id]')).toContainText('8 pts');
  });

  test('expands to show score breakdown on click', async ({ page }) => {
    await expect(page.locator('[data-breakdown]')).toBeHidden();
    await page.click('[data-summary]');
    await expect(page.locator('[data-breakdown]')).toBeVisible();
    await expect(page.locator('[data-breakdown]')).toContainText('Gammon × 4 = 8 pts');
  });

  test('filter hides non-matching games', async ({ page }) => {
    await page.fill('[data-filter-input]', 'Charlie');
    await expect(page.locator('[data-game-id]')).toBeHidden();
  });

  test('delete game removes it from history', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await page.click('[data-action="delete-game"]');
    await expect(page.locator('[data-game-id]')).not.toBeVisible();
  });
});

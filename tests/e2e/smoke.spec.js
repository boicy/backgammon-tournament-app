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

test('loads and shows the Live view by default', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/#\/live/);
  await expect(page.locator('.view--live')).toBeVisible();
});

test('navigation links switch views', async ({ page }) => {
  await page.goto('/');

  await page.click('a[href="#/leaderboard"]');
  await expect(page.locator('h2')).toContainText('Leaderboard');

  // History and Club are in the hamburger menu
  await page.locator('#hamburger-btn').click();
  await page.locator('a[href="#/history"]').click();
  await expect(page.locator('h2')).toContainText('Game History');

  await page.locator('#hamburger-btn').click();
  await page.locator('a[href="#/club"]').click();
  await expect(page.locator('h2').first()).toContainText('All-Time');

  await page.click('a[href="#/live"]');
  await expect(page.locator('.view--live')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Player Management
// ---------------------------------------------------------------------------

test('can add a player', async ({ page }) => {
  await page.goto('/#/live');
  await page.locator('[data-action="toggle-add-player"]').click();
  await page.locator('#player-name-input').fill('Alice');
  await page.locator('#add-player-form button[type="submit"]').click();
  await page.waitForTimeout(50);
  // Expand roster to verify player appears
  await page.locator('[data-action="toggle-roster"]').click();
  await expect(page.locator('.live-roster')).toContainText('Alice');
});

test('shows error for duplicate player name', async ({ page }) => {
  await page.goto('/#/live');
  // Add Alice once
  await page.locator('[data-action="toggle-add-player"]').click();
  await page.locator('#player-name-input').fill('Alice');
  await page.locator('#add-player-form button[type="submit"]').click();
  await page.waitForTimeout(50);
  // Try to add Alice again (form should re-open after collapse, or toggle again)
  await page.locator('[data-action="toggle-add-player"]').click();
  await page.locator('#player-name-input').fill('Alice');
  await page.locator('#add-player-form button[type="submit"]').click();
  await expect(page.locator('[data-error]')).toBeVisible();
});

test('can remove a player with no matches', async ({ page }) => {
  await page.goto('/#/live');
  await page.locator('[data-action="toggle-add-player"]').click();
  await page.locator('#player-name-input').fill('Alice');
  await page.locator('#add-player-form button[type="submit"]').click();
  await page.waitForTimeout(50);
  // Expand roster to see remove button
  await page.locator('[data-action="toggle-roster"]').click();
  await page.locator('[data-action="remove-player"]').click();
  await page.waitForTimeout(50);
  // Count should drop to 0
  await expect(page.locator('[data-action="toggle-roster"]')).toContainText('0 player');
});

test('players persist after page reload', async ({ page }) => {
  await page.goto('/#/live');
  await page.locator('[data-action="toggle-add-player"]').click();
  await page.locator('#player-name-input').fill('Alice');
  await page.locator('#add-player-form button[type="submit"]').click();
  await page.waitForTimeout(50);
  await page.locator('[data-action="toggle-add-player"]').click();
  await page.locator('#player-name-input').fill('Bob');
  await page.locator('#add-player-form button[type="submit"]').click();
  await page.waitForTimeout(50);

  await page.reload();
  // Expand roster to verify persistence
  await page.locator('[data-action="toggle-roster"]').click();
  await expect(page.locator('.live-roster')).toContainText('Alice');
  await expect(page.locator('.live-roster')).toContainText('Bob');
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
    await page.goto('/#/live');
  });

  test('can start a match between two players', async ({ page }) => {
    await page.locator('[data-action="toggle-new-match"]').click();
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Bob' }).click();
    await page.locator('#start-match-form button[type="submit"]').click();
    await expect(page.locator('.live-card--active')).toBeVisible();
    await expect(page.locator('.live-card--active')).toContainText('Alice');
    await expect(page.locator('.live-card--active')).toContainText('Bob');
  });

  test('same player cannot be picked twice — button becomes disabled', async ({ page }) => {
    await page.locator('[data-action="toggle-new-match"]').click();
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
    await expect(page.locator('[data-player-id]').filter({ hasText: 'Alice' })).toBeDisabled();
    // Collapse form to reset
    await page.locator('[data-action="toggle-new-match"]').click();
  });

  test('records a game and score updates inline on the card', async ({ page }) => {
    await page.locator('[data-action="toggle-new-match"]').click();
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Bob' }).click();
    await page.locator('#start-match-form button[type="submit"]').click();
    await page.waitForTimeout(50);

    const card = page.locator('.live-card--active').first();
    await card.locator('[data-action="record-game"]').click();
    await card.locator('[data-action="pick-winner"]').filter({ hasText: 'Alice' }).click();
    await card.locator('[data-action="submit-game"]').click();
    await page.waitForTimeout(50);

    // Alice's score should be 1 (standard × cube 1 = 1 pt)
    await expect(page.locator('[data-score-p1]')).toContainText('1');
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

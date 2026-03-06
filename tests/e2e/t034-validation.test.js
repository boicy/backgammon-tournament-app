import { test, expect } from '@playwright/test';

// Helpers
async function startTournament(page, name) {
  await expect(page.locator('.name-prompt')).toBeVisible();
  await page.locator('.name-prompt input[type="text"]').fill(name);
  await page.locator('.name-prompt button[type="submit"]').click();
  await expect(page.locator('.view--live')).toBeVisible();
}

async function addPlayer(page, name) {
  await page.locator('[data-action="toggle-add-player"]').click();
  await page.locator('#player-name-input').fill(name);
  await page.locator('#add-player-form button[type="submit"]').click();
  await page.waitForTimeout(50);
}

async function recordGame(page, winnerName, loserName) {
  // Expand new-match form if needed
  const expanded = await page.locator('.live-new-match--expanded').isVisible().catch(() => false);
  if (!expanded) await page.locator('[data-action="toggle-new-match"]').click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: winnerName }).click();
  await page.locator('[data-action="pick-player"]').filter({ hasText: loserName }).click();
  await page.locator('input[data-start-target]').fill('1');
  await page.locator('#start-match-form button[type="submit"]').click();
  await page.waitForTimeout(50);
  const card = page.locator('.live-card--active').first();
  await card.locator('[data-action="record-game"]').click();
  await card.locator('[data-game-winner]').selectOption({ label: winnerName });
  await card.locator('[data-action="submit-game"]').click();
  await page.waitForTimeout(50);
}

async function endTournament(page) {
  page.once('dialog', (d) => d.accept());
  await page.locator('#hamburger-btn').click();
  await page.locator('[data-action="end-tournament"]').click();
  await expect(page.locator('.name-prompt')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
});

// ---------------------------------------------------------------------------
// US4 gaps: scenarios not covered by us4-all-time-leaderboard.test.js
// ---------------------------------------------------------------------------

test('T034 — player who wins both tournaments shows 2 tournament wins', async ({ page }) => {
  // Night 1: Alice wins
  await startTournament(page, 'Night 1');
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');
  await recordGame(page, 'Alice', 'Bob');
  await endTournament(page);

  // Night 2: Alice wins again
  await startTournament(page, 'Night 2');
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');
  await recordGame(page, 'Alice', 'Bob');
  await endTournament(page);

  await startTournament(page, 'Night 3');
  await page.goto('/#/club');

  const aliceRow = page.locator('.all-time-table tbody tr').first();
  await expect(aliceRow).toContainText('Alice');
  await expect(aliceRow.locator('.wins-cell')).toContainText('2');
});

test('T034 — tied tournament wins ranked by higher cumulative match points', async ({ page }) => {
  // Seed two archives: Alice 1 win + 3 pts, Bob 1 win + 5 pts
  // Both have 1 win — Bob should rank first (more points)
  await page.evaluate(() => {
    const archive = [
      {
        id: 'a1', name: 'Night 1', date: new Date(Date.now() - 172800000).toISOString(),
        archivedAt: Date.now() - 172800000,
        players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
        games: [],
        finalStandings: [
          { rank: 1, name: 'Alice', matchPoints: 3, wins: 3, losses: 0 },
          { rank: 2, name: 'Bob', matchPoints: 0, wins: 0, losses: 3 },
        ],
        winnerName: 'Alice', gameCount: 3,
      },
      {
        id: 'a2', name: 'Night 2', date: new Date(Date.now() - 86400000).toISOString(),
        archivedAt: Date.now() - 86400000,
        players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
        games: [],
        finalStandings: [
          { rank: 1, name: 'Bob', matchPoints: 5, wins: 5, losses: 0 },
          { rank: 2, name: 'Alice', matchPoints: 0, wins: 0, losses: 5 },
        ],
        winnerName: 'Bob', gameCount: 5,
      },
    ];
    localStorage.setItem('backgammon:archive', JSON.stringify(archive));
    localStorage.setItem('backgammon:tournament', JSON.stringify({
      id: 'tid', name: 'Night 3', date: new Date().toISOString(), status: 'active',
    }));
    localStorage.setItem('backgammon:players', '[]');
    localStorage.setItem('backgammon:matches', '[]');
  });
  await page.reload();
  await page.goto('/#/club');

  // Both have 1 win — Bob has 5 pts total, Alice has 3 pts total
  const rows = page.locator('.all-time-table tbody tr');
  await expect(rows.first()).toContainText('Bob');
  await expect(rows.nth(1)).toContainText('Alice');
});

test('T034 — tournamentsPlayed counts only tournaments the player participated in', async ({ page }) => {
  // Night 1: Alice and Bob
  await startTournament(page, 'Night 1');
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');
  await recordGame(page, 'Alice', 'Bob');
  await endTournament(page);

  // Night 2: Alice and Charlie (Bob absent)
  await startTournament(page, 'Night 2');
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Charlie');
  await recordGame(page, 'Alice', 'Charlie');
  await endTournament(page);

  await startTournament(page, 'Night 3');
  await page.goto('/#/club');

  // 5th column (index 4) is tournamentsPlayed
  const aliceRow = page.locator('.all-time-table tbody tr', { hasText: 'Alice' });
  const bobRow = page.locator('.all-time-table tbody tr', { hasText: 'Bob' });
  const charlieRow = page.locator('.all-time-table tbody tr', { hasText: 'Charlie' });

  await expect(aliceRow.locator('td').nth(4)).toContainText('2');
  await expect(bobRow.locator('td').nth(4)).toContainText('1');
  await expect(charlieRow.locator('td').nth(4)).toContainText('1');
});

// ---------------------------------------------------------------------------
// US5 gap: selecting a datalist suggestion adds the player
// ---------------------------------------------------------------------------

test('T034 — datalist suggestion fills the input and submits correctly', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('backgammon:roster', JSON.stringify(['Alice', 'Bob']));
    localStorage.setItem('backgammon:tournament', JSON.stringify({
      id: 'tid', name: 'Test Night', date: new Date().toISOString(), status: 'active',
    }));
    localStorage.setItem('backgammon:players', '[]');
    localStorage.setItem('backgammon:matches', '[]');
  });
  // Use full navigation so main.js re-reads seeded localStorage into the store.
  await page.goto('/');
  await expect(page.locator('.view--live')).toBeVisible();

  // Open add-player form and type partial name
  await page.locator('[data-action="toggle-add-player"]').click();
  await page.locator('#player-name-input').fill('Ali');
  // Programmatically set full value (simulates selecting datalist option)
  await page.locator('#player-name-input').fill('Alice');
  await page.locator('#add-player-form button[type="submit"]').click();
  await page.waitForTimeout(50);

  // Roster should show Alice
  await page.locator('[data-action="toggle-roster"]').click();
  await expect(page.locator('.live-roster')).toContainText('Alice');
  // Input should be collapsed after submit
  await expect(page.locator('#player-name-input')).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// localStorage inspection after archiving
// ---------------------------------------------------------------------------

test('T034 — localStorage has correct keys after archiving a tournament', async ({ page }) => {
  await startTournament(page, 'Test Night');
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');
  await recordGame(page, 'Alice', 'Bob');
  await endTournament(page);

  const storage = await page.evaluate(() => ({
    archive: JSON.parse(localStorage.getItem('backgammon:archive') || '[]'),
    roster: JSON.parse(localStorage.getItem('backgammon:roster') || '[]'),
    tournament: localStorage.getItem('backgammon:tournament'),
    players: localStorage.getItem('backgammon:players'),
    matches: localStorage.getItem('backgammon:matches'),
  }));

  // Active tournament cleared
  expect(storage.tournament).toBeNull();
  expect(storage.players).toBeNull();
  expect(storage.matches).toBeNull();

  // Archive has 1 entry
  expect(storage.archive).toHaveLength(1);
  expect(storage.archive[0].name).toBe('Test Night');
  expect(storage.archive[0].gameCount).toBe(1);
  expect(storage.archive[0].winnerName).toBe('Alice');

  // Roster has both players
  expect(storage.roster).toContain('Alice');
  expect(storage.roster).toContain('Bob');
});

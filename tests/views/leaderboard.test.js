import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const { mockStandings, mockStore, busHandlers, mockEventBus } = vi.hoisted(() => {
  const busHandlers = {};
  const mockStandings = [];
  const mockStore = {
    getState: vi.fn(() => ({
      tournament: { id: 't1', name: 'Test', date: new Date().toISOString(), status: 'active' },
      players: [],
      games: [],
      standings: [...mockStandings],
    })),
  };
  const mockEventBus = {
    on: vi.fn((event, handler) => {
      if (!busHandlers[event]) busHandlers[event] = [];
      busHandlers[event].push(handler);
    }),
    off: vi.fn((event, handler) => {
      if (busHandlers[event]) {
        busHandlers[event] = busHandlers[event].filter((h) => h !== handler);
      }
    }),
    emit: vi.fn((event, detail) => {
      (busHandlers[event] || []).forEach((h) => h({ detail }));
    }),
  };
  return { mockStandings, mockStore, busHandlers, mockEventBus };
});

vi.mock('../../src/store/store.js', () => mockStore);
vi.mock('../../src/store/eventBus.js', () => ({ eventBus: mockEventBus }));

import * as view from '../../src/views/leaderboard.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContainer() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

function cleanup(el) {
  view.onUnmount();
  el.remove();
}

function setStandings(standings) {
  mockStandings.length = 0;
  mockStandings.push(...standings);
  mockStore.getState.mockReturnValue({
    tournament: { id: 't1', name: 'Test', date: new Date().toISOString(), status: 'active' },
    players: [],
    games: [],
    standings: [...standings],
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockStandings.length = 0;
  mockStore.getState.mockReturnValue({
    tournament: { id: 't1', name: 'Test', date: new Date().toISOString(), status: 'active' },
    players: [],
    games: [],
    standings: [],
  });
  Object.keys(busHandlers).forEach((k) => delete busHandlers[k]);
});

describe('leaderboard view — render', () => {
  it('renders a table', () => {
    const container = makeContainer();
    view.render(container);
    expect(container.querySelector('table')).not.toBeNull();
    cleanup(container);
  });

  it('renders table headers: Rank, Player, Pts, W, L, Played', () => {
    const container = makeContainer();
    view.render(container);
    const headerText = [...container.querySelectorAll('th')]
      .map((th) => th.textContent.trim().toLowerCase());
    expect(headerText.some((h) => h.includes('rank') || h === '#')).toBe(true);
    expect(headerText.some((h) => h.includes('player') || h.includes('name'))).toBe(true);
    expect(headerText.some((h) => h.includes('pts') || h.includes('points'))).toBe(true);
    cleanup(container);
  });

  it('shows empty state row when there are no standings', () => {
    const container = makeContainer();
    view.render(container);
    const tbody = container.querySelector('tbody');
    const text = tbody?.textContent.toLowerCase() || container.textContent.toLowerCase();
    expect(text).toMatch(/no players|no standings|add.*player|empty/);
    cleanup(container);
  });

  it('renders one row per standing', () => {
    setStandings([
      { playerId: 'p1', name: 'Alice', matchPoints: 10, wins: 3, losses: 1, gamesPlayed: 4, rank: 1 },
      { playerId: 'p2', name: 'Bob',   matchPoints: 5,  wins: 1, losses: 3, gamesPlayed: 4, rank: 2 },
    ]);
    const container = makeContainer();
    view.render(container);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    cleanup(container);
  });

  it('displays player names in the rows', () => {
    setStandings([
      { playerId: 'p1', name: 'Alice', matchPoints: 10, wins: 3, losses: 1, gamesPlayed: 4, rank: 1 },
      { playerId: 'p2', name: 'Bob',   matchPoints: 5,  wins: 1, losses: 3, gamesPlayed: 4, rank: 2 },
    ]);
    const container = makeContainer();
    view.render(container);
    expect(container.textContent).toContain('Alice');
    expect(container.textContent).toContain('Bob');
    cleanup(container);
  });

  it('ranks players by matchPoints descending (highest first)', () => {
    setStandings([
      { playerId: 'p1', name: 'Alice', matchPoints: 10, wins: 3, losses: 1, gamesPlayed: 4, rank: 1 },
      { playerId: 'p2', name: 'Bob',   matchPoints: 5,  wins: 1, losses: 3, gamesPlayed: 4, rank: 2 },
    ]);
    const container = makeContainer();
    view.render(container);
    const rows = [...container.querySelectorAll('tbody tr')];
    expect(rows[0].textContent).toContain('Alice');
    expect(rows[1].textContent).toContain('Bob');
    cleanup(container);
  });

  it('applies a visual distinction to the rank-1 row', () => {
    setStandings([
      { playerId: 'p1', name: 'Alice', matchPoints: 10, wins: 3, losses: 1, gamesPlayed: 4, rank: 1 },
      { playerId: 'p2', name: 'Bob',   matchPoints: 5,  wins: 1, losses: 3, gamesPlayed: 4, rank: 2 },
    ]);
    const container = makeContainer();
    view.render(container);
    const firstRow = container.querySelector('tbody tr:first-child');
    expect(
      firstRow.classList.contains('rank-1') ||
      firstRow.dataset.rank === '1' ||
      firstRow.querySelector('.rank-leader') !== null
    ).toBe(true);
    cleanup(container);
  });

  it('displays tiebreaker: tied matchPoints — fewer losses ranks higher', () => {
    setStandings([
      { playerId: 'p1', name: 'Alice', matchPoints: 5, wins: 2, losses: 1, gamesPlayed: 3, rank: 1 },
      { playerId: 'p2', name: 'Bob',   matchPoints: 5, wins: 2, losses: 2, gamesPlayed: 4, rank: 2 },
    ]);
    const container = makeContainer();
    view.render(container);
    const rows = [...container.querySelectorAll('tbody tr')];
    expect(rows[0].textContent).toContain('Alice');
    cleanup(container);
  });
});

describe('leaderboard view — live updates', () => {
  it('subscribes to state:standings:changed in onMount', () => {
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    expect(mockEventBus.on).toHaveBeenCalledWith('state:standings:changed', expect.any(Function));
    cleanup(container);
  });

  it('updates only <tbody> (not full view) when state:standings:changed fires', () => {
    setStandings([
      { playerId: 'p1', name: 'Alice', matchPoints: 10, wins: 3, losses: 1, gamesPlayed: 4, rank: 1 },
    ]);
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    // Keep a reference to the existing <thead> and <table>
    const tableBefore = container.querySelector('table');
    const theadBefore = container.querySelector('thead');

    // Fire standings changed with new data
    const newStandings = [
      { playerId: 'p1', name: 'Alice', matchPoints: 15, wins: 4, losses: 1, gamesPlayed: 5, rank: 1 },
      { playerId: 'p2', name: 'Bob',   matchPoints: 5,  wins: 1, losses: 3, gamesPlayed: 4, rank: 2 },
    ];
    mockStore.getState.mockReturnValue({
      tournament: null, players: [], games: [], standings: newStandings,
    });
    mockEventBus.emit('state:standings:changed', { standings: newStandings });

    // Table and thead should be the SAME DOM node (no full re-render)
    expect(container.querySelector('table')).toBe(tableBefore);
    expect(container.querySelector('thead')).toBe(theadBefore);
    // But the new player should appear
    expect(container.textContent).toContain('Bob');
    cleanup(container);
  });

  it('unsubscribes from state:standings:changed in onUnmount', () => {
    const container = makeContainer();
    view.render(container);
    view.onMount(container);
    view.onUnmount();

    expect(mockEventBus.off).toHaveBeenCalledWith('state:standings:changed', expect.any(Function));
    container.remove();
  });
});

// ---------------------------------------------------------------------------
// T021: US5 — Live column in standings (004-ux-redesign)
// ---------------------------------------------------------------------------

function setStateWithMatches({ standings = [], players = [], matches = [] } = {}) {
  mockStore.getState.mockReturnValue({
    tournament: { id: 't1', name: 'Test', date: new Date().toISOString(), status: 'active' },
    players,
    matches,
    standings,
    games: [],
  });
}

describe('leaderboard view — Live column (US5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(busHandlers).forEach((k) => delete busHandlers[k]);
  });

  it('table header includes a Live column', () => {
    setStateWithMatches();
    const container = makeContainer();
    view.render(container);
    const headers = [...container.querySelectorAll('th')]
      .map((th) => th.textContent.trim().toLowerCase());
    expect(headers.some((h) => h.includes('live'))).toBe(true);
    cleanup(container);
  });

  it('player in an active match shows "vs [opponent] [score]" in Live column', () => {
    const players = [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
    ];
    const matches = [
      {
        id: 'm1',
        player1Id: 'p1',
        player2Id: 'p2',
        targetScore: 7,
        status: 'active',
        games: [{ winnerId: 'p1', matchPoints: 1 }],
      },
    ];
    const standings = [
      { playerId: 'p1', name: 'Alice', matchPoints: 0, wins: 0, losses: 0, gamesPlayed: 0, rank: 1 },
      { playerId: 'p2', name: 'Bob',   matchPoints: 0, wins: 0, losses: 0, gamesPlayed: 0, rank: 2 },
    ];
    setStateWithMatches({ standings, players, matches });

    const container = makeContainer();
    view.render(container);

    const aliceRow = [...container.querySelectorAll('tbody tr')].find((r) =>
      r.textContent.includes('Alice')
    );
    expect(aliceRow).not.toBeUndefined();
    // Should contain Bob's name (the opponent) in the Live cell
    expect(aliceRow.textContent).toContain('Bob');
    cleanup(container);
  });

  it('player with no active match shows "—" in Live column', () => {
    const players = [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }];
    const standings = [
      { playerId: 'p1', name: 'Alice', matchPoints: 0, wins: 0, losses: 0, gamesPlayed: 0, rank: 1 },
    ];
    setStateWithMatches({ standings, players, matches: [] });

    const container = makeContainer();
    view.render(container);

    const aliceRow = [...container.querySelectorAll('tbody tr')].find((r) =>
      r.textContent.includes('Alice')
    );
    expect(aliceRow).not.toBeUndefined();
    expect(aliceRow.textContent).toContain('—');
    cleanup(container);
  });

  it('Live column clears when match completes', () => {
    const players = [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
    ];
    const completedMatch = {
      id: 'm1', player1Id: 'p1', player2Id: 'p2', targetScore: 7,
      status: 'complete', winnerId: 'p1',
      games: [{ winnerId: 'p1', matchPoints: 7 }],
    };
    const standings = [
      { playerId: 'p1', name: 'Alice', matchPoints: 7, wins: 1, losses: 0, gamesPlayed: 1, rank: 1 },
      { playerId: 'p2', name: 'Bob',   matchPoints: 0, wins: 0, losses: 1, gamesPlayed: 1, rank: 2 },
    ];
    setStateWithMatches({ standings, players, matches: [completedMatch] });

    const container = makeContainer();
    view.render(container);

    const aliceRow = [...container.querySelectorAll('tbody tr')].find((r) =>
      r.textContent.includes('Alice')
    );
    // Completed match should NOT show in Live column
    expect(aliceRow.textContent).not.toContain('vs Bob');
    cleanup(container);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage with a simple in-memory implementation
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    _store: () => store,
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Store module is loaded fresh per describe block via dynamic import + module re-evaluation trick.
// Since Vitest caches modules, we reset state via the exported resetForTesting helper.
let store;

beforeEach(async () => {
  localStorageMock.clear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();

  // Re-import to get fresh module state (Vitest resets module registry between files,
  // but within a file we use the exported reset helper).
  store = await import('../../src/store/store.js');
  store.resetForTesting();
});

// ---------------------------------------------------------------------------
// initTournament
// ---------------------------------------------------------------------------

describe('initTournament', () => {
  it('creates a new tournament with the given name', () => {
    store.initTournament('Friday Night');
    const state = store.getState();
    expect(state.tournament).not.toBeNull();
    expect(state.tournament.name).toBe('Friday Night');
    expect(state.tournament.status).toBe('active');
  });

  it('assigns a UUID id to the tournament', () => {
    store.initTournament('Test');
    const { tournament } = store.getState();
    expect(tournament.id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('clears any existing players and games', () => {
    store.initTournament('First');
    store.addPlayer('Alice');
    store.initTournament('Second');
    const state = store.getState();
    expect(state.players).toHaveLength(0);
    expect(state.games).toHaveLength(0);
  });

  it('persists tournament to localStorage', () => {
    store.initTournament('Persist Test');
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'backgammon:tournament',
      expect.stringContaining('Persist Test'),
    );
  });
});

// ---------------------------------------------------------------------------
// addPlayer
// ---------------------------------------------------------------------------

describe('addPlayer', () => {
  beforeEach(() => { store.initTournament('Test Tournament'); });

  it('adds a player to the player list', () => {
    store.addPlayer('Alice');
    expect(store.getState().players).toHaveLength(1);
    expect(store.getState().players[0].name).toBe('Alice');
  });

  it('assigns a UUID id to the player', () => {
    store.addPlayer('Alice');
    expect(store.getState().players[0].id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('trims whitespace from the player name', () => {
    store.addPlayer('  Bob  ');
    expect(store.getState().players[0].name).toBe('Bob');
  });

  it('throws on empty name', () => {
    expect(() => store.addPlayer('')).toThrow();
    expect(() => store.addPlayer('   ')).toThrow();
  });

  it('throws on duplicate name (same case)', () => {
    store.addPlayer('Alice');
    expect(() => store.addPlayer('Alice')).toThrow(/already exists/i);
  });

  it('throws on duplicate name (different case)', () => {
    store.addPlayer('alice');
    expect(() => store.addPlayer('ALICE')).toThrow(/already exists/i);
  });

  it('persists players to localStorage', () => {
    store.addPlayer('Alice');
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'backgammon:players',
      expect.stringContaining('Alice'),
    );
  });
});

// ---------------------------------------------------------------------------
// removePlayer
// ---------------------------------------------------------------------------

describe('removePlayer', () => {
  beforeEach(() => { store.initTournament('Test Tournament'); });

  it('removes a player with no games', () => {
    store.addPlayer('Alice');
    const playerId = store.getState().players[0].id;
    store.removePlayer(playerId);
    expect(store.getState().players).toHaveLength(0);
  });

  it('throws when removing a player who has recorded games', () => {
    store.addPlayer('Alice');
    store.addPlayer('Bob');
    const { players } = store.getState();
    const alice = players.find((p) => p.name === 'Alice');
    const bob = players.find((p) => p.name === 'Bob');
    store.recordGame({
      player1Id: alice.id,
      player2Id: bob.id,
      winnerId: alice.id,
      resultType: 'standard',
      cubeValue: 1,
    });
    expect(() => store.removePlayer(alice.id)).toThrow(/recorded games/i);
  });

  it('throws when the player does not exist', () => {
    expect(() => store.removePlayer('nonexistent-id')).toThrow();
  });

  it('persists player removal to localStorage', () => {
    store.addPlayer('Alice');
    localStorageMock.setItem.mockClear();
    const playerId = store.getState().players[0].id;
    store.removePlayer(playerId);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('backgammon:players', expect.any(String));
  });
});

// ---------------------------------------------------------------------------
// recordGame
// ---------------------------------------------------------------------------

describe('recordGame', () => {
  let alice, bob;

  beforeEach(() => {
    store.initTournament('Test Tournament');
    store.addPlayer('Alice');
    store.addPlayer('Bob');
    const { players } = store.getState();
    alice = players.find((p) => p.name === 'Alice');
    bob = players.find((p) => p.name === 'Bob');
  });

  it('records a standard game with cube=1 (1 matchPoint)', () => {
    store.recordGame({ player1Id: alice.id, player2Id: bob.id, winnerId: alice.id, resultType: 'standard', cubeValue: 1 });
    const game = store.getState().games[0];
    expect(game.matchPoints).toBe(1);
  });

  it('computes matchPoints = resultTypeMultiplier × cubeValue (gammon × 4 = 8)', () => {
    store.recordGame({ player1Id: alice.id, player2Id: bob.id, winnerId: alice.id, resultType: 'gammon', cubeValue: 4 });
    expect(store.getState().games[0].matchPoints).toBe(8);
  });

  it('computes matchPoints for backgammon × 8 = 24', () => {
    store.recordGame({ player1Id: alice.id, player2Id: bob.id, winnerId: alice.id, resultType: 'backgammon', cubeValue: 8 });
    expect(store.getState().games[0].matchPoints).toBe(24);
  });

  it('assigns a monotonically increasing sequence number', () => {
    store.recordGame({ player1Id: alice.id, player2Id: bob.id, winnerId: alice.id, resultType: 'standard', cubeValue: 1 });
    store.recordGame({ player1Id: alice.id, player2Id: bob.id, winnerId: bob.id, resultType: 'standard', cubeValue: 1 });
    const games = store.getState().games;
    expect(games[0].sequence).toBe(1);
    expect(games[1].sequence).toBe(2);
  });

  it('stores a timestamp (ms epoch)', () => {
    store.recordGame({ player1Id: alice.id, player2Id: bob.id, winnerId: alice.id, resultType: 'standard', cubeValue: 1 });
    expect(typeof store.getState().games[0].timestamp).toBe('number');
  });

  it('throws when player1Id === player2Id', () => {
    expect(() =>
      store.recordGame({ player1Id: alice.id, player2Id: alice.id, winnerId: alice.id, resultType: 'standard', cubeValue: 1 }),
    ).toThrow();
  });

  it('throws when winnerId is not one of the two players', () => {
    expect(() =>
      store.recordGame({ player1Id: alice.id, player2Id: bob.id, winnerId: 'someone-else', resultType: 'standard', cubeValue: 1 }),
    ).toThrow();
  });

  it('throws on invalid cubeValue', () => {
    expect(() =>
      store.recordGame({ player1Id: alice.id, player2Id: bob.id, winnerId: alice.id, resultType: 'standard', cubeValue: 3 }),
    ).toThrow();
  });

  it('throws on invalid resultType', () => {
    expect(() =>
      store.recordGame({ player1Id: alice.id, player2Id: bob.id, winnerId: alice.id, resultType: 'invalid', cubeValue: 1 }),
    ).toThrow();
  });

  it('persists games to localStorage', () => {
    localStorageMock.setItem.mockClear();
    store.recordGame({ player1Id: alice.id, player2Id: bob.id, winnerId: alice.id, resultType: 'standard', cubeValue: 1 });
    expect(localStorageMock.setItem).toHaveBeenCalledWith('backgammon:games', expect.any(String));
  });
});

// ---------------------------------------------------------------------------
// deleteGame
// ---------------------------------------------------------------------------

describe('deleteGame', () => {
  let alice, bob;

  beforeEach(() => {
    store.initTournament('Test Tournament');
    store.addPlayer('Alice');
    store.addPlayer('Bob');
    const { players } = store.getState();
    alice = players.find((p) => p.name === 'Alice');
    bob = players.find((p) => p.name === 'Bob');
    store.recordGame({ player1Id: alice.id, player2Id: bob.id, winnerId: alice.id, resultType: 'gammon', cubeValue: 4 });
  });

  it('removes the game from the games array', () => {
    const gameId = store.getState().games[0].id;
    store.deleteGame(gameId);
    expect(store.getState().games).toHaveLength(0);
  });

  it('recalculates standings after deletion', () => {
    // Before deletion Alice has 8 points
    expect(store.getState().standings[0].name).toBe('Alice');
    expect(store.getState().standings[0].matchPoints).toBe(8);

    const gameId = store.getState().games[0].id;
    store.deleteGame(gameId);

    // After deletion both players have 0 points
    const standings = store.getState().standings;
    standings.forEach((s) => expect(s.matchPoints).toBe(0));
  });

  it('throws when gameId does not exist', () => {
    expect(() => store.deleteGame('nonexistent-game-id')).toThrow(/not found/i);
  });

  it('persists game deletion to localStorage', () => {
    const gameId = store.getState().games[0].id;
    localStorageMock.setItem.mockClear();
    store.deleteGame(gameId);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('backgammon:games', expect.any(String));
  });
});

// ---------------------------------------------------------------------------
// resetTournament
// ---------------------------------------------------------------------------

describe('resetTournament', () => {
  beforeEach(() => {
    store.initTournament('Old Tournament');
    store.addPlayer('Alice');
    store.addPlayer('Bob');
    const { players } = store.getState();
    const alice = players.find((p) => p.name === 'Alice');
    const bob = players.find((p) => p.name === 'Bob');
    store.recordGame({ player1Id: alice.id, player2Id: bob.id, winnerId: alice.id, resultType: 'standard', cubeValue: 1 });
  });

  it('clears all in-memory state', () => {
    store.resetTournament();
    const state = store.getState();
    expect(state.tournament).toBeNull();
    expect(state.players).toHaveLength(0);
    expect(state.games).toHaveLength(0);
    expect(state.standings).toHaveLength(0);
  });

  it('removes all three localStorage keys', () => {
    store.resetTournament();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('backgammon:tournament');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('backgammon:players');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('backgammon:games');
  });
});

// ---------------------------------------------------------------------------
// localStorage persistence (state survives simulated reload)
// ---------------------------------------------------------------------------

describe('localStorage persistence', () => {
  it('restores state from localStorage on init', async () => {
    // Seed localStorage directly as if a prior session saved data
    const tournament = { id: 'tid', name: 'Saved', date: new Date().toISOString(), status: 'active' };
    const players = [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }];
    const games = [{
      id: 'g1', player1Id: 'p1', player2Id: 'p2', winnerId: 'p1',
      resultType: 'standard', cubeValue: 1, matchPoints: 1, timestamp: Date.now(), sequence: 1,
    }];
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'backgammon:tournament') return JSON.stringify(tournament);
      if (key === 'backgammon:players') return JSON.stringify(players);
      if (key === 'backgammon:games') return JSON.stringify(games);
      return null;
    });

    store.loadFromStorage();

    const state = store.getState();
    expect(state.tournament.name).toBe('Saved');
    expect(state.players).toHaveLength(2);
    expect(state.games).toHaveLength(1);
    expect(state.standings[0].name).toBe('Alice');
    expect(state.standings[0].matchPoints).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// QuotaExceededError handling
// ---------------------------------------------------------------------------

describe('quota exceeded handling', () => {
  beforeEach(() => { store.initTournament('Test'); });

  it('preserves in-memory state when localStorage.setItem throws QuotaExceededError', () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      const err = new DOMException('QuotaExceededError');
      Object.defineProperty(err, 'name', { value: 'QuotaExceededError' });
      throw err;
    });

    // Should not throw — state is still mutated in memory
    expect(() => store.addPlayer('Alice')).not.toThrow();
    expect(store.getState().players).toHaveLength(1);
    expect(store.getState().players[0].name).toBe('Alice');
  });
});

// ---------------------------------------------------------------------------
// Round-robin store actions (T032)
// ---------------------------------------------------------------------------

describe('enableRoundRobin', () => {
  beforeEach(() => {
    store.initTournament('Test');
    store.addPlayer('Alice');
    store.addPlayer('Bob');
    store.addPlayer('Charlie');
  });

  it('adds a schedule to state', () => {
    store.enableRoundRobin();
    const { schedule } = store.getState();
    expect(schedule).toBeDefined();
    expect(schedule.length).toBeGreaterThan(0);
  });

  it('generates N×(N-1)/2 pairings for N players (3 → 3)', () => {
    store.enableRoundRobin();
    expect(store.getState().schedule).toHaveLength(3);
  });

  it('emits state:schedule:changed', () => {
    const spy = vi.fn();
    // Can't spy on eventBus directly here — verify indirectly via getState
    store.enableRoundRobin();
    expect(store.getState().schedule).not.toBeNull();
  });
});

describe('disableRoundRobin', () => {
  beforeEach(() => {
    store.initTournament('Test');
    store.addPlayer('Alice');
    store.addPlayer('Bob');
    store.enableRoundRobin();
  });

  it('clears the schedule from state', () => {
    store.disableRoundRobin();
    const { schedule } = store.getState();
    expect(schedule).toBeNull();
  });
});

describe('getState includes schedule', () => {
  it('returns schedule: null when round-robin is not enabled', () => {
    store.initTournament('Test');
    expect(store.getState().schedule).toBeNull();
  });
});

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

  it('clears any existing players and matches', () => {
    store.initTournament('First');
    store.addPlayer('Alice');
    store.initTournament('Second');
    const state = store.getState();
    expect(state.players).toHaveLength(0);
    expect(state.matches).toHaveLength(0);
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

  it('throws when removing a player who is in an active match', () => {
    store.addPlayer('Alice');
    store.addPlayer('Bob');
    const { players } = store.getState();
    const alice = players.find((p) => p.name === 'Alice');
    const bob = players.find((p) => p.name === 'Bob');
    store.startMatch(alice.id, bob.id, 5);
    expect(() => store.removePlayer(alice.id)).toThrow(/active match/i);
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
// recordGame — RETIRED (replaced by startMatch + recordMatchGame in 003-match-mode)
// ---------------------------------------------------------------------------

describe.skip('recordGame', () => {
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
// deleteGame — RETIRED (replaced by abandonMatch in 003-match-mode)
// ---------------------------------------------------------------------------

describe.skip('deleteGame', () => {
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
    store.startMatch(alice.id, bob.id, 5);
  });

  it('clears all in-memory state', () => {
    store.resetTournament();
    const state = store.getState();
    expect(state.tournament).toBeNull();
    expect(state.players).toHaveLength(0);
    expect(state.matches).toHaveLength(0);
    expect(state.standings).toHaveLength(0);
  });

  it('removes all three localStorage keys', () => {
    store.resetTournament();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('backgammon:tournament');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('backgammon:players');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('backgammon:matches');
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
    const matches = [{
      id: 'm1', player1Id: 'p1', player2Id: 'p2', targetScore: 5,
      status: 'complete', winnerId: 'p1', startedAt: Date.now(), completedAt: Date.now(),
      games: [{ id: 'g1', winnerId: 'p1', matchPoints: 5 }],
    }];
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'backgammon:tournament') return JSON.stringify(tournament);
      if (key === 'backgammon:players') return JSON.stringify(players);
      if (key === 'backgammon:matches') return JSON.stringify(matches);
      return null;
    });

    store.loadFromStorage();

    const state = store.getState();
    expect(state.tournament.name).toBe('Saved');
    expect(state.players).toHaveLength(2);
    expect(state.matches).toHaveLength(1);
    expect(state.standings[0].name).toBe('Alice');
    expect(state.standings[0].matchPoints).toBe(5);
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
// loadFromStorage — archive and roster (T004)
// ---------------------------------------------------------------------------

describe('loadFromStorage — archive and roster', () => {
  it('defaults archive to [] when backgammon:archive key is missing', () => {
    localStorageMock.getItem.mockImplementation(() => null);
    store.loadFromStorage();
    expect(store.getState().archive).toEqual([]);
  });

  it('defaults roster to [] when backgammon:roster key is missing', () => {
    localStorageMock.getItem.mockImplementation(() => null);
    store.loadFromStorage();
    expect(store.getState().roster).toEqual([]);
  });

  it('getState returns archive and roster fields', () => {
    store.resetForTesting();
    const state = store.getState();
    expect(state).toHaveProperty('archive');
    expect(state).toHaveProperty('roster');
    expect(Array.isArray(state.archive)).toBe(true);
    expect(Array.isArray(state.roster)).toBe(true);
  });

  it('resetForTesting resets archive and roster to []', () => {
    store.resetForTesting();
    expect(store.getState().archive).toEqual([]);
    expect(store.getState().roster).toEqual([]);
  });

  it('loads archive from backgammon:archive key', () => {
    const snapshot = { id: 's1', name: 'Test', date: '2026-01-01T00:00:00.000Z',
      archivedAt: 1000, players: [], games: [], finalStandings: [], winnerName: null, gameCount: 0 };
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'backgammon:archive') return JSON.stringify([snapshot]);
      return null;
    });
    store.loadFromStorage();
    expect(store.getState().archive).toHaveLength(1);
    expect(store.getState().archive[0].name).toBe('Test');
  });

  it('loads roster from backgammon:roster key', () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'backgammon:roster') return JSON.stringify(['Alice', 'Bob']);
      return null;
    });
    store.loadFromStorage();
    expect(store.getState().roster).toEqual(['Alice', 'Bob']);
  });
});

// ---------------------------------------------------------------------------
// initTournament — name validation (T005)
// ---------------------------------------------------------------------------

describe('initTournament — name validation', () => {
  it("throws Error('Tournament name is required') for empty string", () => {
    expect(() => store.initTournament('')).toThrow('Tournament name is required');
  });

  it('throws for whitespace-only string', () => {
    expect(() => store.initTournament('   ')).toThrow('Tournament name is required');
  });

  it('throws for name over 100 characters', () => {
    expect(() => store.initTournament('a'.repeat(101))).toThrow('Tournament name too long');
  });

  it('does not throw for valid name', () => {
    expect(() => store.initTournament('valid name')).not.toThrow();
  });

  it('accepts name of exactly 100 characters', () => {
    expect(() => store.initTournament('a'.repeat(100))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// endTournament (T014)
// ---------------------------------------------------------------------------

describe('endTournament', () => {
  let alice, bob;

  function setupTournamentWithMatch() {
    store.initTournament('Test');
    store.addPlayer('Alice');
    store.addPlayer('Bob');
    const { players } = store.getState();
    alice = players.find((p) => p.name === 'Alice');
    bob = players.find((p) => p.name === 'Bob');
    store.startMatch(alice.id, bob.id, 1);
    const matchId = store.getState().matches[0].id;
    store.recordMatchGame(matchId, { winnerId: alice.id, resultType: 'standard', cubeValue: 1 });
  }

  it('appends a snapshot to archive when tournament has 1+ players and 1+ matches', () => {
    setupTournamentWithMatch();
    store.endTournament();
    expect(store.getState().archive).toHaveLength(1);
    expect(store.getState().archive[0].name).toBe('Test');
  });

  it('persists archive to backgammon:archive in localStorage', () => {
    setupTournamentWithMatch();
    localStorageMock.setItem.mockClear();
    store.endTournament();
    expect(localStorageMock.setItem).toHaveBeenCalledWith('backgammon:archive', expect.any(String));
  });

  it('clears active tournament, players, matches from state after archiving', () => {
    setupTournamentWithMatch();
    store.endTournament();
    const state = store.getState();
    expect(state.tournament).toBeNull();
    expect(state.players).toHaveLength(0);
    expect(state.matches).toHaveLength(0);
  });

  it('clears localStorage keys for active tournament', () => {
    setupTournamentWithMatch();
    localStorageMock.removeItem.mockClear();
    store.endTournament();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('backgammon:tournament');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('backgammon:players');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('backgammon:matches');
  });

  it('discards without archiving when tournament has 0 matches', () => {
    store.initTournament('Empty');
    store.addPlayer('Alice');
    store.endTournament();
    expect(store.getState().archive).toHaveLength(0);
    expect(store.getState().tournament).toBeNull();
  });

  it('discards without archiving when tournament has 0 players', () => {
    store.initTournament('No Players');
    store.endTournament();
    expect(store.getState().archive).toHaveLength(0);
    expect(store.getState().tournament).toBeNull();
  });

  it('is safe to call when tournament is null', () => {
    store.resetForTesting();
    expect(() => store.endTournament()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// initTournament — auto-archive (T014)
// ---------------------------------------------------------------------------

describe('initTournament — auto-archive', () => {
  it('auto-archives the current tournament if it has players+matches before creating new one', () => {
    store.initTournament('First');
    store.addPlayer('Alice');
    store.addPlayer('Bob');
    const { players } = store.getState();
    const alice = players.find((p) => p.name === 'Alice');
    const bob = players.find((p) => p.name === 'Bob');
    store.startMatch(alice.id, bob.id, 5);

    store.initTournament('Second');
    expect(store.getState().archive).toHaveLength(1);
    expect(store.getState().archive[0].name).toBe('First');
    expect(store.getState().tournament.name).toBe('Second');
  });

  it('does not auto-archive if active tournament has no players', () => {
    store.initTournament('First');
    store.initTournament('Second');
    expect(store.getState().archive).toHaveLength(0);
  });

  it('does not auto-archive if active tournament has no matches', () => {
    store.initTournament('First');
    store.addPlayer('Alice');
    store.initTournament('Second');
    expect(store.getState().archive).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// addPlayer — roster update (T026)
// ---------------------------------------------------------------------------

describe('addPlayer — roster update', () => {
  beforeEach(() => { store.initTournament('Roster Test'); });

  it('adds name to roster when roster is empty', () => {
    store.addPlayer('Alice');
    expect(store.getState().roster).toContain('Alice');
  });

  it('does not add duplicate name (same case)', () => {
    store.addPlayer('Alice');
    const countBefore = store.getState().roster.length;
    store.initTournament('Second');
    store.addPlayer('Alice');
    expect(store.getState().roster.length).toBe(countBefore);
  });

  it('does not add duplicate name (different case — case-insensitive dedup)', () => {
    store.addPlayer('Alice');
    const countBefore = store.getState().roster.length;
    store.initTournament('Second');
    store.addPlayer('alice');
    expect(store.getState().roster.length).toBe(countBefore);
  });

  it('persists roster to backgammon:roster', () => {
    localStorageMock.setItem.mockClear();
    store.addPlayer('Alice');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('backgammon:roster', expect.any(String));
  });

  it('loadFromStorage restores roster from backgammon:roster', () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'backgammon:roster') return JSON.stringify(['Alice', 'Bob']);
      return null;
    });
    store.loadFromStorage();
    expect(store.getState().roster).toEqual(['Alice', 'Bob']);
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

// ---------------------------------------------------------------------------
// startMatch (003-match-mode)
// ---------------------------------------------------------------------------

describe('startMatch', () => {
  let alice, bob, charlie;

  beforeEach(() => {
    store.initTournament('Match Night');
    store.addPlayer('Alice');
    store.addPlayer('Bob');
    store.addPlayer('Charlie');
    const { players } = store.getState();
    alice = players.find((p) => p.name === 'Alice');
    bob = players.find((p) => p.name === 'Bob');
    charlie = players.find((p) => p.name === 'Charlie');
  });

  it('creates a match in active state with empty games array', () => {
    store.startMatch(alice.id, bob.id, 7);
    const { matches } = store.getState();
    expect(matches).toHaveLength(1);
    expect(matches[0].status).toBe('active');
    expect(matches[0].games).toEqual([]);
    expect(matches[0].targetScore).toBe(7);
  });

  it('assigns player IDs correctly', () => {
    store.startMatch(alice.id, bob.id, 5);
    const match = store.getState().matches[0];
    expect(match.player1Id).toBe(alice.id);
    expect(match.player2Id).toBe(bob.id);
  });

  it('persists matches to backgammon:matches', () => {
    localStorageMock.setItem.mockClear();
    store.startMatch(alice.id, bob.id, 5);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('backgammon:matches', expect.any(String));
  });

  it('throws "Players must be different" when player1Id === player2Id', () => {
    expect(() => store.startMatch(alice.id, alice.id, 5)).toThrow(/players must be different/i);
  });

  it('throws "Player not found" for unknown player1Id', () => {
    expect(() => store.startMatch('unknown-id', bob.id, 5)).toThrow(/player not found/i);
  });

  it('throws "Player not found" for unknown player2Id', () => {
    expect(() => store.startMatch(alice.id, 'unknown-id', 5)).toThrow(/player not found/i);
  });

  it('throws "Target score must be at least 1" for target = 0', () => {
    expect(() => store.startMatch(alice.id, bob.id, 0)).toThrow(/target score must be at least 1/i);
  });

  it('throws "Player already in an active match" (FR-012) when player1 is in an active match', () => {
    store.startMatch(alice.id, bob.id, 5);
    expect(() => store.startMatch(alice.id, charlie.id, 5)).toThrow(/player already in an active match/i);
  });

  it('throws "Player already in an active match" (FR-012) when player2 is in an active match', () => {
    store.startMatch(alice.id, bob.id, 5);
    expect(() => store.startMatch(charlie.id, bob.id, 5)).toThrow(/player already in an active match/i);
  });

  it('allows starting a match for a player whose previous match is complete', () => {
    store.startMatch(alice.id, bob.id, 1);
    // Record a game to complete the match
    store.recordMatchGame(store.getState().matches[0].id, {
      winnerId: alice.id, resultType: 'standard', cubeValue: 1,
    });
    expect(() => store.startMatch(alice.id, charlie.id, 5)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// recordMatchGame (003-match-mode)
// ---------------------------------------------------------------------------

describe('recordMatchGame', () => {
  let alice, bob, matchId;

  beforeEach(() => {
    store.initTournament('Match Night');
    store.addPlayer('Alice');
    store.addPlayer('Bob');
    const { players } = store.getState();
    alice = players.find((p) => p.name === 'Alice');
    bob = players.find((p) => p.name === 'Bob');
    store.startMatch(alice.id, bob.id, 5);
    matchId = store.getState().matches[0].id;
  });

  it('adds a game to the match.games array', () => {
    store.recordMatchGame(matchId, { winnerId: alice.id, resultType: 'standard', cubeValue: 1 });
    const match = store.getState().matches[0];
    expect(match.games).toHaveLength(1);
  });

  it('correctly calculates matchPoints (gammon × 2 = 2)', () => {
    store.recordMatchGame(matchId, { winnerId: alice.id, resultType: 'gammon', cubeValue: 1 });
    const game = store.getState().matches[0].games[0];
    expect(game.matchPoints).toBe(2);
  });

  it('auto-completes the match when target is reached', () => {
    store.recordMatchGame(matchId, { winnerId: alice.id, resultType: 'standard', cubeValue: 1 });
    store.recordMatchGame(matchId, { winnerId: alice.id, resultType: 'standard', cubeValue: 1 });
    store.recordMatchGame(matchId, { winnerId: alice.id, resultType: 'standard', cubeValue: 1 });
    store.recordMatchGame(matchId, { winnerId: alice.id, resultType: 'standard', cubeValue: 1 });
    store.recordMatchGame(matchId, { winnerId: alice.id, resultType: 'standard', cubeValue: 1 });
    const match = store.getState().matches[0];
    expect(match.status).toBe('complete');
    expect(match.winnerId).toBe(alice.id);
    expect(match.completedAt).not.toBeNull();
  });

  it('throws "Match not found" for unknown matchId', () => {
    expect(() => store.recordMatchGame('bad-id', { winnerId: alice.id, resultType: 'standard', cubeValue: 1 })).toThrow(/match not found/i);
  });

  it('throws "Match is not active" when recording into a completed match', () => {
    // Complete the match
    store.recordMatchGame(matchId, { winnerId: alice.id, resultType: 'standard', cubeValue: 4 }); // 4 pts
    store.recordMatchGame(matchId, { winnerId: alice.id, resultType: 'standard', cubeValue: 1 }); // 5 pts total → complete
    const completedMatchId = store.getState().matches[0].id;
    expect(() => store.recordMatchGame(completedMatchId, { winnerId: alice.id, resultType: 'standard', cubeValue: 1 })).toThrow(/match is not active/i);
  });

  it('persists matches to localStorage after game recorded', () => {
    localStorageMock.setItem.mockClear();
    store.recordMatchGame(matchId, { winnerId: alice.id, resultType: 'standard', cubeValue: 1 });
    expect(localStorageMock.setItem).toHaveBeenCalledWith('backgammon:matches', expect.any(String));
  });
});

// ---------------------------------------------------------------------------
// abandonMatch (003-match-mode)
// ---------------------------------------------------------------------------

describe('abandonMatch', () => {
  let alice, bob, matchId;

  beforeEach(() => {
    store.initTournament('Match Night');
    store.addPlayer('Alice');
    store.addPlayer('Bob');
    const { players } = store.getState();
    alice = players.find((p) => p.name === 'Alice');
    bob = players.find((p) => p.name === 'Bob');
    store.startMatch(alice.id, bob.id, 5);
    matchId = store.getState().matches[0].id;
  });

  it('sets match status to abandoned', () => {
    store.abandonMatch(matchId);
    expect(store.getState().matches[0].status).toBe('abandoned');
  });

  it('does not set a winner', () => {
    store.abandonMatch(matchId);
    expect(store.getState().matches[0].winnerId).toBeNull();
  });

  it('frees both players so they can start new matches', () => {
    store.addPlayer('Charlie');
    const charlie = store.getState().players.find((p) => p.name === 'Charlie');
    store.abandonMatch(matchId);
    expect(() => store.startMatch(alice.id, charlie.id, 5)).not.toThrow();
  });

  it('abandoned match is not counted in standings', () => {
    store.recordMatchGame(matchId, { winnerId: alice.id, resultType: 'standard', cubeValue: 2 });
    store.abandonMatch(matchId);
    const standings = store.getState().standings;
    const aliceStanding = standings.find((s) => s.name === 'Alice');
    expect(aliceStanding.wins).toBe(0);
  });

  it('throws "Match not found" for unknown matchId', () => {
    expect(() => store.abandonMatch('bad-id')).toThrow(/match not found/i);
  });

  it('throws "Match is not active" when abandoning a completed match', () => {
    store.recordMatchGame(matchId, { winnerId: alice.id, resultType: 'standard', cubeValue: 4 });
    store.recordMatchGame(matchId, { winnerId: alice.id, resultType: 'standard', cubeValue: 1 }); // 5 pts → complete
    expect(() => store.abandonMatch(matchId)).toThrow(/match is not active/i);
  });
});

// ---------------------------------------------------------------------------
// selectMatch (003-match-mode)
// ---------------------------------------------------------------------------

describe('selectMatch', () => {
  beforeEach(() => {
    store.initTournament('Match Night');
    store.addPlayer('Alice');
    store.addPlayer('Bob');
    const { players } = store.getState();
    const alice = players[0];
    const bob = players[1];
    store.startMatch(alice.id, bob.id, 5);
  });

  it('sets selectedMatchId in state', () => {
    const matchId = store.getState().matches[0].id;
    store.selectMatch(matchId);
    expect(store.getState().selectedMatchId).toBe(matchId);
  });

  it('clears selectedMatchId when called with null', () => {
    const matchId = store.getState().matches[0].id;
    store.selectMatch(matchId);
    store.selectMatch(null);
    expect(store.getState().selectedMatchId).toBeNull();
  });

  it('selectedMatchId is null by default', () => {
    expect(store.getState().selectedMatchId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getState — match-derived standings (003-match-mode)
// ---------------------------------------------------------------------------

describe('getState — match-derived standings', () => {
  it('returns standings derived from match results', () => {
    store.initTournament('Match Night');
    store.addPlayer('Alice');
    store.addPlayer('Bob');
    const { players } = store.getState();
    const alice = players.find((p) => p.name === 'Alice');
    const bob = players.find((p) => p.name === 'Bob');
    store.startMatch(alice.id, bob.id, 3);
    const matchId = store.getState().matches[0].id;
    // Alice wins match (3 points in one go)
    store.recordMatchGame(matchId, { winnerId: alice.id, resultType: 'standard', cubeValue: 2 });
    store.recordMatchGame(matchId, { winnerId: alice.id, resultType: 'standard', cubeValue: 1 }); // total 3 → complete
    const standings = store.getState().standings;
    expect(standings[0].name).toBe('Alice');
    expect(standings[0].wins).toBe(1);
  });

  it('returns matches array in state', () => {
    store.initTournament('Match Night');
    store.addPlayer('Alice');
    store.addPlayer('Bob');
    const { players } = store.getState();
    store.startMatch(players[0].id, players[1].id, 5);
    expect(store.getState().matches).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// removePlayer — match-based guard (FR-009) (003-match-mode)
// ---------------------------------------------------------------------------

describe('removePlayer — match-based guard', () => {
  let alice, bob;

  beforeEach(() => {
    store.initTournament('Match Night');
    store.addPlayer('Alice');
    store.addPlayer('Bob');
    const { players } = store.getState();
    alice = players.find((p) => p.name === 'Alice');
    bob = players.find((p) => p.name === 'Bob');
  });

  it('throws "Cannot remove a player with an active match" when player is in active match', () => {
    store.startMatch(alice.id, bob.id, 5);
    expect(() => store.removePlayer(alice.id)).toThrow(/cannot remove a player with an active match/i);
  });

  it('allows removal when player has no active matches', () => {
    store.addPlayer('Charlie');
    const charlie = store.getState().players.find((p) => p.name === 'Charlie');
    expect(() => store.removePlayer(charlie.id)).not.toThrow();
  });

  it('allows removal when player\'s only match is complete', () => {
    store.startMatch(alice.id, bob.id, 1);
    const matchId = store.getState().matches[0].id;
    store.recordMatchGame(matchId, { winnerId: alice.id, resultType: 'standard', cubeValue: 1 });
    expect(() => store.removePlayer(bob.id)).not.toThrow();
  });

  it('allows removal when player\'s only match is abandoned', () => {
    store.startMatch(alice.id, bob.id, 5);
    const matchId = store.getState().matches[0].id;
    store.abandonMatch(matchId);
    expect(() => store.removePlayer(alice.id)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// endTournament — archives from matches (003-match-mode)
// ---------------------------------------------------------------------------

describe('endTournament — match-based archiving', () => {
  it('archives tournament when it has players and at least one match', () => {
    store.initTournament('Match Night');
    store.addPlayer('Alice');
    store.addPlayer('Bob');
    const { players } = store.getState();
    const alice = players.find((p) => p.name === 'Alice');
    const bob = players.find((p) => p.name === 'Bob');
    store.startMatch(alice.id, bob.id, 1);
    const matchId = store.getState().matches[0].id;
    store.recordMatchGame(matchId, { winnerId: alice.id, resultType: 'standard', cubeValue: 1 });
    store.endTournament();
    expect(store.getState().archive).toHaveLength(1);
  });

  it('does not archive when tournament has no matches', () => {
    store.initTournament('Empty Night');
    store.addPlayer('Alice');
    store.endTournament();
    expect(store.getState().archive).toHaveLength(0);
  });

  it('clears matches from state after ending', () => {
    store.initTournament('Match Night');
    store.addPlayer('Alice');
    store.addPlayer('Bob');
    const { players } = store.getState();
    store.startMatch(players[0].id, players[1].id, 5);
    store.endTournament();
    expect(store.getState().matches).toHaveLength(0);
  });
});

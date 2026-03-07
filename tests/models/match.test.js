import { describe, it, expect } from 'vitest';
import { createMatch, isMatchComplete, matchWinner, earlyMatchWinner } from '../../src/models/match.js';

// ---------------------------------------------------------------------------
// createMatch
// ---------------------------------------------------------------------------

describe('createMatch', () => {
  it('creates a match with the given players and target score', () => {
    const match = createMatch('p1', 'p2', 7);
    expect(match.player1Id).toBe('p1');
    expect(match.player2Id).toBe('p2');
    expect(match.targetScore).toBe(7);
  });

  it('sets initial status to active', () => {
    const match = createMatch('p1', 'p2', 5);
    expect(match.status).toBe('active');
  });

  it('sets winnerId to null initially', () => {
    const match = createMatch('p1', 'p2', 5);
    expect(match.winnerId).toBeNull();
  });

  it('sets completedAt to null initially', () => {
    const match = createMatch('p1', 'p2', 5);
    expect(match.completedAt).toBeNull();
  });

  it('initialises games as empty array', () => {
    const match = createMatch('p1', 'p2', 5);
    expect(match.games).toEqual([]);
  });

  it('assigns a UUID id', () => {
    const match = createMatch('p1', 'p2', 5);
    expect(match.id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('sets startedAt to a recent ms timestamp', () => {
    const before = Date.now();
    const match = createMatch('p1', 'p2', 5);
    const after = Date.now();
    expect(match.startedAt).toBeGreaterThanOrEqual(before);
    expect(match.startedAt).toBeLessThanOrEqual(after);
  });

  it('throws when player1Id === player2Id', () => {
    expect(() => createMatch('p1', 'p1', 5)).toThrow(/players must be different/i);
  });

  it('throws when targetScore is 0', () => {
    expect(() => createMatch('p1', 'p2', 0)).toThrow(/target score must be at least 1/i);
  });

  it('throws when targetScore is negative', () => {
    expect(() => createMatch('p1', 'p2', -3)).toThrow(/target score must be at least 1/i);
  });

  it('allows targetScore of 1 (minimum valid)', () => {
    expect(() => createMatch('p1', 'p2', 1)).not.toThrow();
  });

  it('throws when player1Id is falsy', () => {
    expect(() => createMatch('', 'p2', 5)).toThrow();
  });

  it('throws when player2Id is falsy', () => {
    expect(() => createMatch('p1', '', 5)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// isMatchComplete
// ---------------------------------------------------------------------------

describe('isMatchComplete', () => {
  function makeMatch(target = 5) {
    return { player1Id: 'p1', player2Id: 'p2', targetScore: target, games: [] };
  }

  function addGame(match, winnerId, points) {
    match.games.push({ winnerId, matchPoints: points });
  }

  it('returns false when no games have been played', () => {
    expect(isMatchComplete(makeMatch(5))).toBe(false);
  });

  it('returns false when neither player has reached the target', () => {
    const m = makeMatch(5);
    addGame(m, 'p1', 3);
    addGame(m, 'p2', 2);
    expect(isMatchComplete(m)).toBe(false);
  });

  it('returns true when player1 reaches the target exactly', () => {
    const m = makeMatch(5);
    addGame(m, 'p1', 3);
    addGame(m, 'p1', 2);
    expect(isMatchComplete(m)).toBe(true);
  });

  it('returns true when player2 reaches the target exactly', () => {
    const m = makeMatch(5);
    addGame(m, 'p2', 5);
    expect(isMatchComplete(m)).toBe(true);
  });

  it('returns true when a player exceeds the target (backgammon on high cube)', () => {
    const m = makeMatch(5);
    addGame(m, 'p1', 6); // 6 > 5
    expect(isMatchComplete(m)).toBe(true);
  });

  it('returns true when target is 1 and one game is played', () => {
    const m = makeMatch(1);
    addGame(m, 'p1', 1);
    expect(isMatchComplete(m)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// matchWinner
// ---------------------------------------------------------------------------

describe('matchWinner', () => {
  function makeMatch(target = 5) {
    return { player1Id: 'p1', player2Id: 'p2', targetScore: target, games: [] };
  }

  function addGame(match, winnerId, points) {
    match.games.push({ winnerId, matchPoints: points });
  }

  it('returns null when neither player has won yet', () => {
    const m = makeMatch(5);
    addGame(m, 'p1', 3);
    expect(matchWinner(m)).toBeNull();
  });

  it('returns player1Id when player1 reaches the target', () => {
    const m = makeMatch(5);
    addGame(m, 'p1', 5);
    expect(matchWinner(m)).toBe('p1');
  });

  it('returns player2Id when player2 reaches the target', () => {
    const m = makeMatch(5);
    addGame(m, 'p2', 5);
    expect(matchWinner(m)).toBe('p2');
  });

  it('returns the correct winner when player1 exceeds target', () => {
    const m = makeMatch(5);
    addGame(m, 'p1', 3);
    addGame(m, 'p1', 4); // total 7, exceeds 5
    expect(matchWinner(m)).toBe('p1');
  });

  it('returns null for a match with no games', () => {
    expect(matchWinner(makeMatch(5))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// earlyMatchWinner — T004
// ---------------------------------------------------------------------------

describe('earlyMatchWinner', () => {
  it('returns player1Id when P1 accumulated match points exceed P2', () => {
    const match = {
      player1Id: 'p1', player2Id: 'p2',
      games: [
        { winnerId: 'p1', matchPoints: 3 },
        { winnerId: 'p2', matchPoints: 1 },
      ],
    };
    expect(earlyMatchWinner(match)).toBe('p1');
  });

  it('returns player2Id when P2 accumulated match points exceed P1', () => {
    const match = {
      player1Id: 'p1', player2Id: 'p2',
      games: [
        { winnerId: 'p2', matchPoints: 3 },
        { winnerId: 'p1', matchPoints: 1 },
      ],
    };
    expect(earlyMatchWinner(match)).toBe('p2');
  });

  it('returns null when scores are tied (e.g., P1=2 P2=2)', () => {
    const match = {
      player1Id: 'p1', player2Id: 'p2',
      games: [
        { winnerId: 'p1', matchPoints: 2 },
        { winnerId: 'p2', matchPoints: 2 },
      ],
    };
    expect(earlyMatchWinner(match)).toBeNull();
  });

  it('returns null when no games recorded (0-0)', () => {
    const match = {
      player1Id: 'p1', player2Id: 'p2',
      games: [],
    };
    expect(earlyMatchWinner(match)).toBeNull();
  });
});

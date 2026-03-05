import { describe, it, expect } from 'vitest';
import { createSnapshot, snapshotWinner } from '../../src/models/tournamentSnapshot.js';

// Helpers
function makeTournament(name = 'Test Tournament') {
  return { id: 'tid-1', name, date: '2026-03-04T00:00:00.000Z', status: 'active' };
}

function makePlayers() {
  return [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
  ];
}

function makeGames(winnerId = 'p1') {
  return [
    {
      id: 'g1',
      player1Id: 'p1',
      player2Id: 'p2',
      winnerId,
      resultType: 'standard',
      cubeValue: 1,
      matchPoints: 1,
      timestamp: 1741046400000,
      sequence: 1,
    },
  ];
}

// Match-mode helper: wraps games in a match object (new signature)
function makeMatchesFromGames(games, winnerId = 'p1') {
  return [{
    id: 'm1',
    player1Id: 'p1',
    player2Id: 'p2',
    targetScore: 5,
    status: 'complete',
    winnerId,
    startedAt: 1741046400000,
    completedAt: 1741046500000,
    games,
  }];
}

describe('createSnapshot', () => {
  it('returns snapshot with correct id copied from tournament', () => {
    const snapshot = createSnapshot(makeTournament(), makePlayers(), makeGames());
    expect(snapshot.id).toBe('tid-1');
  });

  it('returns snapshot with correct name', () => {
    const snapshot = createSnapshot(makeTournament('April Club Night'), makePlayers(), makeGames());
    expect(snapshot.name).toBe('April Club Night');
  });

  it('returns snapshot with correct date', () => {
    const snapshot = createSnapshot(makeTournament(), makePlayers(), makeGames());
    expect(snapshot.date).toBe('2026-03-04T00:00:00.000Z');
  });

  it('sets archivedAt to a recent timestamp (ms epoch)', () => {
    const before = Date.now();
    const snapshot = createSnapshot(makeTournament(), makePlayers(), makeGames());
    const after = Date.now();
    expect(snapshot.archivedAt).toBeGreaterThanOrEqual(before);
    expect(snapshot.archivedAt).toBeLessThanOrEqual(after);
  });

  it('deep-copies players — mutating originals does not affect snapshot', () => {
    const players = makePlayers();
    const snapshot = createSnapshot(makeTournament(), players, makeGames());
    players[0].name = 'MUTATED';
    expect(snapshot.players[0].name).toBe('Alice');
  });

  it('deep-copies matches — mutating originals does not affect snapshot', () => {
    const matches = makeMatchesFromGames(makeGames());
    const snapshot = createSnapshot(makeTournament(), makePlayers(), matches);
    matches[0].games[0].matchPoints = 999;
    expect(snapshot.matches[0].games[0].matchPoints).toBe(1);
  });

  it('sets gameCount to total games across all matches', () => {
    const matches = makeMatchesFromGames(makeGames());
    const snapshot = createSnapshot(makeTournament(), makePlayers(), matches);
    expect(snapshot.gameCount).toBe(1);
  });

  it('computes finalStandings from match results', () => {
    const snapshot = createSnapshot(makeTournament(), makePlayers(), makeMatchesFromGames(makeGames('p1'), 'p1'));
    expect(snapshot.finalStandings).toHaveLength(2);
    expect(snapshot.finalStandings[0].name).toBe('Alice');
    expect(snapshot.finalStandings[0].wins).toBe(1);
    expect(snapshot.finalStandings[1].name).toBe('Bob');
    expect(snapshot.finalStandings[1].wins).toBe(0);
  });

  it('sets winnerName to first-ranked player name', () => {
    const snapshot = createSnapshot(makeTournament(), makePlayers(), makeMatchesFromGames(makeGames('p1'), 'p1'));
    expect(snapshot.winnerName).toBe('Alice');
  });

  it('sets winnerName to null when standings are empty (no players)', () => {
    const snapshot = createSnapshot(makeTournament(), [], []);
    expect(snapshot.winnerName).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createSnapshot — match-based signature (003-match-mode)
// ---------------------------------------------------------------------------

describe('createSnapshot — match-based (003)', () => {
  function makeTournament() {
    return { id: 'tid-1', name: 'Match Night', date: '2026-03-05T00:00:00.000Z', status: 'active' };
  }

  function makePlayers() {
    return [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }];
  }

  function makeMatches() {
    return [
      {
        id: 'm1',
        player1Id: 'p1',
        player2Id: 'p2',
        targetScore: 5,
        status: 'complete',
        winnerId: 'p1',
        startedAt: 1000,
        completedAt: 2000,
        games: [
          { id: 'g1', player1Id: 'p1', player2Id: 'p2', winnerId: 'p1',
            resultType: 'standard', cubeValue: 1, matchPoints: 1, timestamp: 1000, sequence: 1 },
          { id: 'g2', player1Id: 'p1', player2Id: 'p2', winnerId: 'p1',
            resultType: 'gammon', cubeValue: 2, matchPoints: 4, timestamp: 2000, sequence: 2 },
        ],
      },
    ];
  }

  it('accepts (tournament, players, matches) signature', () => {
    expect(() => createSnapshot(makeTournament(), makePlayers(), makeMatches())).not.toThrow();
  });

  it('sets gameCount to total games across all matches', () => {
    const snapshot = createSnapshot(makeTournament(), makePlayers(), makeMatches());
    expect(snapshot.gameCount).toBe(2); // 2 games in the one match
  });

  it('embeds matches field in the snapshot', () => {
    const snapshot = createSnapshot(makeTournament(), makePlayers(), makeMatches());
    expect(snapshot.matches).toHaveLength(1);
    expect(snapshot.matches[0].id).toBe('m1');
  });

  it('derives finalStandings from match data (Alice won the match)', () => {
    const snapshot = createSnapshot(makeTournament(), makePlayers(), makeMatches());
    expect(snapshot.finalStandings[0].name).toBe('Alice');
    expect(snapshot.finalStandings[0].wins).toBe(1);
  });

  it('sets winnerName from rank-1 standing', () => {
    const snapshot = createSnapshot(makeTournament(), makePlayers(), makeMatches());
    expect(snapshot.winnerName).toBe('Alice');
  });

  it('sets gameCount to 0 when no matches have games', () => {
    const emptyMatches = [{ id: 'm1', player1Id: 'p1', player2Id: 'p2', targetScore: 5,
      status: 'abandoned', winnerId: null, startedAt: 1000, completedAt: null, games: [] }];
    const snapshot = createSnapshot(makeTournament(), makePlayers(), emptyMatches);
    expect(snapshot.gameCount).toBe(0);
  });

  it('sets winnerName to null when no matches were completed', () => {
    const abandoned = [{ id: 'm1', player1Id: 'p1', player2Id: 'p2', targetScore: 5,
      status: 'abandoned', winnerId: null, startedAt: 1000, completedAt: null, games: [] }];
    const snapshot = createSnapshot(makeTournament(), makePlayers(), abandoned);
    expect(snapshot.winnerName).toBeNull();
  });

  it('correctly counts gameCount across multiple matches', () => {
    const twoMatches = [
      { id: 'm1', player1Id: 'p1', player2Id: 'p2', targetScore: 5,
        status: 'complete', winnerId: 'p1', startedAt: 1000, completedAt: 2000,
        games: [{ id: 'g1', winnerId: 'p1', matchPoints: 5 }] },
      { id: 'm2', player1Id: 'p1', player2Id: 'p2', targetScore: 5,
        status: 'complete', winnerId: 'p2', startedAt: 3000, completedAt: 4000,
        games: [{ id: 'g2', winnerId: 'p2', matchPoints: 5 }, { id: 'g3', winnerId: 'p2', matchPoints: 3 }] },
    ];
    const snapshot = createSnapshot(makeTournament(), makePlayers(), twoMatches);
    expect(snapshot.gameCount).toBe(3); // 1 + 2
  });
});

describe('snapshotWinner', () => {
  it('returns name of first-ranked player from finalStandings', () => {
    const snapshot = createSnapshot(makeTournament(), makePlayers(), makeMatchesFromGames(makeGames('p1'), 'p1'));
    expect(snapshotWinner(snapshot)).toBe('Alice');
  });

  it('returns null for snapshot with empty finalStandings', () => {
    const snapshot = { finalStandings: [] };
    expect(snapshotWinner(snapshot)).toBeNull();
  });

  it('returns null for null input', () => {
    expect(snapshotWinner(null)).toBeNull();
  });
});

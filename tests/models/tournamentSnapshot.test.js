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

  it('deep-copies games — mutating originals does not affect snapshot', () => {
    const games = makeGames();
    const snapshot = createSnapshot(makeTournament(), makePlayers(), games);
    games[0].matchPoints = 999;
    expect(snapshot.games[0].matchPoints).toBe(1);
  });

  it('sets gameCount to games.length', () => {
    const games = makeGames();
    const snapshot = createSnapshot(makeTournament(), makePlayers(), games);
    expect(snapshot.gameCount).toBe(1);
  });

  it('computes finalStandings equal to deriveStandings(players, games)', () => {
    const snapshot = createSnapshot(makeTournament(), makePlayers(), makeGames('p1'));
    expect(snapshot.finalStandings).toHaveLength(2);
    expect(snapshot.finalStandings[0].name).toBe('Alice');
    expect(snapshot.finalStandings[0].wins).toBe(1);
    expect(snapshot.finalStandings[1].name).toBe('Bob');
    expect(snapshot.finalStandings[1].wins).toBe(0);
  });

  it('sets winnerName to first-ranked player name', () => {
    const snapshot = createSnapshot(makeTournament(), makePlayers(), makeGames('p1'));
    expect(snapshot.winnerName).toBe('Alice');
  });

  it('sets winnerName to null when standings are empty', () => {
    const snapshot = createSnapshot(makeTournament(), [], []);
    expect(snapshot.winnerName).toBeNull();
  });
});

describe('snapshotWinner', () => {
  it('returns name of first-ranked player from finalStandings', () => {
    const snapshot = createSnapshot(makeTournament(), makePlayers(), makeGames('p1'));
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

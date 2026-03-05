import { describe, it, expect } from 'vitest';
import { deriveMatchStandings } from '../../src/models/matchStanding.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayers(names = ['Alice', 'Bob']) {
  return names.map((name, i) => ({ id: `p${i + 1}`, name }));
}

function makeMatch({ p1, p2, target = 5, status = 'complete', winnerId = null, games = [] }) {
  return { id: crypto.randomUUID(), player1Id: p1, player2Id: p2, targetScore: target, status, winnerId, games };
}

function makeGame(winnerId, points) {
  return { id: crypto.randomUUID(), winnerId, matchPoints: points };
}

// ---------------------------------------------------------------------------
// deriveMatchStandings
// ---------------------------------------------------------------------------

describe('deriveMatchStandings', () => {
  it('returns one Standing per player', () => {
    const players = makePlayers(['Alice', 'Bob']);
    const standings = deriveMatchStandings(players, []);
    expect(standings).toHaveLength(2);
  });

  it('ranks player with more match wins higher (rank 1 first)', () => {
    const [alice, bob] = makePlayers(['Alice', 'Bob']);
    const players = [alice, bob];
    const matches = [
      makeMatch({ p1: alice.id, p2: bob.id, status: 'complete', winnerId: alice.id,
        games: [makeGame(alice.id, 5)] }),
      makeMatch({ p1: alice.id, p2: bob.id, status: 'complete', winnerId: alice.id,
        games: [makeGame(alice.id, 5)] }),
      makeMatch({ p1: alice.id, p2: bob.id, status: 'complete', winnerId: bob.id,
        games: [makeGame(bob.id, 5)] }),
    ];
    const standings = deriveMatchStandings(players, matches);
    expect(standings[0].name).toBe('Alice');
    expect(standings[0].wins).toBe(2);
    expect(standings[1].name).toBe('Bob');
    expect(standings[1].wins).toBe(1);
  });

  it('uses total match points as tiebreaker when match wins are equal', () => {
    const [alice, bob] = makePlayers(['Alice', 'Bob']);
    const players = [alice, bob];
    // Both win 1 match; Alice scores 8 pts, Bob scores 5 pts
    const matches = [
      makeMatch({ p1: alice.id, p2: bob.id, status: 'complete', winnerId: alice.id,
        games: [makeGame(alice.id, 8)] }),
      makeMatch({ p1: alice.id, p2: bob.id, status: 'complete', winnerId: bob.id,
        games: [makeGame(bob.id, 5)] }),
    ];
    const standings = deriveMatchStandings(players, matches);
    expect(standings[0].name).toBe('Alice');
    expect(standings[0].matchPoints).toBe(8);
    expect(standings[1].name).toBe('Bob');
    expect(standings[1].matchPoints).toBe(5);
  });

  it('excludes abandoned matches from wins and points', () => {
    const [alice, bob] = makePlayers(['Alice', 'Bob']);
    const players = [alice, bob];
    const abandoned = makeMatch({ p1: alice.id, p2: bob.id, status: 'abandoned', winnerId: null,
      games: [makeGame(alice.id, 3)] });
    const standings = deriveMatchStandings(players, [abandoned]);
    const aliceStanding = standings.find((s) => s.name === 'Alice');
    expect(aliceStanding.wins).toBe(0);
    expect(aliceStanding.matchPoints).toBe(0);
  });

  it('includes a player with zero wins at the bottom', () => {
    const [alice, bob] = makePlayers(['Alice', 'Bob']);
    const players = [alice, bob];
    const match = makeMatch({ p1: alice.id, p2: bob.id, status: 'complete', winnerId: alice.id,
      games: [makeGame(alice.id, 5)] });
    const standings = deriveMatchStandings(players, [match]);
    expect(standings).toHaveLength(2);
    const bobStanding = standings.find((s) => s.name === 'Bob');
    expect(bobStanding.wins).toBe(0);
    expect(standings[standings.length - 1].name).toBe('Bob');
  });

  it('returns empty array for empty players list', () => {
    expect(deriveMatchStandings([], [])).toEqual([]);
  });

  it('ignores active (in-progress) matches', () => {
    const [alice, bob] = makePlayers(['Alice', 'Bob']);
    const players = [alice, bob];
    const active = makeMatch({ p1: alice.id, p2: bob.id, status: 'active', winnerId: null,
      games: [makeGame(alice.id, 3)] });
    const standings = deriveMatchStandings(players, [active]);
    const aliceStanding = standings.find((s) => s.name === 'Alice');
    expect(aliceStanding.wins).toBe(0);
    expect(aliceStanding.matchPoints).toBe(0);
  });

  it('assigns rank 1 to the top player', () => {
    const players = makePlayers(['Alice', 'Bob']);
    const standings = deriveMatchStandings(players, []);
    expect(standings[0].rank).toBe(1);
  });

  it('each standing has name, wins, losses, matchPoints, rank fields', () => {
    const players = makePlayers(['Alice']);
    const standings = deriveMatchStandings(players, []);
    expect(standings[0]).toHaveProperty('name');
    expect(standings[0]).toHaveProperty('wins');
    expect(standings[0]).toHaveProperty('losses');
    expect(standings[0]).toHaveProperty('matchPoints');
    expect(standings[0]).toHaveProperty('rank');
  });

  it('correctly counts losses (participated in complete match and did not win)', () => {
    const [alice, bob] = makePlayers(['Alice', 'Bob']);
    const players = [alice, bob];
    const match = makeMatch({ p1: alice.id, p2: bob.id, status: 'complete', winnerId: alice.id,
      games: [makeGame(alice.id, 5)] });
    const standings = deriveMatchStandings(players, [match]);
    const bobStanding = standings.find((s) => s.name === 'Bob');
    expect(bobStanding.losses).toBe(1);
    const aliceStanding = standings.find((s) => s.name === 'Alice');
    expect(aliceStanding.losses).toBe(0);
  });

  it('points only count games where that player won', () => {
    const [alice, bob] = makePlayers(['Alice', 'Bob']);
    const players = [alice, bob];
    const match = makeMatch({ p1: alice.id, p2: bob.id, status: 'complete', winnerId: alice.id,
      games: [makeGame(alice.id, 3), makeGame(bob.id, 2), makeGame(alice.id, 2)] });
    const standings = deriveMatchStandings(players, [match]);
    const aliceStanding = standings.find((s) => s.name === 'Alice');
    expect(aliceStanding.matchPoints).toBe(5); // 3 + 2
    const bobStanding = standings.find((s) => s.name === 'Bob');
    expect(bobStanding.matchPoints).toBe(2);
  });
});

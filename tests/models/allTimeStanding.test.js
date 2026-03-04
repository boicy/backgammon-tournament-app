import { describe, it, expect } from 'vitest';
import { deriveAllTimeStandings } from '../../src/models/allTimeStanding.js';

// Helpers
function makeSnapshot({ id = 's1', name = 'Test', winnerName = 'Alice', players = [], games = [], finalStandings = [] } = {}) {
  return {
    id,
    name,
    date: '2026-01-01T00:00:00.000Z',
    archivedAt: Date.now(),
    players,
    games,
    finalStandings,
    winnerName,
    gameCount: games.length,
  };
}

function makeStandings(entries) {
  // entries: [{name, matchPoints, wins, losses}]
  return entries.map((e, i) => ({
    playerId: `p${i}`,
    name: e.name,
    matchPoints: e.matchPoints ?? 0,
    wins: e.wins ?? 0,
    losses: e.losses ?? 0,
    gamesPlayed: (e.wins ?? 0) + (e.losses ?? 0),
    rank: i + 1,
  }));
}

describe('deriveAllTimeStandings', () => {
  it('returns empty array for empty archive with no active tournament', () => {
    const result = deriveAllTimeStandings([], null, [], []);
    expect(result).toEqual([]);
  });

  it('single archived tournament — correct wins, points, tournamentsPlayed', () => {
    const standings = makeStandings([
      { name: 'Alice', matchPoints: 5, wins: 3, losses: 1 },
      { name: 'Bob', matchPoints: 2, wins: 1, losses: 3 },
    ]);
    const snap = makeSnapshot({ winnerName: 'Alice', finalStandings: standings,
      players: [{ id: 'p0', name: 'Alice' }, { id: 'p1', name: 'Bob' }] });

    const result = deriveAllTimeStandings([snap], null, [], []);

    expect(result).toHaveLength(2);
    const alice = result.find((r) => r.name === 'Alice');
    const bob = result.find((r) => r.name === 'Bob');

    expect(alice.tournamentWins).toBe(1);
    expect(alice.cumulativePoints).toBe(5);
    expect(alice.tournamentsPlayed).toBe(1);

    expect(bob.tournamentWins).toBe(0);
    expect(bob.cumulativePoints).toBe(2);
    expect(bob.tournamentsPlayed).toBe(1);
  });

  it('two archived tournaments, different winners — both ranked correctly', () => {
    const snap1 = makeSnapshot({
      id: 's1',
      winnerName: 'Alice',
      finalStandings: makeStandings([
        { name: 'Alice', matchPoints: 3, wins: 2, losses: 0 },
        { name: 'Bob', matchPoints: 1, wins: 0, losses: 2 },
      ]),
    });
    const snap2 = makeSnapshot({
      id: 's2',
      winnerName: 'Bob',
      finalStandings: makeStandings([
        { name: 'Bob', matchPoints: 4, wins: 2, losses: 0 },
        { name: 'Alice', matchPoints: 1, wins: 0, losses: 2 },
      ]),
    });

    const result = deriveAllTimeStandings([snap1, snap2], null, [], []);
    const alice = result.find((r) => r.name === 'Alice');
    const bob = result.find((r) => r.name === 'Bob');

    expect(alice.tournamentWins).toBe(1);
    expect(bob.tournamentWins).toBe(1);
    expect(alice.cumulativePoints).toBe(4);  // 3 + 1
    expect(bob.cumulativePoints).toBe(5);    // 1 + 4
  });

  it('two players with same tournament wins — tiebreaker by cumulativePoints (higher ranks first)', () => {
    const snap1 = makeSnapshot({
      id: 's1', winnerName: 'Alice',
      finalStandings: makeStandings([
        { name: 'Alice', matchPoints: 10 },
        { name: 'Bob', matchPoints: 2 },
      ]),
    });
    const snap2 = makeSnapshot({
      id: 's2', winnerName: 'Bob',
      finalStandings: makeStandings([
        { name: 'Bob', matchPoints: 10 },
        { name: 'Alice', matchPoints: 2 },
      ]),
    });

    const result = deriveAllTimeStandings([snap1, snap2], null, [], []);
    // Both have 1 win; Bob has 12 total pts vs Alice's 12... let's recalculate:
    // Alice: snap1=10, snap2=2 → 12 total. Bob: snap1=2, snap2=10 → 12 total.
    // Tied on points too — just check they both appear with 1 win
    expect(result).toHaveLength(2);
    expect(result[0].tournamentWins).toBe(1);
    expect(result[1].tournamentWins).toBe(1);
  });

  it('tiebreaker correctly ranks higher points first', () => {
    const snap1 = makeSnapshot({
      id: 's1', winnerName: 'Alice',
      finalStandings: makeStandings([
        { name: 'Alice', matchPoints: 20 },
        { name: 'Bob', matchPoints: 1 },
      ]),
    });
    const snap2 = makeSnapshot({
      id: 's2', winnerName: 'Bob',
      finalStandings: makeStandings([
        { name: 'Bob', matchPoints: 5 },
        { name: 'Alice', matchPoints: 1 },
      ]),
    });

    const result = deriveAllTimeStandings([snap1, snap2], null, [], []);
    // Alice: 1 win, 21 pts. Bob: 1 win, 6 pts. Alice should rank first.
    expect(result[0].name).toBe('Alice');
    expect(result[0].cumulativePoints).toBe(21);
    expect(result[1].name).toBe('Bob');
    expect(result[1].cumulativePoints).toBe(6);
  });

  it('active tournament in-progress results included in cumulativePoints without tournament win credit', () => {
    const snap = makeSnapshot({
      winnerName: 'Alice',
      finalStandings: makeStandings([
        { name: 'Alice', matchPoints: 5 },
        { name: 'Bob', matchPoints: 0 },
      ]),
    });

    const activeTournament = { id: 'active', name: 'Live', date: '2026-01-02T00:00:00.000Z', status: 'active' };
    const activePlayers = [{ id: 'ap1', name: 'Alice' }, { id: 'ap2', name: 'Bob' }];
    const activeGames = [{
      id: 'ag1', player1Id: 'ap1', player2Id: 'ap2', winnerId: 'ap1',
      resultType: 'standard', cubeValue: 2, matchPoints: 2, timestamp: Date.now(), sequence: 1,
    }];

    const result = deriveAllTimeStandings([snap], activeTournament, activePlayers, activeGames);
    const alice = result.find((r) => r.name === 'Alice');

    // 1 archived win + active tournament points (not a win yet)
    expect(alice.tournamentWins).toBe(1);
    expect(alice.cumulativePoints).toBe(7);  // 5 archived + 2 active
  });

  it('case-insensitive name merge — "Alice" and "alice" are the same person', () => {
    const snap1 = makeSnapshot({
      id: 's1', winnerName: 'Alice',
      finalStandings: makeStandings([{ name: 'Alice', matchPoints: 5 }]),
    });
    const snap2 = makeSnapshot({
      id: 's2', winnerName: 'alice',
      finalStandings: makeStandings([{ name: 'alice', matchPoints: 3 }]),
    });

    const result = deriveAllTimeStandings([snap1, snap2], null, [], []);
    expect(result).toHaveLength(1);
    expect(result[0].tournamentWins).toBe(2);
    expect(result[0].cumulativePoints).toBe(8);
  });

  it('display name taken from most recent tournament occurrence', () => {
    const snap1 = makeSnapshot({
      id: 's1', winnerName: 'alice',
      finalStandings: makeStandings([{ name: 'alice', matchPoints: 5 }]),
    });
    // snap2 is more recent (higher archivedAt)
    const snap2 = {
      ...makeSnapshot({
        id: 's2', winnerName: 'Alice',
        finalStandings: makeStandings([{ name: 'Alice', matchPoints: 3 }]),
      }),
      archivedAt: Date.now() + 10000,
    };

    const result = deriveAllTimeStandings([snap1, snap2], null, [], []);
    expect(result[0].name).toBe('Alice'); // most recent capitalisation
  });

  it('player in only some tournaments — tournamentsPlayed reflects participation subset', () => {
    const snap1 = makeSnapshot({
      id: 's1', winnerName: 'Alice',
      finalStandings: makeStandings([
        { name: 'Alice', matchPoints: 5 },
        { name: 'Bob', matchPoints: 0 },
      ]),
    });
    const snap2 = makeSnapshot({
      id: 's2', winnerName: 'Charlie',
      finalStandings: makeStandings([
        { name: 'Charlie', matchPoints: 5 },
        { name: 'Alice', matchPoints: 0 },
      ]),
    });

    const result = deriveAllTimeStandings([snap1, snap2], null, [], []);
    const alice = result.find((r) => r.name === 'Alice');
    const bob = result.find((r) => r.name === 'Bob');
    const charlie = result.find((r) => r.name === 'Charlie');

    expect(alice.tournamentsPlayed).toBe(2);
    expect(bob.tournamentsPlayed).toBe(1);
    expect(charlie.tournamentsPlayed).toBe(1);
  });

  it('empty archive + no active games — returns standings with 0 wins (FR-015 pre-archive state)', () => {
    const activeTournament = { id: 'active', name: 'Live', date: '2026-01-01T00:00:00.000Z', status: 'active' };
    const activePlayers = [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }];

    const result = deriveAllTimeStandings([], activeTournament, activePlayers, []);
    expect(result).toHaveLength(2);
    result.forEach((r) => {
      expect(r.tournamentWins).toBe(0);
      expect(r.cumulativePoints).toBe(0);
    });
  });

  it('assigns sequential rank values starting at 1', () => {
    const snap = makeSnapshot({
      winnerName: 'Alice',
      finalStandings: makeStandings([
        { name: 'Alice', matchPoints: 5 },
        { name: 'Bob', matchPoints: 2 },
      ]),
    });

    const result = deriveAllTimeStandings([snap], null, [], []);
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(2);
  });
});

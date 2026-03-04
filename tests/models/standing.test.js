import { describe, it, expect } from 'vitest';
import { deriveStandings } from '../../src/models/standing.js';

const p1 = { id: 'p1', name: 'Alice' };
const p2 = { id: 'p2', name: 'Bob' };
const p3 = { id: 'p3', name: 'Carol' };

function makeGame(winnerId, loserId, resultType = 'standard', cubeValue = 1, seq = 1) {
  return { id: `g${seq}`, player1Id: winnerId, player2Id: loserId, winnerId, resultType, cubeValue, matchPoints: ({ standard: 1, gammon: 2, backgammon: 3 }[resultType]) * cubeValue, timestamp: Date.now(), sequence: seq };
}

describe('deriveStandings', () => {
  it('returns empty array when no players', () => {
    expect(deriveStandings([], [])).toEqual([]);
  });

  it('returns all players at zero with no games', () => {
    const standings = deriveStandings([p1, p2], []);
    expect(standings).toHaveLength(2);
    standings.forEach(s => {
      expect(s.matchPoints).toBe(0);
      expect(s.wins).toBe(0);
      expect(s.losses).toBe(0);
      expect(s.gamesPlayed).toBe(0);
    });
  });

  it('ranks winner above loser after one game', () => {
    const games = [makeGame('p1', 'p2')];
    const standings = deriveStandings([p1, p2], games);
    expect(standings[0].playerId).toBe('p1');
    expect(standings[1].playerId).toBe('p2');
  });

  it('accumulates match points across multiple games', () => {
    const games = [
      makeGame('p1', 'p2', 'standard', 1, 1),
      makeGame('p1', 'p2', 'gammon', 2, 2),
    ];
    const standings = deriveStandings([p1, p2], games);
    const alice = standings.find(s => s.playerId === 'p1');
    expect(alice.wins).toBe(2);
    expect(alice.matchPoints).toBe(1 + 4); // 1×1 + 2×2
  });

  it('uses fewer losses as tiebreaker for equal match points', () => {
    const games = [
      makeGame('p1', 'p2', 'standard', 1, 1),
      makeGame('p3', 'p2', 'standard', 1, 2),
    ];
    const standings = deriveStandings([p1, p2, p3], games);
    // p1 and p3 both have 1 point and 0 losses; p2 has 0 points and 2 losses
    const p2s = standings.find(s => s.playerId === 'p2');
    expect(p2s.rank).toBe(3);
  });

  it('recalculates correctly after a game is removed', () => {
    const game1 = makeGame('p1', 'p2', 'standard', 1, 1);
    const game2 = makeGame('p2', 'p1', 'gammon', 1, 2);
    const withBoth = deriveStandings([p1, p2], [game1, game2]);
    const withOne = deriveStandings([p1, p2], [game1]);
    const aliceWithBoth = withBoth.find(s => s.playerId === 'p1');
    const aliceWithOne = withOne.find(s => s.playerId === 'p1');
    expect(aliceWithBoth.losses).toBe(1);
    expect(aliceWithOne.losses).toBe(0);
  });

  it('assigns sequential rank starting at 1', () => {
    const games = [makeGame('p1', 'p2')];
    const standings = deriveStandings([p1, p2], games);
    expect(standings[0].rank).toBe(1);
    expect(standings[1].rank).toBe(2);
  });
});

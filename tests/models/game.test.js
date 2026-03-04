import { describe, it, expect } from 'vitest';
import { calculateMatchPoints, createGame } from '../../src/models/game.js';

// Integrity gate: all 21 combinations (3 result types × 7 cube values)
describe('calculateMatchPoints', () => {
  const cubeValues = [1, 2, 4, 8, 16, 32, 64];

  it.each(cubeValues)('standard win × cube %i', (cube) => {
    expect(calculateMatchPoints('standard', cube)).toBe(1 * cube);
  });

  it.each(cubeValues)('gammon × cube %i', (cube) => {
    expect(calculateMatchPoints('gammon', cube)).toBe(2 * cube);
  });

  it.each(cubeValues)('backgammon × cube %i', (cube) => {
    expect(calculateMatchPoints('backgammon', cube)).toBe(3 * cube);
  });

  it('throws on unknown result type', () => {
    expect(() => calculateMatchPoints('invalid', 1)).toThrow();
  });

  it('throws on invalid cube value', () => {
    expect(() => calculateMatchPoints('standard', 3)).toThrow();
    expect(() => calculateMatchPoints('standard', 0)).toThrow();
  });
});

describe('createGame', () => {
  const p1 = 'player-1';
  const p2 = 'player-2';

  it('creates a valid game record', () => {
    const game = createGame({ player1Id: p1, player2Id: p2, winnerId: p1, resultType: 'standard', cubeValue: 1, sequence: 1 });
    expect(game.id).toBeTruthy();
    expect(game.player1Id).toBe(p1);
    expect(game.player2Id).toBe(p2);
    expect(game.winnerId).toBe(p1);
    expect(game.resultType).toBe('standard');
    expect(game.cubeValue).toBe(1);
    expect(game.matchPoints).toBe(1);
    expect(typeof game.timestamp).toBe('number');
    expect(game.sequence).toBe(1);
  });

  it('computes matchPoints correctly (gammon × 4 = 8)', () => {
    const game = createGame({ player1Id: p1, player2Id: p2, winnerId: p2, resultType: 'gammon', cubeValue: 4, sequence: 2 });
    expect(game.matchPoints).toBe(8);
  });

  it('throws when player1Id equals player2Id', () => {
    expect(() => createGame({ player1Id: p1, player2Id: p1, winnerId: p1, resultType: 'standard', cubeValue: 1, sequence: 1 })).toThrow();
  });

  it('throws when winnerId is not one of the players', () => {
    expect(() => createGame({ player1Id: p1, player2Id: p2, winnerId: 'other', resultType: 'standard', cubeValue: 1, sequence: 1 })).toThrow();
  });

  it('throws on invalid cubeValue', () => {
    expect(() => createGame({ player1Id: p1, player2Id: p2, winnerId: p1, resultType: 'standard', cubeValue: 5, sequence: 1 })).toThrow();
  });

  it('throws on invalid resultType', () => {
    expect(() => createGame({ player1Id: p1, player2Id: p2, winnerId: p1, resultType: 'draw', cubeValue: 1, sequence: 1 })).toThrow();
  });
});

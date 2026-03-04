import { describe, it, expect } from 'vitest';
import { generateSchedule, getPairingStatus } from '../../src/models/roundRobin.js';

const p = (id, name) => ({ id, name });

describe('generateSchedule', () => {
  it('returns an empty array for fewer than 2 players', () => {
    expect(generateSchedule([])).toHaveLength(0);
    expect(generateSchedule([p('p1', 'Alice')])).toHaveLength(0);
  });

  it('produces 1 pairing for 2 players', () => {
    const schedule = generateSchedule([p('p1', 'Alice'), p('p2', 'Bob')]);
    expect(schedule).toHaveLength(1);
  });

  it('produces 3 pairings for 3 players (N×(N-1)/2)', () => {
    const schedule = generateSchedule([p('p1', 'A'), p('p2', 'B'), p('p3', 'C')]);
    expect(schedule).toHaveLength(3);
  });

  it('produces 6 pairings for 4 players', () => {
    const players = [p('p1', 'A'), p('p2', 'B'), p('p3', 'C'), p('p4', 'D')];
    expect(generateSchedule(players)).toHaveLength(6);
  });

  it('produces 10 pairings for 5 players', () => {
    const players = [p('p1','A'), p('p2','B'), p('p3','C'), p('p4','D'), p('p5','E')];
    expect(generateSchedule(players)).toHaveLength(10);
  });

  it('produces no self-pairings', () => {
    const players = [p('p1', 'A'), p('p2', 'B'), p('p3', 'C')];
    const schedule = generateSchedule(players);
    schedule.forEach(({ player1Id, player2Id }) => {
      expect(player1Id).not.toBe(player2Id);
    });
  });

  it('produces no duplicate pairings', () => {
    const players = [p('p1', 'A'), p('p2', 'B'), p('p3', 'C'), p('p4', 'D')];
    const schedule = generateSchedule(players);
    const pairs = schedule.map(({ player1Id, player2Id }) =>
      [player1Id, player2Id].sort().join(':'),
    );
    const uniquePairs = new Set(pairs);
    expect(uniquePairs.size).toBe(schedule.length);
  });

  it('each pairing has player1Id, player2Id, and an id field', () => {
    const schedule = generateSchedule([p('p1', 'Alice'), p('p2', 'Bob')]);
    expect(schedule[0]).toHaveProperty('player1Id');
    expect(schedule[0]).toHaveProperty('player2Id');
    expect(schedule[0]).toHaveProperty('id');
  });
});

describe('getPairingStatus', () => {
  const players = [p('p1', 'Alice'), p('p2', 'Bob'), p('p3', 'Charlie')];

  it('returns pending for all pairings when no games have been played', () => {
    const sched = generateSchedule(players);
    const result = getPairingStatus(sched, []);
    result.forEach(({ status }) => expect(status).toBe('pending'));
  });

  it('marks a pairing as complete when a game involving both players is recorded', () => {
    const sched = generateSchedule(players);
    const firstPairing = sched[0];
    const games = [
      {
        id: 'g1',
        player1Id: firstPairing.player1Id,
        player2Id: firstPairing.player2Id,
        winnerId: firstPairing.player1Id,
        resultType: 'standard',
        cubeValue: 1,
        matchPoints: 1,
        timestamp: Date.now(),
        sequence: 1,
      },
    ];

    const result = getPairingStatus(sched, games);
    const target = result.find((p) => p.id === firstPairing.id);
    expect(target.status).toBe('complete');
  });

  it('marks remaining pairings as pending when only one game recorded', () => {
    const sched = generateSchedule(players);
    const firstPairing = sched[0];
    const games = [
      {
        id: 'g1',
        player1Id: firstPairing.player1Id,
        player2Id: firstPairing.player2Id,
        winnerId: firstPairing.player1Id,
        resultType: 'standard',
        cubeValue: 1,
        matchPoints: 1,
        timestamp: Date.now(),
        sequence: 1,
      },
    ];

    const result = getPairingStatus(sched, games);
    const pendingCount = result.filter((p) => p.status === 'pending').length;
    expect(pendingCount).toBe(sched.length - 1);
  });

  it('returns an array of the same length as the schedule', () => {
    const sched = generateSchedule(players);
    const result = getPairingStatus(sched, []);
    expect(result).toHaveLength(sched.length);
  });
});

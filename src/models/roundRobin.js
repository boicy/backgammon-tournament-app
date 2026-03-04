import { generateId } from '../utils.js';

/**
 * Generate all unique pairings for a round-robin tournament.
 * Returns N×(N-1)/2 pairings for N players.
 */
export function generateSchedule(players) {
  if (players.length < 2) return [];
  const pairings = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      pairings.push({
        id: generateId(),
        player1Id: players[i].id,
        player2Id: players[j].id,
      });
    }
  }
  return pairings;
}

/**
 * Determine the status of each pairing based on recorded games.
 * A pairing is 'complete' if at least one game has been recorded
 * between the two players; otherwise 'pending'.
 */
export function getPairingStatus(schedule, games) {
  return schedule.map((pairing) => {
    const hasGame = games.some(
      (g) =>
        (g.player1Id === pairing.player1Id && g.player2Id === pairing.player2Id) ||
        (g.player1Id === pairing.player2Id && g.player2Id === pairing.player1Id),
    );
    return { ...pairing, status: hasGame ? 'complete' : 'pending' };
  });
}

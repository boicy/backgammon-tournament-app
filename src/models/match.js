/**
 * Match model for match-mode tournament nights.
 */

/**
 * Creates a new Match object in active state.
 *
 * @param {string} player1Id
 * @param {string} player2Id
 * @param {number} targetScore - integer >= 1
 * @returns {object} Match
 */
export function createMatch(player1Id, player2Id, targetScore) {
  if (!player1Id || !player2Id) throw new Error('Both players are required');
  if (player1Id === player2Id) throw new Error('Players must be different');
  if (!Number.isInteger(targetScore) || targetScore < 1) {
    throw new Error('Target score must be at least 1');
  }
  return {
    id: crypto.randomUUID(),
    player1Id,
    player2Id,
    targetScore,
    status: 'active',
    winnerId: null,
    startedAt: Date.now(),
    completedAt: null,
    games: [],
  };
}

/**
 * Returns true if one player's cumulative match points >= targetScore.
 *
 * @param {object} match
 * @returns {boolean}
 */
export function isMatchComplete(match) {
  const p1Points = match.games
    .filter((g) => g.winnerId === match.player1Id)
    .reduce((sum, g) => sum + g.matchPoints, 0);
  const p2Points = match.games
    .filter((g) => g.winnerId === match.player2Id)
    .reduce((sum, g) => sum + g.matchPoints, 0);
  return p1Points >= match.targetScore || p2Points >= match.targetScore;
}

/**
 * Returns the playerId of the first player to reach targetScore, or null.
 *
 * @param {object} match
 * @returns {string|null}
 */
export function matchWinner(match) {
  const p1Points = match.games
    .filter((g) => g.winnerId === match.player1Id)
    .reduce((sum, g) => sum + g.matchPoints, 0);
  const p2Points = match.games
    .filter((g) => g.winnerId === match.player2Id)
    .reduce((sum, g) => sum + g.matchPoints, 0);
  if (p1Points >= match.targetScore) return match.player1Id;
  if (p2Points >= match.targetScore) return match.player2Id;
  return null;
}

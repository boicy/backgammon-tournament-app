/**
 * Derives the night leaderboard from players and matches.
 * Only 'complete' matches contribute to standings.
 * Ranking: match wins DESC, then total points scored DESC.
 */

/**
 * @param {object[]} players
 * @param {object[]} matches
 * @returns {object[]} Standing[] sorted by wins DESC then matchPoints DESC
 */
export function deriveMatchStandings(players, matches) {
  if (players.length === 0) return [];

  // Only completed matches count
  const completed = matches.filter((m) => m.status === 'complete');

  // Build per-player stats
  const stats = players.map((player) => {
    const wins = completed.filter((m) => m.winnerId === player.id).length;
    const losses = completed.filter(
      (m) => (m.player1Id === player.id || m.player2Id === player.id) && m.winnerId !== player.id && m.winnerId !== null,
    ).length;
    const matchPoints = completed.reduce((sum, m) => {
      return sum + m.games
        .filter((g) => g.winnerId === player.id)
        .reduce((s, g) => s + g.matchPoints, 0);
    }, 0);

    return { playerId: player.id, name: player.name, wins, losses, matchPoints };
  });

  // Sort: wins DESC, then matchPoints DESC
  stats.sort((a, b) => b.wins - a.wins || b.matchPoints - a.matchPoints);

  return stats.map((s, i) => ({ ...s, rank: i + 1 }));
}

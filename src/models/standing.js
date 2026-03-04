export function deriveStandings(players, games) {
  const stats = Object.fromEntries(
    players.map(p => [p.id, { playerId: p.id, name: p.name, matchPoints: 0, wins: 0, losses: 0, gamesPlayed: 0 }])
  );

  for (const game of games) {
    const loserId = game.player1Id === game.winnerId ? game.player2Id : game.player1Id;
    if (stats[game.winnerId]) {
      stats[game.winnerId].wins += 1;
      stats[game.winnerId].matchPoints += game.matchPoints;
      stats[game.winnerId].gamesPlayed += 1;
    }
    if (stats[loserId]) {
      stats[loserId].losses += 1;
      stats[loserId].gamesPlayed += 1;
    }
  }

  return Object.values(stats)
    .sort((a, b) => b.matchPoints - a.matchPoints || a.losses - b.losses)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

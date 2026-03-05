import { deriveMatchStandings } from './matchStanding.js';

/**
 * Derives the cross-tournament All-Time leaderboard.
 *
 * @param {object[]} archive           - Array of TournamentSnapshot objects
 * @param {object|null} activeTournament
 * @param {object[]} activePlayers
 * @param {object[]} activeMatches     - Match objects from the active tournament
 * @returns {object[]} AllTimeStanding[] sorted by tournamentWins DESC, cumulativePoints DESC
 */
export function deriveAllTimeStandings(archive, activeTournament, activePlayers, activeMatches) {
  // Map: normalised name → accumulated stats
  const map = new Map();

  // Helper: get or create entry keyed by normalised name
  function entry(name) {
    const key = name.trim().toLowerCase();
    if (!map.has(key)) {
      map.set(key, { key, name, tournamentWins: 0, cumulativePoints: 0, tournamentsPlayed: 0, lastSeenAt: 0 });
    }
    return map.get(key);
  }

  // Process archived tournaments in archivedAt order (oldest to newest)
  const sortedArchive = [...archive].sort((a, b) => a.archivedAt - b.archivedAt);

  for (const snapshot of sortedArchive) {
    for (const standing of snapshot.finalStandings) {
      const e = entry(standing.name);
      e.cumulativePoints += standing.matchPoints;
      e.tournamentsPlayed += 1;
      e.lastSeenAt = snapshot.archivedAt;
      e.name = standing.name; // update display name to most recent
    }

    // Credit tournament win to the winner
    if (snapshot.winnerName) {
      const winnerEntry = entry(snapshot.winnerName);
      winnerEntry.tournamentWins += 1;
    }
  }

  // Overlay active tournament in-progress results (points only, NOT wins)
  if (activeTournament !== null) {
    const activeStandings = deriveMatchStandings(activePlayers, activeMatches ?? []);
    const activeAt = Date.now() + 1; // ensures active tournament counts as most recent
    for (const standing of activeStandings) {
      const e = entry(standing.name);
      e.cumulativePoints += standing.matchPoints;
      if (e.lastSeenAt === 0) {
        // First seen in active tournament
        e.tournamentsPlayed += 1;
      } else if (!sortedArchive.some((snap) =>
        snap.finalStandings.some((s) => s.name.trim().toLowerCase() === standing.name.trim().toLowerCase())
      )) {
        // Not seen in any archived tournament, only in active
        e.tournamentsPlayed += 1;
      }
      // Update display name to active tournament's capitalisation (most recent)
      e.name = standing.name;
      e.lastSeenAt = activeAt;
    }
  }

  if (map.size === 0) return [];

  // Build sorted array
  const result = Array.from(map.values())
    .sort((a, b) => b.tournamentWins - a.tournamentWins || b.cumulativePoints - a.cumulativePoints)
    .map((e, i) => ({
      name: e.name,
      tournamentWins: e.tournamentWins,
      cumulativePoints: e.cumulativePoints,
      tournamentsPlayed: e.tournamentsPlayed,
      rank: i + 1,
    }));

  return result;
}

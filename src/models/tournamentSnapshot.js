import { deriveMatchStandings } from './matchStanding.js';

/**
 * Creates an immutable snapshot of a completed tournament (match-mode).
 * Caller must ensure players.length >= 1 and matches.length >= 1.
 *
 * @param {object} tournament
 * @param {object[]} players
 * @param {object[]} matches  - array of Match objects (complete or abandoned)
 * @returns {object} TournamentSnapshot
 */
export function createSnapshot(tournament, players, matches) {
  const playersCopy = JSON.parse(JSON.stringify(players));
  const matchesCopy = JSON.parse(JSON.stringify(matches));

  const finalStandings = deriveMatchStandings(playersCopy, matchesCopy);
  // Only credit a winner if someone actually won at least one match
  const topStanding = finalStandings.length > 0 ? finalStandings[0] : null;
  const winnerName = topStanding && topStanding.wins > 0 ? topStanding.name : null;
  const gameCount = matchesCopy.reduce((sum, m) => sum + (m.games ? m.games.length : 0), 0);

  return {
    id: tournament.id,
    name: tournament.name,
    date: tournament.date,
    archivedAt: Date.now(),
    players: playersCopy,
    matches: matchesCopy,
    finalStandings,
    winnerName,
    gameCount,
  };
}

/**
 * Returns the name of the winner from a snapshot's finalStandings,
 * or null if standings are empty.
 *
 * @param {object} snapshot
 * @returns {string|null}
 */
export function snapshotWinner(snapshot) {
  if (!snapshot || !snapshot.finalStandings || snapshot.finalStandings.length === 0) {
    return null;
  }
  return snapshot.finalStandings[0].name;
}

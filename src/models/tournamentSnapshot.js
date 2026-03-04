import { deriveStandings } from './standing.js';

/**
 * Creates an immutable snapshot of a completed tournament.
 * Caller must ensure players.length >= 1 and games.length >= 1.
 *
 * @param {object} tournament
 * @param {object[]} players
 * @param {object[]} games
 * @returns {object} TournamentSnapshot
 */
export function createSnapshot(tournament, players, games) {
  const playersCopy = JSON.parse(JSON.stringify(players));
  const gamesCopy = JSON.parse(JSON.stringify(games));
  const finalStandings = deriveStandings(playersCopy, gamesCopy);
  const winnerName = finalStandings.length > 0 ? finalStandings[0].name : null;

  return {
    id: tournament.id,
    name: tournament.name,
    date: tournament.date,
    archivedAt: Date.now(),
    players: playersCopy,
    games: gamesCopy,
    finalStandings,
    winnerName,
    gameCount: games.length,
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

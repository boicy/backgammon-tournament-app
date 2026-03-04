import { createTournament } from '../models/tournament.js';
import { createPlayer, validatePlayerName } from '../models/player.js';
import { createGame } from '../models/game.js';
import { deriveStandings } from '../models/standing.js';
import { generateSchedule } from '../models/roundRobin.js';
import { createSnapshot } from '../models/tournamentSnapshot.js';
import { eventBus } from './eventBus.js';

const KEYS = {
  tournament: 'backgammon:tournament',
  players: 'backgammon:players',
  games: 'backgammon:games',
  archive: 'backgammon:archive',
  roster: 'backgammon:roster',
};

let state = {
  tournament: null,
  players: [],
  games: [],
  schedule: null,   // null = round-robin disabled; array = enabled
  archive: [],
  roster: [],
};

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

function persist(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_err) {
    // QuotaExceededError or SecurityError — in-memory state is still valid
  }
}

function persistAll() {
  persist(KEYS.tournament, state.tournament);
  persist(KEYS.players, state.players);
  persist(KEYS.games, state.games);
}

// ---------------------------------------------------------------------------
// Public read interface
// ---------------------------------------------------------------------------

export function getState() {
  return {
    tournament: state.tournament,
    players: [...state.players],
    games: [...state.games],
    standings: deriveStandings(state.players, state.games),
    schedule: state.schedule ? [...state.schedule] : null,
    archive: [...state.archive],
    roster: [...state.roster],
  };
}

// ---------------------------------------------------------------------------
// Load from localStorage (called on app startup / simulated reload in tests)
// ---------------------------------------------------------------------------

export function loadFromStorage() {
  try {
    const t = localStorage.getItem(KEYS.tournament);
    const p = localStorage.getItem(KEYS.players);
    const g = localStorage.getItem(KEYS.games);
    const a = localStorage.getItem(KEYS.archive);
    const r = localStorage.getItem(KEYS.roster);
    state = {
      tournament: t ? JSON.parse(t) : null,
      players: p ? JSON.parse(p) : [],
      games: g ? JSON.parse(g) : [],
      schedule: null,
      archive: a ? JSON.parse(a) : [],
      roster: r ? JSON.parse(r) : [],
    };
  } catch (_err) {
    state = { tournament: null, players: [], games: [], schedule: null, archive: [], roster: [] };
  }
}

// ---------------------------------------------------------------------------
// Test helper — resets module state between test cases
// ---------------------------------------------------------------------------

export function resetForTesting() {
  state = { tournament: null, players: [], games: [], schedule: null, archive: [], roster: [] };
}

// ---------------------------------------------------------------------------
// Internal archive helper (used by endTournament and auto-archive in initTournament)
// ---------------------------------------------------------------------------

function _archiveCurrentTournament() {
  const snapshot = createSnapshot(state.tournament, state.players, state.games);
  state.archive = [...state.archive, snapshot];
  persist(KEYS.archive, state.archive);
  // Update roster with any new player names
  for (const player of state.players) {
    const normalised = player.name.trim().toLowerCase();
    const alreadyInRoster = state.roster.some((n) => n.trim().toLowerCase() === normalised);
    if (!alreadyInRoster) {
      state.roster = [...state.roster, player.name];
    }
  }
  persist(KEYS.roster, state.roster);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function initTournament(name) {
  const trimmed = (name ?? '').trim();
  if (!trimmed) throw new Error('Tournament name is required');
  if (trimmed.length > 100) throw new Error('Tournament name too long');

  // Auto-archive current tournament if it has players AND games
  if (state.tournament !== null && state.players.length >= 1 && state.games.length >= 1) {
    _archiveCurrentTournament();
    eventBus.emit('state:archive:changed');
  }

  const tournament = createTournament(trimmed);
  state = { ...state, tournament, players: [], games: [], schedule: null };
  persistAll();
  eventBus.emit('state:reset');
}

export function addPlayer(name) {
  validatePlayerName(name, state.players); // throws on error
  const player = createPlayer(name, state.players);
  state.players = [...state.players, player];
  persist(KEYS.players, state.players);

  // Update roster if name is new (case-insensitive dedup)
  const normalised = player.name.trim().toLowerCase();
  const alreadyInRoster = state.roster.some((n) => n.trim().toLowerCase() === normalised);
  if (!alreadyInRoster) {
    state.roster = [...state.roster, player.name];
    persist(KEYS.roster, state.roster);
  }

  eventBus.emit('state:players:changed', { players: state.players });
}

export function removePlayer(playerId) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error('Player not found');

  const hasGames = state.games.some(
    (g) => g.player1Id === playerId || g.player2Id === playerId,
  );
  if (hasGames) throw new Error('Cannot remove a player with recorded games');

  state.players = state.players.filter((p) => p.id !== playerId);
  persist(KEYS.players, state.players);
  eventBus.emit('state:players:changed', { players: state.players });
}

export function recordGame(gameData) {
  const sequence = state.games.length + 1;
  const game = createGame({ ...gameData, sequence }); // throws on invalid data
  state.games = [...state.games, game];
  persist(KEYS.games, state.games);
  eventBus.emit('state:games:changed', { games: state.games });
  eventBus.emit('state:standings:changed', { standings: deriveStandings(state.players, state.games) });
}

export function deleteGame(gameId) {
  const idx = state.games.findIndex((g) => g.id === gameId);
  if (idx === -1) throw new Error('Game not found');

  state.games = state.games.filter((g) => g.id !== gameId);
  persist(KEYS.games, state.games);
  eventBus.emit('state:games:changed', { games: state.games });
  eventBus.emit('state:standings:changed', { standings: deriveStandings(state.players, state.games) });
}

export function endTournament() {
  if (state.tournament !== null && state.players.length >= 1 && state.games.length >= 1) {
    _archiveCurrentTournament();
    eventBus.emit('state:archive:changed');
  }

  // Clear active tournament in all cases
  state = { ...state, tournament: null, players: [], games: [], schedule: null };
  localStorage.removeItem(KEYS.tournament);
  localStorage.removeItem(KEYS.players);
  localStorage.removeItem(KEYS.games);
  eventBus.emit('state:reset');
}

export function resetTournament() {
  state = { ...state, tournament: null, players: [], games: [], schedule: null };
  localStorage.removeItem(KEYS.tournament);
  localStorage.removeItem(KEYS.players);
  localStorage.removeItem(KEYS.games);
  eventBus.emit('state:reset');
}

// ---------------------------------------------------------------------------
// Round-Robin actions
// ---------------------------------------------------------------------------

export function enableRoundRobin() {
  state.schedule = generateSchedule(state.players);
  eventBus.emit('state:schedule:changed', { schedule: state.schedule });
}

export function disableRoundRobin() {
  state.schedule = null;
  eventBus.emit('state:schedule:changed', { schedule: null });
}

import { createTournament } from '../models/tournament.js';
import { createPlayer, validatePlayerName } from '../models/player.js';
import { createGame } from '../models/game.js';
import { createMatch, isMatchComplete, matchWinner, earlyMatchWinner } from '../models/match.js';
import { deriveMatchStandings } from '../models/matchStanding.js';
import { generateSchedule } from '../models/roundRobin.js';
import { createSnapshot } from '../models/tournamentSnapshot.js';
import { generateTournamentName } from '../utils.js';
import { eventBus } from './eventBus.js';

const KEYS = {
  tournament: 'backgammon:tournament',
  players: 'backgammon:players',
  matches: 'backgammon:matches',
  archive: 'backgammon:archive',
  roster: 'backgammon:roster',
};

let state = {
  tournament: null,
  players: [],
  matches: [],
  selectedMatchId: null,
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
  persist(KEYS.matches, state.matches);
}

// ---------------------------------------------------------------------------
// Public read interface
// ---------------------------------------------------------------------------

export function getState() {
  return {
    tournament: state.tournament,
    players: [...state.players],
    matches: [...state.matches],
    selectedMatchId: state.selectedMatchId,
    standings: deriveMatchStandings(state.players, state.matches),
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
    const m = localStorage.getItem(KEYS.matches);
    const a = localStorage.getItem(KEYS.archive);
    const r = localStorage.getItem(KEYS.roster);
    // Legacy backgammon:games key is silently ignored (not deleted, not read)
    state = {
      tournament: t ? JSON.parse(t) : null,
      players: p ? JSON.parse(p) : [],
      matches: m ? JSON.parse(m) : [],
      selectedMatchId: null,
      schedule: null,
      archive: a ? JSON.parse(a) : [],
      roster: r ? JSON.parse(r) : [],
    };
  } catch (_err) {
    state = { tournament: null, players: [], matches: [], selectedMatchId: null, schedule: null, archive: [], roster: [] };
  }
}

// ---------------------------------------------------------------------------
// Test helper — resets module state between test cases
// ---------------------------------------------------------------------------

export function resetForTesting() {
  state = { tournament: null, players: [], matches: [], selectedMatchId: null, schedule: null, archive: [], roster: [] };
}

// ---------------------------------------------------------------------------
// Internal archive helper (used by endTournament and auto-archive in initTournament)
// ---------------------------------------------------------------------------

function _archiveCurrentTournament() {
  const snapshot = createSnapshot(state.tournament, state.players, state.matches);
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

export function initTournament() {
  const name = generateTournamentName();

  // Auto-archive current tournament if it has players AND matches
  if (state.tournament !== null && state.players.length >= 1 && state.matches.length >= 1) {
    _archiveCurrentTournament();
    eventBus.emit('state:archive:changed');
  }

  const tournament = createTournament(name);
  state = { ...state, tournament, players: [], matches: [], selectedMatchId: null, schedule: null };
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

  // FR-009: block removal if player has an active match
  const hasActiveMatch = state.matches.some(
    (m) => m.status === 'active' && (m.player1Id === playerId || m.player2Id === playerId),
  );
  if (hasActiveMatch) throw new Error('Cannot remove a player with an active match');

  state.players = state.players.filter((p) => p.id !== playerId);
  persist(KEYS.players, state.players);
  eventBus.emit('state:players:changed', { players: state.players });
}

// ---------------------------------------------------------------------------
// Match actions
// ---------------------------------------------------------------------------

export function startMatch(player1Id, player2Id, targetScore) {
  const p1 = state.players.find((p) => p.id === player1Id);
  const p2 = state.players.find((p) => p.id === player2Id);
  if (!p1) throw new Error('Player not found');
  if (!p2) throw new Error('Player not found');
  if (player1Id === player2Id) throw new Error('Players must be different');
  if (!Number.isInteger(targetScore) || targetScore < 1) {
    throw new Error('Target score must be at least 1');
  }

  // FR-004: prevent duplicate active match between the same player pair
  const duplicateMatch = state.matches.find(
    (m) => m.status === 'active' && (
      (m.player1Id === player1Id && m.player2Id === player2Id) ||
      (m.player1Id === player2Id && m.player2Id === player1Id)
    ),
  );
  if (duplicateMatch) throw new Error('An active match between these players already exists');

  const match = createMatch(player1Id, player2Id, targetScore);
  state.matches = [...state.matches, match];
  persist(KEYS.matches, state.matches);
  eventBus.emit('state:matches:changed', { matches: state.matches });
}

export function recordMatchGame(matchId, gameData) {
  const matchIndex = state.matches.findIndex((m) => m.id === matchId);
  if (matchIndex === -1) throw new Error('Match not found');

  const match = state.matches[matchIndex];
  if (match.status !== 'active') throw new Error('Match is not active');

  const { winnerId, resultType, cubeValue } = gameData;
  const sequence = match.games.length + 1;
  const game = createGame({
    player1Id: match.player1Id,
    player2Id: match.player2Id,
    winnerId,
    resultType,
    cubeValue,
    sequence,
  });

  let updatedMatch = { ...match, games: [...match.games, game] };

  // Auto-complete if target reached
  if (isMatchComplete(updatedMatch)) {
    updatedMatch = {
      ...updatedMatch,
      status: 'complete',
      winnerId: matchWinner(updatedMatch),
      completedAt: Date.now(),
    };
  }

  state.matches = [
    ...state.matches.slice(0, matchIndex),
    updatedMatch,
    ...state.matches.slice(matchIndex + 1),
  ];
  persist(KEYS.matches, state.matches);
  eventBus.emit('state:matches:changed', { matches: state.matches });
  eventBus.emit('state:standings:changed', { standings: deriveMatchStandings(state.players, state.matches) });
}

export function abandonMatch(matchId) {
  const matchIndex = state.matches.findIndex((m) => m.id === matchId);
  if (matchIndex === -1) throw new Error('Match not found');

  const match = state.matches[matchIndex];
  if (match.status !== 'active') throw new Error('Match is not active');

  const updatedMatch = { ...match, status: 'abandoned' };
  state.matches = [
    ...state.matches.slice(0, matchIndex),
    updatedMatch,
    ...state.matches.slice(matchIndex + 1),
  ];
  persist(KEYS.matches, state.matches);
  eventBus.emit('state:matches:changed', { matches: state.matches });
  eventBus.emit('state:standings:changed', { standings: deriveMatchStandings(state.players, state.matches) });
}

export function endMatchEarly(matchId) {
  const matchIndex = state.matches.findIndex((m) => m.id === matchId);
  if (matchIndex === -1) throw new Error('Match not found');

  const match = state.matches[matchIndex];
  if (match.status !== 'active') throw new Error('Match is not active');

  let updatedMatch;
  if (match.games.length === 0) {
    updatedMatch = { ...match, status: 'abandoned', winnerId: null };
  } else {
    updatedMatch = {
      ...match,
      status: 'complete',
      endedEarly: true,
      winnerId: earlyMatchWinner(match),
      completedAt: Date.now(),
    };
  }

  state.matches = [
    ...state.matches.slice(0, matchIndex),
    updatedMatch,
    ...state.matches.slice(matchIndex + 1),
  ];
  persist(KEYS.matches, state.matches);
  eventBus.emit('state:matches:changed', { matches: state.matches });
  eventBus.emit('state:standings:changed', { standings: deriveMatchStandings(state.players, state.matches) });
}

export function selectMatch(matchId) {
  state.selectedMatchId = matchId;
  eventBus.emit('state:selectedMatch:changed', { matchId });
}

// ---------------------------------------------------------------------------
// Tournament lifecycle
// ---------------------------------------------------------------------------

export function endTournament() {
  if (state.tournament !== null && state.players.length >= 1 && state.matches.length >= 1) {
    _archiveCurrentTournament();
    eventBus.emit('state:archive:changed');
  }

  // Clear active tournament in all cases
  state = { ...state, tournament: null, players: [], matches: [], selectedMatchId: null, schedule: null };
  localStorage.removeItem(KEYS.tournament);
  localStorage.removeItem(KEYS.players);
  localStorage.removeItem(KEYS.matches);
  eventBus.emit('state:reset');
}

export function resetTournament() {
  state = { ...state, players: [], matches: [], selectedMatchId: null, schedule: null };
  persist(KEYS.tournament, state.tournament);
  localStorage.removeItem(KEYS.players);
  localStorage.removeItem(KEYS.matches);
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

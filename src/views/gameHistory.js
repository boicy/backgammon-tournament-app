import { getState } from '../store/store.js';
import { eventBus } from '../store/eventBus.js';
import { escapeHtml, formatTimestamp } from '../utils.js';

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

function playerName(players, playerId) {
  return players.find((p) => p.id === playerId)?.name ?? 'Unknown';
}

function matchStatusLabel(match) {
  if (match.endedEarly) return 'Ended Early';
  if (match.status === 'complete') return 'Complete';
  if (match.status === 'abandoned') return 'Abandoned';
  return 'Active';
}

function gameItemHtml(game, players) {
  const winnerName = escapeHtml(playerName(players, game.winnerId));
  const loserName = escapeHtml(
    playerName(players, game.player1Id === game.winnerId ? game.player2Id : game.player1Id),
  );
  const resultLabel = game.resultType.charAt(0).toUpperCase() + game.resultType.slice(1);
  const time = formatTimestamp(game.timestamp);

  return `
    <li class="history-item" data-game-id="${escapeHtml(game.id)}">
      <div class="history-summary">
        <span class="history-winner">${winnerName}</span>
        <span class="history-vs"> beat </span>
        <span>${loserName}</span>
        <span class="history-detail"> · ${resultLabel}×${game.cubeValue} = ${game.matchPoints} pts</span>
        <span class="history-time"> · ${time}</span>
      </div>
    </li>`;
}

function matchGroupHtml(match, players) {
  const p1Name = escapeHtml(playerName(players, match.player1Id));
  const p2Name = escapeHtml(playerName(players, match.player2Id));
  const status = matchStatusLabel(match);
  const winnerName = match.winnerId ? escapeHtml(playerName(players, match.winnerId)) : null;
  let winnerBadge;
  if (match.endedEarly) {
    const label = winnerName ? `${winnerName} wins · Ended Early` : 'Ended Early';
    winnerBadge = `<span class="badge badge-ended-early">${label}</span>`;
  } else if (winnerName) {
    winnerBadge = `<span class="badge badge-winner">${winnerName} wins</span>`;
  } else {
    winnerBadge = `<span class="badge badge-${match.status}">${status}</span>`;
  }

  const gamesHtml =
    match.games.length === 0
      ? '<p class="empty-state">No games recorded.</p>'
      : `<ul class="history-list">${[...match.games]
          .reverse()
          .map((g) => gameItemHtml(g, players))
          .join('')}</ul>`;

  return `
    <div class="match-group" data-match-id="${escapeHtml(match.id)}">
      <div class="match-group-header">
        <span class="match-group-players">${p1Name} vs ${p2Name}</span>
        <span class="match-group-target">First to ${match.targetScore}</span>
        ${winnerBadge}
      </div>
      ${gamesHtml}
    </div>`;
}

function historyHtml(matches, players) {
  if (matches.length === 0) {
    return '<p class="empty-state">No matches recorded yet.</p>';
  }
  // Most recent match first
  return [...matches].reverse().map((m) => matchGroupHtml(m, players)).join('');
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

let _container = null;
let _matchesChangedHandler = null;

function rebuildList(container) {
  const { matches, players } = getState();
  const listWrapper = container.querySelector('[data-history-list]');
  if (listWrapper) listWrapper.innerHTML = historyHtml(matches, players);
}

export function render(container) {
  const { matches, players, tournament } = getState();

  if (!tournament) {
    container.innerHTML = `
      <section class="view view--history" aria-label="Game History">
        <div class="empty-state-card">
          <h2>Game History</h2>
          <p>No tournament running. Start one to record matches and games.</p>
          <a href="#/start" class="btn btn-primary">Start a Tournament</a>
        </div>
      </section>`;
    return;
  }

  container.innerHTML = `
    <section class="view view--history" aria-label="Game History">
      <h2>Game History</h2>
      <div data-history-list>
        ${historyHtml(matches, players)}
      </div>
    </section>`;
}

export function onMount(container) {
  _container = container;
  _matchesChangedHandler = () => rebuildList(container);
  eventBus.on('state:matches:changed', _matchesChangedHandler);
  eventBus.on('state:reset', _matchesChangedHandler);
}

export function onUnmount() {
  if (_matchesChangedHandler) {
    eventBus.off('state:matches:changed', _matchesChangedHandler);
    eventBus.off('state:reset', _matchesChangedHandler);
    _matchesChangedHandler = null;
  }
  _container = null;
}

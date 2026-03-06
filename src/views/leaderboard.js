import { getState } from '../store/store.js';
import { eventBus } from '../store/eventBus.js';
import { escapeHtml } from '../utils.js';
import { getPairingStatus } from '../models/roundRobin.js';

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

function liveCell(playerId, matches, players) {
  const match = matches.find(
    (m) => m.status === 'active' && (m.player1Id === playerId || m.player2Id === playerId),
  );
  if (!match) return '—';

  const opponentId = match.player1Id === playerId ? match.player2Id : match.player1Id;
  const opponentName = playerName(players, opponentId);

  let myScore = 0;
  let oppScore = 0;
  for (const g of match.games) {
    if (g.winnerId === playerId) myScore += g.matchPoints;
    else if (g.winnerId === opponentId) oppScore += g.matchPoints;
  }

  return `vs ${escapeHtml(opponentName)} ${myScore}–${oppScore}`;
}

function tbodyHtml(standings, matches = [], players = []) {
  if (standings.length === 0) {
    return `<tr><td colspan="5" class="empty-state">No players yet — add players to see standings.</td></tr>`;
  }
  return standings
    .map(
      (s) => `
      <tr class="${s.rank === 1 ? 'rank-1' : ''}" data-rank="${s.rank}">
        <td class="rank-cell">${s.rank}</td>
        <td>${escapeHtml(s.name)}</td>
        <td class="pts-cell">${s.matchPoints}</td>
        <td>${s.wins}</td>
        <td class="live-cell">${liveCell(s.playerId, matches, players)}</td>
      </tr>`,
    )
    .join('');
}

function playerName(players, id) {
  return players.find((p) => p.id === id)?.name ?? id;
}

function schedulePanelHtml(schedule, games, players) {
  if (!schedule || schedule.length === 0) return '';

  const pairings = getPairingStatus(schedule, games);
  const rows = pairings
    .map(
      (p) => `
      <li class="schedule-pairing">
        <span class="pairing-players">${escapeHtml(playerName(players, p.player1Id))} vs ${escapeHtml(playerName(players, p.player2Id))}</span>
        <span class="badge badge-${p.status}">${p.status}</span>
      </li>`,
    )
    .join('');

  return `
    <div class="schedule-panel" id="schedule-panel">
      <h3>Round-Robin Schedule</h3>
      <ul class="schedule-list">${rows}</ul>
    </div>`;
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

let _standingsChangedHandler = null;
let _scheduleChangedHandler = null;

export function render(container) {
  const { standings, schedule, matches, players } = getState();
  container.innerHTML = `
    <section class="view view--leaderboard" aria-label="Leaderboard">
      <h2>Leaderboard</h2>
      <div class="leaderboard-wrapper">
        <table class="leaderboard-table" aria-label="Tournament standings">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Player</th>
              <th scope="col">Points</th>
              <th scope="col">Match Wins</th>
              <th scope="col">Live</th>
            </tr>
          </thead>
          <tbody id="standings-body">
            ${tbodyHtml(standings, matches, players)}
          </tbody>
        </table>
      </div>
      <div id="schedule-wrapper">
        ${schedulePanelHtml(schedule, matches, players)}
      </div>
    </section>`;
}

export function onMount(container) {
  // Targeted update — only replace <tbody>, not the full view
  _standingsChangedHandler = () => {
    const tbody = container.querySelector('#standings-body');
    if (!tbody) return;
    const { standings, schedule, matches, players } = getState();
    tbody.innerHTML = tbodyHtml(standings, matches, players);
    // Also refresh schedule status (matches changed → pairing status may change)
    const wrapper = container.querySelector('#schedule-wrapper');
    if (wrapper) wrapper.innerHTML = schedulePanelHtml(schedule, matches, players);
  };

  _scheduleChangedHandler = () => {
    const wrapper = container.querySelector('#schedule-wrapper');
    if (!wrapper) return;
    const { schedule, matches, players } = getState();
    wrapper.innerHTML = schedulePanelHtml(schedule, matches, players);
  };

  eventBus.on('state:standings:changed', _standingsChangedHandler);
  eventBus.on('state:matches:changed', _standingsChangedHandler);
  eventBus.on('state:reset', _standingsChangedHandler);
  eventBus.on('state:schedule:changed', _scheduleChangedHandler);
}

export function onUnmount() {
  if (_standingsChangedHandler) {
    eventBus.off('state:standings:changed', _standingsChangedHandler);
    eventBus.off('state:matches:changed', _standingsChangedHandler);
    eventBus.off('state:reset', _standingsChangedHandler);
    _standingsChangedHandler = null;
  }
  if (_scheduleChangedHandler) {
    eventBus.off('state:schedule:changed', _scheduleChangedHandler);
    _scheduleChangedHandler = null;
  }
}

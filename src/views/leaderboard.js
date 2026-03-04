import { getState } from '../store/store.js';
import { eventBus } from '../store/eventBus.js';
import { escapeHtml } from '../utils.js';
import { getPairingStatus } from '../models/roundRobin.js';

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

function tbodyHtml(standings) {
  if (standings.length === 0) {
    return `<tr><td colspan="6" class="empty-state">No players yet — add players to see standings.</td></tr>`;
  }
  return standings
    .map(
      (s) => `
      <tr class="${s.rank === 1 ? 'rank-1' : ''}" data-rank="${s.rank}">
        <td class="rank-cell">${s.rank}</td>
        <td>${escapeHtml(s.name)}</td>
        <td class="pts-cell">${s.matchPoints}</td>
        <td>${s.wins}</td>
        <td>${s.losses}</td>
        <td>${s.gamesPlayed}</td>
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
  const { standings, schedule, games, players } = getState();
  container.innerHTML = `
    <section class="view view--leaderboard" aria-label="Leaderboard">
      <h2>Leaderboard</h2>
      <div class="leaderboard-wrapper">
        <table class="leaderboard-table" aria-label="Tournament standings">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Player</th>
              <th scope="col">Pts</th>
              <th scope="col">W</th>
              <th scope="col">L</th>
              <th scope="col">Played</th>
            </tr>
          </thead>
          <tbody id="standings-body">
            ${tbodyHtml(standings)}
          </tbody>
        </table>
      </div>
      <div id="schedule-wrapper">
        ${schedulePanelHtml(schedule, games, players)}
      </div>
    </section>`;
}

export function onMount(container) {
  // Targeted update — only replace <tbody>, not the full view
  _standingsChangedHandler = () => {
    const tbody = container.querySelector('#standings-body');
    if (!tbody) return;
    const { standings, schedule, games, players } = getState();
    tbody.innerHTML = tbodyHtml(standings);
    // Also refresh schedule status (games changed → pairing status may change)
    const wrapper = container.querySelector('#schedule-wrapper');
    if (wrapper) wrapper.innerHTML = schedulePanelHtml(schedule, games, players);
  };

  _scheduleChangedHandler = () => {
    const wrapper = container.querySelector('#schedule-wrapper');
    if (!wrapper) return;
    const { schedule, games, players } = getState();
    wrapper.innerHTML = schedulePanelHtml(schedule, games, players);
  };

  eventBus.on('state:standings:changed', _standingsChangedHandler);
  eventBus.on('state:reset', _standingsChangedHandler);
  eventBus.on('state:schedule:changed', _scheduleChangedHandler);
}

export function onUnmount() {
  if (_standingsChangedHandler) {
    eventBus.off('state:standings:changed', _standingsChangedHandler);
    eventBus.off('state:reset', _standingsChangedHandler);
    _standingsChangedHandler = null;
  }
  if (_scheduleChangedHandler) {
    eventBus.off('state:schedule:changed', _scheduleChangedHandler);
    _scheduleChangedHandler = null;
  }
}

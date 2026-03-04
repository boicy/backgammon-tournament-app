import { getState, addPlayer, removePlayer, resetTournament, enableRoundRobin, disableRoundRobin } from '../store/store.js';
import { eventBus } from '../store/eventBus.js';
import { escapeHtml } from '../utils.js';

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

function playerListHtml(players) {
  if (players.length === 0) {
    return '<p class="empty-state" data-testid="empty-state">No players yet — add one below.</p>';
  }
  const items = players
    .map(
      (p) => `
      <li class="player-item">
        <span class="player-name">${escapeHtml(p.name)}</span>
        <button class="btn btn-danger btn-sm" data-action="remove-player" data-player-id="${escapeHtml(p.id)}"
          aria-label="Remove ${escapeHtml(p.name)}">Remove</button>
      </li>`,
    )
    .join('');
  return `<ul class="player-list">${items}</ul>`;
}

function roundRobinHtml(schedule) {
  const enabled = Array.isArray(schedule) && schedule.length > 0;
  return `
    <div class="round-robin-section">
      <div class="toggle-row">
        <span class="toggle-label">Round-Robin Mode</span>
        <label class="toggle" aria-label="Toggle round-robin mode">
          <input type="checkbox" data-action="toggle-round-robin" ${enabled ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
      </div>
      ${enabled ? `<p class="info-message">${schedule.length} pairings generated. View the schedule on the Leaderboard.</p>` : ''}
    </div>`;
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

let _playersChangedHandler = null;
let _scheduleChangedHandler = null;

export function render(container) {
  const { players, schedule } = getState();
  container.innerHTML = `
    <section class="view view--players" aria-label="Player Registration">
      <h2>Players</h2>

      <div class="player-list-wrapper">
        ${playerListHtml(players)}
      </div>

      <div id="player-error" class="error-message" role="alert" aria-live="polite" data-error></div>

      <form class="add-player-form" id="add-player-form" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label for="player-name-input" class="visually-hidden">Player name</label>
            <input
              type="text"
              id="player-name-input"
              class="input"
              placeholder="Player name"
              maxlength="50"
              autocomplete="off"
              aria-label="Player name"
            />
          </div>
          <button type="submit" class="btn btn-primary" aria-label="Add player">Add Player</button>
        </div>
      </form>

      <div class="round-robin-wrapper">
        ${roundRobinHtml(schedule)}
      </div>

      <div class="danger-zone">
        <button class="btn btn-danger" data-action="reset-tournament" aria-label="Reset tournament">
          Reset Tournament
        </button>
      </div>
    </section>
  `;
}

export function onMount(container) {
  function showError(msg) {
    const el = container.querySelector('[data-error]');
    if (el) {
      el.textContent = msg;
      el.hidden = false;
    }
  }

  function clearError() {
    const el = container.querySelector('[data-error]');
    if (el) {
      el.textContent = '';
      el.hidden = true;
    }
  }

  function refreshList() {
    const { players } = getState();
    const wrapper = container.querySelector('.player-list-wrapper');
    if (wrapper) wrapper.innerHTML = playerListHtml(players);
  }

  function refreshRoundRobin() {
    const { schedule } = getState();
    const wrapper = container.querySelector('.round-robin-wrapper');
    if (wrapper) wrapper.innerHTML = roundRobinHtml(schedule);
  }

  // Form submit — add player
  const form = container.querySelector('#add-player-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = container.querySelector('#player-name-input');
      const name = (input?.value ?? '').trim();
      if (!name) return;
      clearError();
      try {
        addPlayer(name);
        if (input) input.value = '';
      } catch (err) {
        showError(err.message);
      }
    });
  }

  // Event delegation for buttons and toggles
  container.addEventListener('click', _handleClick);
  container.addEventListener('change', _handleChange);

  function _handleClick(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;

    if (action === 'remove-player') {
      const playerId = target.dataset.playerId;
      clearError();
      try {
        removePlayer(playerId);
      } catch (err) {
        showError(err.message);
      }
    }

    if (action === 'reset-tournament') {
      if (window.confirm('Reset the tournament? All players and game results will be deleted.')) {
        resetTournament();
      }
    }
  }

  function _handleChange(e) {
    if (e.target.matches('[data-action="toggle-round-robin"]')) {
      if (e.target.checked) {
        enableRoundRobin();
      } else {
        disableRoundRobin();
      }
    }
  }

  // Subscribe to state changes
  _playersChangedHandler = () => {
    refreshList();
    // If round-robin is active, rebuild the schedule when players change
    const { schedule } = getState();
    if (schedule !== null) enableRoundRobin();
  };
  _scheduleChangedHandler = () => refreshRoundRobin();

  eventBus.on('state:players:changed', _playersChangedHandler);
  eventBus.on('state:reset', _playersChangedHandler);
  eventBus.on('state:schedule:changed', _scheduleChangedHandler);

  container._handleClick = _handleClick;
  container._handleChange = _handleChange;
}

export function onUnmount() {
  if (_playersChangedHandler) {
    eventBus.off('state:players:changed', _playersChangedHandler);
    eventBus.off('state:reset', _playersChangedHandler);
    _playersChangedHandler = null;
  }
  if (_scheduleChangedHandler) {
    eventBus.off('state:schedule:changed', _scheduleChangedHandler);
    _scheduleChangedHandler = null;
  }
}

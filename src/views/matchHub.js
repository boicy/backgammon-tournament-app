import {
  getState,
  addPlayer,
  removePlayer,
  startMatch,
  selectMatch,
  abandonMatch,
  resetTournament,
  endTournament,
} from '../store/store.js';
import { eventBus } from '../store/eventBus.js';
import { escapeHtml } from '../utils.js';

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

function playerName(players, id) {
  return players.find((p) => p.id === id)?.name ?? id;
}

function computeScore(match, playerId) {
  return match.games.reduce((sum, g) => (g.winnerId === playerId ? sum + g.matchPoints : sum), 0);
}

function playerListHtml(players, matches) {
  if (players.length === 0) {
    return '<p class="empty-state">No players yet — add one below.</p>';
  }
  const items = players
    .map((p) => {
      const inActiveMatch = matches.some(
        (m) => m.status === 'active' && (m.player1Id === p.id || m.player2Id === p.id),
      );
      return `
      <li class="player-item">
        <span class="player-name">${escapeHtml(p.name)}</span>
        ${inActiveMatch ? '<span class="badge badge-active">Playing</span>' : ''}
        <button class="btn btn-danger btn-sm" data-action="remove-player" data-player-id="${escapeHtml(p.id)}"
          aria-label="Remove ${escapeHtml(p.name)}">Remove</button>
      </li>`;
    })
    .join('');
  return `<ul class="player-list">${items}</ul>`;
}

function activeMatchCardsHtml(matches, players) {
  const active = matches.filter((m) => m.status === 'active');
  if (active.length === 0) {
    return '<p class="empty-state">No active matches.</p>';
  }
  return active
    .map((m) => {
      const p1Name = escapeHtml(playerName(players, m.player1Id));
      const p2Name = escapeHtml(playerName(players, m.player2Id));
      const score1 = computeScore(m, m.player1Id);
      const score2 = computeScore(m, m.player2Id);
      return `
      <div class="match-card match-card--active" data-match-id="${escapeHtml(m.id)}">
        <span class="match-card__players">${p1Name} vs ${p2Name}</span>
        <span class="match-card__score">${score1}–${score2} of ${m.targetScore}</span>
        <button class="btn btn-primary btn-sm" data-action="enter-match" data-match-id="${escapeHtml(m.id)}">Enter</button>
        <button class="btn btn-danger btn-sm" data-action="abandon-match" data-match-id="${escapeHtml(m.id)}">Abandon</button>
      </div>`;
    })
    .join('');
}

function completedMatchCardsHtml(matches, players) {
  const completed = matches.filter((m) => m.status === 'complete');
  if (completed.length === 0) return '';
  const cards = completed
    .map((m) => {
      const p1Name = escapeHtml(playerName(players, m.player1Id));
      const p2Name = escapeHtml(playerName(players, m.player2Id));
      const score1 = computeScore(m, m.player1Id);
      const score2 = computeScore(m, m.player2Id);
      const winnerName = escapeHtml(playerName(players, m.winnerId));
      return `
      <div class="match-card match-card--complete" data-match-id="${escapeHtml(m.id)}">
        <span class="match-card__players">${p1Name} vs ${p2Name}</span>
        <span class="match-card__score">${score1}–${score2}</span>
        <span class="badge badge-winner">${winnerName} wins</span>
      </div>`;
    })
    .join('');
  return `
    <section class="completed-matches-section">
      <h3>Completed Matches</h3>
      ${cards}
    </section>`;
}

function playerSelectOptions(players, excludeId = '') {
  return players
    .map(
      (p) =>
        `<option value="${escapeHtml(p.id)}" ${p.id === excludeId ? 'disabled' : ''}>${escapeHtml(p.name)}</option>`,
    )
    .join('');
}

function startMatchFormHtml(players) {
  const disabled = players.length < 2 ? 'disabled' : '';
  const opts = playerSelectOptions(players);
  return `
    <form class="start-match-form" id="start-match-form" novalidate>
      <h3>Start a Match</h3>

      <div id="match-error" class="error-message" role="alert" aria-live="polite" data-match-error hidden></div>

      <div class="form-row">
        <div class="form-group">
          <label for="start-p1-select">Player 1</label>
          <select id="start-p1-select" class="input" data-start-p1 ${disabled}>
            <option value="">— select —</option>
            ${opts}
          </select>
        </div>
        <div class="form-group">
          <label for="start-p2-select">Player 2</label>
          <select id="start-p2-select" class="input" data-start-p2 ${disabled}>
            <option value="">— select —</option>
            ${opts}
          </select>
        </div>
        <div class="form-group">
          <label for="start-target-input">Target</label>
          <input type="number" id="start-target-input" class="input" data-start-target
            value="7" min="1" max="99" ${disabled} />
        </div>
      </div>

      <button type="submit" class="btn btn-primary" data-action="start-match" ${disabled}>
        Start Match
      </button>
    </form>`;
}

function viewHtml(players, matches, roster, tournament) {
  const tournamentNameHtml = tournament
    ? `<p class="tournament-name">${escapeHtml(tournament.name)}</p>`
    : '';
  const rosterOptions = roster
    .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
    .join('');

  return `
    <section class="view view--match-hub" aria-label="Match Hub">
      ${tournamentNameHtml}
      <h2>Match Hub</h2>

      <div class="hub-columns">
        <div class="hub-col hub-col--players">
          <h3>Players</h3>
          <div id="player-list-wrapper">
            ${playerListHtml(players, matches)}
          </div>

          <div id="player-error" class="error-message" role="alert" aria-live="polite" data-error hidden></div>

          <form class="add-player-form" id="add-player-form" data-add-player-form novalidate>
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
                  list="roster-datalist"
                  data-add-player-input
                />
                <datalist id="roster-datalist">${rosterOptions}</datalist>
              </div>
              <button type="submit" class="btn btn-primary" aria-label="Add player">Add</button>
            </div>
          </form>
        </div>

        <div class="hub-col hub-col--matches">
          <div id="active-matches-wrapper">
            <h3>Active Matches</h3>
            ${activeMatchCardsHtml(matches, players)}
          </div>

          ${completedMatchCardsHtml(matches, players)}

          <div id="start-match-wrapper">
            ${startMatchFormHtml(players)}
          </div>
        </div>
      </div>

      <div class="danger-zone">
        <button class="btn btn-danger btn-sm" data-action="end-tournament">End Tournament</button>
        <button class="btn btn-danger btn-sm" data-action="reset-tournament">Reset Tournament</button>
      </div>
    </section>`;
}

// ---------------------------------------------------------------------------
// View module
// ---------------------------------------------------------------------------

let _playersChangedHandler = null;
let _matchesChangedHandler = null;
let _container = null;
let _handleClick = null;
let _handleSubmit = null;

function refreshPlayerList() {
  const { players, matches } = getState();
  const wrapper = _container && _container.querySelector('#player-list-wrapper');
  if (wrapper) wrapper.innerHTML = playerListHtml(players, matches);
}

function refreshActiveMatches() {
  const { players, matches } = getState();
  const wrapper = _container && _container.querySelector('#active-matches-wrapper');
  if (wrapper) {
    wrapper.innerHTML = `<h3>Active Matches</h3>${activeMatchCardsHtml(matches, players)}`;
  }
  // Also refresh completed section
  const hubCol = _container && _container.querySelector('.hub-col--matches');
  if (hubCol) {
    let completedEl = hubCol.querySelector('.completed-matches-section');
    const completedHtml = completedMatchCardsHtml(matches, players);
    if (completedEl) {
      completedEl.outerHTML = completedHtml || '';
    } else if (completedHtml) {
      const startWrapper = hubCol.querySelector('#start-match-wrapper');
      if (startWrapper) startWrapper.insertAdjacentHTML('beforebegin', completedHtml);
    }
  }
}

function refreshStartMatchForm() {
  const { players } = getState();
  const wrapper = _container && _container.querySelector('#start-match-wrapper');
  if (wrapper) wrapper.innerHTML = startMatchFormHtml(players);
}

export function render(container) {
  _container = container;
  const { players, matches, roster, tournament } = getState();
  container.innerHTML = viewHtml(players, matches, roster, tournament);
}

export function onMount(container) {
  _container = container;

  function showPlayerError(msg) {
    const el = container.querySelector('[data-error]');
    if (el) { el.textContent = msg; el.hidden = false; }
  }
  function clearPlayerError() {
    const el = container.querySelector('[data-error]');
    if (el) { el.textContent = ''; el.hidden = true; }
  }
  function showMatchError(msg) {
    const el = container.querySelector('[data-match-error]');
    if (el) { el.textContent = msg; el.hidden = false; }
  }
  function clearMatchError() {
    const el = container.querySelector('[data-match-error]');
    if (el) { el.textContent = ''; el.hidden = true; }
  }

  // Form submit — event delegation
  _handleSubmit = (e) => {
    const form = e.target;

    // Add player form
    if (form.id === 'add-player-form') {
      e.preventDefault();
      const input = container.querySelector('[data-add-player-input]');
      const name = (input?.value ?? '').trim();
      if (!name) return;
      clearPlayerError();
      try {
        addPlayer(name);
        if (input) input.value = '';
      } catch (err) {
        showPlayerError(err.message);
      }
    }

    // Start match form
    if (form.id === 'start-match-form') {
      e.preventDefault();
      clearMatchError();

      const p1Select = container.querySelector('select[data-start-p1]');
      const p2Select = container.querySelector('select[data-start-p2]');
      const targetInput = container.querySelector('input[data-start-target]');

      const p1Id = p1Select?.value || '';
      const p2Id = p2Select?.value || '';
      const target = parseInt(targetInput?.value || '7', 10);

      if (!p1Id || !p2Id) {
        showMatchError('Please select both players.');
        return;
      }
      if (p1Id === p2Id) {
        showMatchError('Players must be different.');
        return;
      }

      try {
        startMatch(p1Id, p2Id, target);
        // Reset form
        if (p1Select) p1Select.value = '';
        if (p2Select) p2Select.value = '';
        if (targetInput) targetInput.value = '7';
      } catch (err) {
        showMatchError(err.message);
      }
    }
  };

  container.addEventListener('submit', _handleSubmit);

  // Click — event delegation
  _handleClick = (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;

    if (action === 'remove-player') {
      const playerId = target.dataset.playerId;
      clearPlayerError();
      try {
        removePlayer(playerId);
      } catch (err) {
        showPlayerError(err.message);
      }
    }

    if (action === 'enter-match') {
      const matchId = target.dataset.matchId;
      selectMatch(matchId);
      window.location.hash = '#/match';
    }

    if (action === 'abandon-match') {
      const matchId = target.dataset.matchId;
      if (!window.confirm('Abandon this match? No win will be credited.')) return;
      try {
        abandonMatch(matchId);
      } catch (err) {
        showMatchError(err.message);
      }
    }

    if (action === 'end-tournament') {
      if (window.confirm('End this tournament and save it to the archive?')) {
        endTournament();
        window.location.hash = '#/start';
      }
    }

    if (action === 'reset-tournament') {
      if (window.confirm('Reset the tournament? All data will be deleted.')) {
        resetTournament();
        window.location.hash = '#/start';
      }
    }
  };

  container.addEventListener('click', _handleClick);

  // Subscribe to state changes
  _playersChangedHandler = () => {
    refreshPlayerList();
    refreshStartMatchForm();
    // Refresh roster datalist
    const { roster } = getState();
    const datalist = container.querySelector('#roster-datalist');
    if (datalist) {
      datalist.innerHTML = roster
        .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
        .join('');
    }
  };

  _matchesChangedHandler = () => {
    refreshActiveMatches();
    refreshPlayerList(); // update "Playing" badges
    refreshStartMatchForm(); // re-enable/disable based on player count
  };

  eventBus.on('state:players:changed', _playersChangedHandler);
  eventBus.on('state:reset', _playersChangedHandler);
  eventBus.on('state:matches:changed', _matchesChangedHandler);
}

export function onUnmount() {
  if (_container) {
    if (_handleClick) {
      _container.removeEventListener('click', _handleClick);
      _handleClick = null;
    }
    if (_handleSubmit) {
      _container.removeEventListener('submit', _handleSubmit);
      _handleSubmit = null;
    }
    _container = null;
  }
  if (_playersChangedHandler) {
    eventBus.off('state:players:changed', _playersChangedHandler);
    eventBus.off('state:reset', _playersChangedHandler);
    _playersChangedHandler = null;
  }
  if (_matchesChangedHandler) {
    eventBus.off('state:matches:changed', _matchesChangedHandler);
    _matchesChangedHandler = null;
  }
}

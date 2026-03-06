// liveView.js — Live match monitoring view (US1–US2, US6–US7)
// Replaces matchHub.js + matchDetail.js with a single inline-recording view.

import { getState, addPlayer, removePlayer, startMatch, abandonMatch, recordMatchGame } from '../store/store.js';
import { eventBus } from '../store/eventBus.js';
import { updateTournamentState } from '../router.js';

// ---------------------------------------------------------------------------
// Module-level ephemeral state (not persisted)
// ---------------------------------------------------------------------------

let _expandedCardId = null;   // FR-008: only one inline form open at a time
let _rosterExpanded = false;
let _addPlayerExpanded = false;
let _newMatchExpanded = false;
let _container = null;

// Event bus handlers stored for cleanup
let _onMatchesChanged = null;
let _onPlayersChanged = null;
let _onReset = null;

// Delegated event handler stored for cleanup
let _delegatedClickHandler = null;
let _delegatedSubmitHandler = null;

// ---------------------------------------------------------------------------
// Score computation helpers
// ---------------------------------------------------------------------------

function computeScore(match) {
  let p1 = 0;
  let p2 = 0;
  for (const g of match.games) {
    if (g.winnerId === match.player1Id) p1 += g.matchPoints;
    else if (g.winnerId === match.player2Id) p2 += g.matchPoints;
  }
  return { p1, p2 };
}

function playerName(players, id) {
  return players.find((p) => p.id === id)?.name ?? '?';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// HTML builders
// ---------------------------------------------------------------------------

function playerSelectOptions(players, exclude = []) {
  return players
    .filter((p) => !exclude.includes(p.id))
    .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`)
    .join('');
}

function gameFormHtml(match, players) {
  const p1 = players.find((p) => p.id === match.player1Id);
  const p2 = players.find((p) => p.id === match.player2Id);
  return `
    <div class="live-card__form" data-game-form data-match-id="${escapeHtml(match.id)}">
      <label class="live-form__label">Winner
        <select class="live-form__select" data-game-winner>
          <option value="${escapeHtml(match.player1Id)}">${escapeHtml(p1?.name ?? '?')}</option>
          <option value="${escapeHtml(match.player2Id)}">${escapeHtml(p2?.name ?? '?')}</option>
        </select>
      </label>
      <label class="live-form__label">Result
        <select class="live-form__select" data-result-type>
          <option value="standard">Standard</option>
          <option value="gammon">Gammon</option>
          <option value="backgammon">Backgammon</option>
        </select>
      </label>
      <label class="live-form__label">Cube
        <select class="live-form__select" data-cube-value>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="4">4</option>
          <option value="8">8</option>
          <option value="16">16</option>
          <option value="32">32</option>
          <option value="64">64</option>
        </select>
      </label>
      <button class="btn-primary" type="button" data-action="submit-game" data-match-id="${escapeHtml(match.id)}">Save</button>
      <button class="btn-secondary" type="button" data-action="record-game" data-match-id="${escapeHtml(match.id)}">Cancel</button>
    </div>`;
}

function renderMatchCard(match, players, expanded) {
  const { p1, p2 } = computeScore(match);
  const gameCount = match.games.length;
  const name1 = escapeHtml(playerName(players, match.player1Id));
  const name2 = escapeHtml(playerName(players, match.player2Id));

  return `
    <article class="live-card live-card--active" data-match-id="${escapeHtml(match.id)}">
      <div class="live-card__header">
        <span class="live-card__player live-card__player--left">${name1}</span>
        <div class="live-card__center">
          <div class="live-card__score">
            <span data-score-p1="${escapeHtml(match.id)}">${p1}</span>
            <span class="live-card__score-sep"> — </span>
            <span data-score-p2="${escapeHtml(match.id)}">${p2}</span>
          </div>
          <div class="live-card__meta">of ${escapeHtml(String(match.targetScore))} · ${gameCount === 0 ? 'No games yet' : `Game ${gameCount}`}</div>
        </div>
        <span class="live-card__player live-card__player--right">${name2}</span>
      </div>
      <div class="live-card__actions">
        <button class="btn-primary btn-sm" type="button" data-action="record-game" data-match-id="${escapeHtml(match.id)}">
          Record Game
        </button>
        <button class="live-card__overflow-btn" type="button" data-action="open-overflow" data-match-id="${escapeHtml(match.id)}" aria-label="More options">⋯</button>
      </div>
      <div class="live-card__form-wrap" data-form-wrap="${escapeHtml(match.id)}" data-expanded="${expanded ? 'true' : 'false'}">
        ${expanded ? gameFormHtml(match, players) : ''}
      </div>
    </article>`;
}

function renderCompletedCard(match, players) {
  const { p1, p2 } = computeScore(match);
  const winnerName = escapeHtml(playerName(players, match.winnerId));
  const name1 = escapeHtml(playerName(players, match.player1Id));
  const name2 = escapeHtml(playerName(players, match.player2Id));

  return `
    <article class="live-card live-card--complete" data-match-id="${escapeHtml(match.id)}">
      <div class="live-card__header">
        <span class="live-card__player live-card__player--left">${name1}</span>
        <div class="live-card__center">
          <div class="live-card__score live-card__score--complete">
            <span>${p1}</span>
            <span class="live-card__score-sep"> — </span>
            <span>${p2}</span>
          </div>
          <div class="live-card__meta">${winnerName} wins</div>
        </div>
        <span class="live-card__player live-card__player--right">${name2}</span>
      </div>
    </article>`;
}

function rosterListHtml(players) {
  if (!players.length) return `
    <div class="live-roster-inner">
      <p class="live-roster__empty">No players yet.</p>
    </div>`;
  return `<div class="live-roster-inner">${players.map((p) => `
    <div class="live-roster__row">
      <span class="live-roster__name">${escapeHtml(p.name)}</span>
      <button class="btn-danger btn-sm" type="button" data-action="remove-player" data-player-id="${escapeHtml(p.id)}">Remove</button>
    </div>`).join('')}</div>`;
}

function headerHtml(tournament, players) {
  const count = players.length;
  return `
    <div class="live-header">
      <div class="live-header__row">
        <span class="live-header__name tournament-name">${escapeHtml(tournament?.name ?? 'Tournament')}</span>
        <button class="live-header__players-btn" type="button" data-action="toggle-roster">
          ${count} player${count !== 1 ? 's' : ''}
        </button>
        <button class="live-header__add-btn btn-icon" type="button" data-action="toggle-add-player" aria-label="Add player">＋</button>
      </div>
      <div class="live-roster" data-expanded="${_rosterExpanded ? 'true' : 'false'}">
        ${_rosterExpanded ? rosterListHtml(players) : ''}
      </div>
      <div class="live-add-player" data-expanded="${_addPlayerExpanded ? 'true' : 'false'}">
        ${_addPlayerExpanded ? `
          <form id="add-player-form" class="live-add-player__form">
            <input id="player-name-input" class="live-form__input" type="text" placeholder="Player name" autocomplete="off" list="roster-datalist" required>
            <datalist id="roster-datalist"></datalist>
            <button class="btn-primary btn-sm" type="submit">Add</button>
          </form>
          <div data-error class="live-error" aria-live="polite"></div>
        ` : ''}
      </div>
    </div>`;
}

function activeMatchesHtml(matches, players) {
  const active = matches.filter((m) => m.status === 'active');
  if (!active.length) {
    return `<div class="live-empty"><p>No active matches.</p></div>`;
  }
  return active.map((m) => renderMatchCard(m, players, _expandedCardId === m.id)).join('');
}

function newMatchFormHtml(players) {
  const canStart = players.length >= 2;
  if (!_newMatchExpanded) {
    return `
      <div class="live-new-match">
        <button class="live-new-match__toggle btn-secondary" type="button" data-action="toggle-new-match" ${canStart ? '' : 'disabled'}>
          ＋ New Match
        </button>
      </div>`;
  }

  return `
    <div class="live-new-match live-new-match--expanded">
      <button class="live-new-match__toggle btn-secondary" type="button" data-action="toggle-new-match">
        ＋ New Match
      </button>
      <form id="start-match-form" class="live-new-match__form">
        <label class="live-form__label">Player 1
          <select class="live-form__select" data-start-p1 data-new-p1>
            ${playerSelectOptions(players)}
          </select>
        </label>
        <label class="live-form__label">Player 2
          <select class="live-form__select" data-start-p2 data-new-p2>
            ${playerSelectOptions(players)}
          </select>
        </label>
        <label class="live-form__label">Target
          <input class="live-form__input" type="number" data-start-target min="1" value="7">
        </label>
        <button class="btn-primary" type="submit">Start</button>
        <div data-match-error class="live-error" aria-live="polite"></div>
      </form>
    </div>`;
}

function completedMatchesHtml(matches, players) {
  const completed = matches.filter((m) => m.status === 'complete' || m.status === 'abandoned');
  if (!completed.length) return '';
  return `
    <div class="live-completed-label">Completed</div>
    ${completed.map((m) => renderCompletedCard(m, players)).join('')}`;
}

function viewHtml(state) {
  const { tournament, players, matches } = state;
  return `
    <section class="view view--live">
      ${headerHtml(tournament, players)}
      ${newMatchFormHtml(players)}
      <div class="live-active-zone">
        ${activeMatchesHtml(matches, players)}
      </div>
      <div class="live-completed-zone">
        ${completedMatchesHtml(matches, players)}
      </div>
    </section>`;
}

// ---------------------------------------------------------------------------
// Targeted DOM refresh helpers
// ---------------------------------------------------------------------------

function refreshActiveZone() {
  if (!_container) return;
  const { matches, players } = getState();
  const zone = _container.querySelector('.live-active-zone');
  if (zone) zone.innerHTML = activeMatchesHtml(matches, players);
  const completedZone = _container.querySelector('.live-completed-zone');
  if (completedZone) completedZone.innerHTML = completedMatchesHtml(matches, players);
}

function refreshHeader() {
  if (!_container) return;
  const { tournament, players } = getState();
  const header = _container.querySelector('.live-header');
  if (header) header.outerHTML = headerHtml(tournament, players);
  // Re-query after replacement
  refreshNewMatchForm();
}

function refreshNewMatchForm() {
  if (!_container) return;
  const { players } = getState();
  const zone = _container.querySelector('.live-new-match');
  if (zone) zone.outerHTML = newMatchFormHtml(players);
}

// ---------------------------------------------------------------------------
// Public view API
// ---------------------------------------------------------------------------

export function render(container) {
  _container = container;
  _expandedCardId = null;
  _rosterExpanded = false;
  _addPlayerExpanded = false;
  _newMatchExpanded = false;
  container.innerHTML = viewHtml(getState());
}

export function onMount(container) {
  _container = container;

  // -------------------------------------------------------------------------
  // Event bus subscriptions
  // -------------------------------------------------------------------------

  _onMatchesChanged = () => {
    refreshActiveZone();
    refreshNewMatchForm();
    updateTournamentState();
  };

  _onPlayersChanged = () => {
    const { tournament, players } = getState();
    const header = _container?.querySelector('.live-header');
    if (header) {
      const wasExpanded = _rosterExpanded;
      const wasAddExpanded = _addPlayerExpanded;
      header.outerHTML = headerHtml(tournament, players);
      _rosterExpanded = wasExpanded;
      _addPlayerExpanded = wasAddExpanded;
    }
    refreshNewMatchForm();
    updateTournamentState();
  };

  _onReset = () => {
    if (_container) {
      // Only re-render DOM; do NOT call onMount again.
      // onMount attaches additional click/submit/eventBus handlers, which would
      // create duplicates because the original handlers from this onMount are
      // still attached. Duplicates cause double-toggle bugs (toggle-add-player
      // flips open then immediately closed again), and double store calls.
      render(_container);
    }
  };

  eventBus.on('state:matches:changed', _onMatchesChanged);
  eventBus.on('state:players:changed', _onPlayersChanged);
  eventBus.on('state:reset', _onReset);

  // -------------------------------------------------------------------------
  // Delegated click handler
  // -------------------------------------------------------------------------

  _delegatedClickHandler = (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;

    const target = e.target.closest('[data-action]');
    const matchId = target?.dataset.matchId;
    const playerId = target?.dataset.playerId;

    if (action === 'record-game') {
      const wasExpanded = _expandedCardId === matchId;

      // Collapse previously expanded card in-place
      if (_expandedCardId && _expandedCardId !== matchId) {
        const prevWrap = _container.querySelector(`[data-form-wrap="${_expandedCardId}"]`);
        if (prevWrap) {
          prevWrap.dataset.expanded = 'false';
          prevWrap.innerHTML = '';
        }
      }

      if (wasExpanded) {
        _expandedCardId = null;
        const formWrap = _container.querySelector(`[data-form-wrap="${matchId}"]`);
        if (formWrap) {
          formWrap.dataset.expanded = 'false';
          formWrap.innerHTML = '';
        }
      } else {
        _expandedCardId = matchId;
        const formWrap = _container.querySelector(`[data-form-wrap="${matchId}"]`);
        const { matches, players } = getState();
        const match = matches.find((m) => m.id === matchId);
        if (formWrap && match) {
          formWrap.dataset.expanded = 'true';
          formWrap.innerHTML = gameFormHtml(match, players);
        }
      }
      return;
    }

    if (action === 'submit-game') {
      const { matches, players } = getState();
      const card = _container.querySelector(`[data-match-id="${matchId}"]`);
      if (!card) return;
      const winner = card.querySelector('[data-game-winner]')?.value;
      const resultType = card.querySelector('[data-result-type]')?.value ?? 'standard';
      const cubeValue = parseInt(card.querySelector('[data-cube-value]')?.value ?? '1', 10);
      if (!winner) return;
      try {
        recordMatchGame(matchId, { winnerId: winner, resultType, cubeValue });
        _expandedCardId = null;
        // Score pulse animation — refreshActiveZone re-renders so we apply after
        refreshActiveZone();
        // Mark updated score cells
        const p1El = _container.querySelector(`[data-score-p1="${matchId}"]`);
        const p2El = _container.querySelector(`[data-score-p2="${matchId}"]`);
        if (p1El) { p1El.classList.remove('score-updated'); void p1El.offsetWidth; p1El.classList.add('score-updated'); }
        if (p2El) { p2El.classList.remove('score-updated'); void p2El.offsetWidth; p2El.classList.add('score-updated'); }
      } catch (err) {
        console.error('recordMatchGame error:', err);
      }
      return;
    }

    if (action === 'open-overflow') {
      if (window.confirm('Abandon this match?')) {
        try {
          if (_expandedCardId === matchId) _expandedCardId = null;
          abandonMatch(matchId);
          refreshActiveZone();
        } catch (err) {
          console.error('abandonMatch error:', err);
        }
      }
      return;
    }

    if (action === 'abandon-match') {
      if (window.confirm('Abandon this match?')) {
        try {
          if (_expandedCardId === matchId) _expandedCardId = null;
          abandonMatch(matchId);
          refreshActiveZone();
        } catch (err) {
          console.error('abandonMatch error:', err);
        }
      }
      return;
    }

    if (action === 'toggle-roster') {
      _rosterExpanded = !_rosterExpanded;
      const roster = _container.querySelector('.live-roster');
      const { players } = getState();
      if (roster) {
        roster.dataset.expanded = _rosterExpanded ? 'true' : 'false';
        roster.innerHTML = _rosterExpanded ? rosterListHtml(players) : '';
      }
      return;
    }

    if (action === 'toggle-add-player') {
      _addPlayerExpanded = !_addPlayerExpanded;
      const zone = _container.querySelector('.live-add-player');
      if (zone) {
        zone.dataset.expanded = _addPlayerExpanded ? 'true' : 'false';
        const { roster: r } = getState();
        const rosterOpts = (r || []).map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
        zone.innerHTML = _addPlayerExpanded ? `
          <form id="add-player-form" class="live-add-player__form">
            <input id="player-name-input" class="live-form__input" type="text" placeholder="Player name" autocomplete="off" list="roster-datalist" required>
            <datalist id="roster-datalist">${rosterOpts}</datalist>
            <button class="btn-primary btn-sm" type="submit">Add</button>
          </form>
          <div data-error class="live-error" aria-live="polite"></div>
        ` : '';
        if (_addPlayerExpanded) {
          const input = _container.querySelector('#player-name-input');
          if (input) input.focus();
        }
      }
      return;
    }

    if (action === 'toggle-new-match') {
      _newMatchExpanded = !_newMatchExpanded;
      refreshNewMatchForm();
      return;
    }

    if (action === 'remove-player') {
      try {
        removePlayer(playerId);
        if (_rosterExpanded) {
          const { players } = getState();
          const roster = _container.querySelector('.live-roster');
          if (roster) roster.innerHTML = rosterListHtml(players);
        }
      } catch (err) {
        console.error('removePlayer error:', err);
      }
      return;
    }
  };

  // -------------------------------------------------------------------------
  // Delegated submit handler
  // -------------------------------------------------------------------------

  _delegatedSubmitHandler = (e) => {
    if (e.target.id === 'add-player-form') {
      e.preventDefault();
      const input = _container.querySelector('#player-name-input');
      const name = input?.value.trim();
      const errorEl = _container.querySelector('[data-error]');
      if (errorEl) errorEl.textContent = '';
      try {
        addPlayer(name);
        _addPlayerExpanded = false;
        const zone = _container.querySelector('.live-add-player');
        if (zone) {
          zone.dataset.expanded = 'false';
          zone.innerHTML = '';
        }
        // Player count header refresh handled by state:players:changed event
      } catch (err) {
        if (errorEl) errorEl.textContent = err.message;
      }
      return;
    }

    if (e.target.id === 'start-match-form') {
      e.preventDefault();
      const p1 = _container.querySelector('[data-start-p1]')?.value;
      const p2 = _container.querySelector('[data-start-p2]')?.value;
      const target = parseInt(_container.querySelector('[data-start-target]')?.value ?? '7', 10);
      const errorEl = _container.querySelector('[data-match-error]');
      if (errorEl) errorEl.textContent = '';
      try {
        startMatch(p1, p2, target);
        _newMatchExpanded = false;
        refreshNewMatchForm();
      } catch (err) {
        if (errorEl) errorEl.textContent = err.message;
      }
      return;
    }
  };

  container.addEventListener('click', _delegatedClickHandler);
  container.addEventListener('submit', _delegatedSubmitHandler);
}

export function onUnmount() {
  if (_onMatchesChanged) eventBus.off('state:matches:changed', _onMatchesChanged);
  if (_onPlayersChanged) eventBus.off('state:players:changed', _onPlayersChanged);
  if (_onReset) eventBus.off('state:reset', _onReset);
  if (_container) {
    if (_delegatedClickHandler) _container.removeEventListener('click', _delegatedClickHandler);
    if (_delegatedSubmitHandler) _container.removeEventListener('submit', _delegatedSubmitHandler);
  }
  _onMatchesChanged = null;
  _onPlayersChanged = null;
  _onReset = null;
  _delegatedClickHandler = null;
  _delegatedSubmitHandler = null;
  _container = null;
}

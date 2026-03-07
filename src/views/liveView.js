// liveView.js — Live match monitoring view (US1–US2, US6–US7)
// Replaces matchHub.js + matchDetail.js with a single inline-recording view.

import { getState, addPlayer, removePlayer, startMatch, endMatchEarly, recordMatchGame } from '../store/store.js';
import { eventBus } from '../store/eventBus.js';
import { updateTournamentState } from '../router.js';

// ---------------------------------------------------------------------------
// Module-level ephemeral state (not persisted)
// ---------------------------------------------------------------------------

let _expandedCardId = null;   // FR-008: only one inline form open at a time
let _rosterExpanded = false;
let _addPlayerExpanded = false;
let _newMatchExpanded = false;
let _pickStep = null;       // null | 1 | 2 | 'confirm'
let _selectedP1 = null;     // player ID
let _selectedP2 = null;     // player ID
let _selectedTarget = 7;   // target score (reset to 7 on form close/render)
let _selectedWinner = null; // player ID of selected game winner, or null
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


function gameFormHtml(match, players) {
  const p1 = players.find((p) => p.id === match.player1Id);
  const p2 = players.find((p) => p.id === match.player2Id);
  const p1Cls = _selectedWinner === match.player1Id ? 'pick-btn pick-btn--selected' : 'pick-btn';
  const p2Cls = _selectedWinner === match.player2Id ? 'pick-btn pick-btn--selected' : 'pick-btn';
  // Initial render bakes _selectedWinner into button classes.
  // Subsequent winner clicks update classes via direct DOM toggle (no re-render needed).
  return `
    <div class="live-card__form" data-game-form data-match-id="${escapeHtml(match.id)}">
      <div class="pick-winner-grid">
        <button class="${p1Cls}" type="button" data-action="pick-winner" data-winner-id="${escapeHtml(match.player1Id)}" data-match-id="${escapeHtml(match.id)}">${escapeHtml(p1?.name ?? '?')}</button>
        <button class="${p2Cls}" type="button" data-action="pick-winner" data-winner-id="${escapeHtml(match.player2Id)}" data-match-id="${escapeHtml(match.id)}">${escapeHtml(p2?.name ?? '?')}</button>
      </div>
      <span data-game-error style="display:none;color:var(--color-danger,#ef4444);font-size:0.85rem;" aria-live="polite"></span>
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
      <button class="btn btn-primary btn-full" type="button" data-action="submit-game" data-match-id="${escapeHtml(match.id)}">Save</button>
      <button class="btn btn-secondary btn-full" type="button" data-action="record-game" data-match-id="${escapeHtml(match.id)}">Cancel</button>
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
        <button class="btn btn-primary btn-full" type="button" data-action="record-game" data-match-id="${escapeHtml(match.id)}">
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
  const name1 = escapeHtml(playerName(players, match.player1Id));
  const name2 = escapeHtml(playerName(players, match.player2Id));

  let metaLabel;
  if (match.status === 'abandoned') {
    metaLabel = 'Abandoned';
  } else if (match.winnerId) {
    const winnerName = escapeHtml(playerName(players, match.winnerId));
    metaLabel = match.endedEarly ? `${winnerName} wins · Ended Early` : `${winnerName} wins`;
  } else {
    metaLabel = match.endedEarly ? 'Tied · Ended Early' : 'Tied';
  }

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
          <div class="live-card__meta">${metaLabel}</div>
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
      <button class="btn btn-danger btn-sm" type="button" data-action="remove-player" data-player-id="${escapeHtml(p.id)}">Remove</button>
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
            <button class="btn btn-primary btn-full" type="submit">Add</button>
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

function newMatchFormHtml(players, matches = []) {
  const canStart = players.length >= 2;

  if (!_newMatchExpanded) {
    return `
      <div class="live-new-match">
        <button class="live-new-match__toggle btn btn-secondary btn-full" type="button" data-action="toggle-new-match" ${canStart ? '' : 'disabled'}>
          ＋ New Match
        </button>
      </div>`;
  }

  if (_pickStep === 'confirm') {
    const p1Name = escapeHtml(playerName(players, _selectedP1));
    const p2Name = escapeHtml(playerName(players, _selectedP2));
    const targetPresets = [3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
    const targetButtonsHtml = targetPresets.map((v) => {
      const cls = v === _selectedTarget ? 'pick-btn pick-btn--selected' : 'pick-btn';
      return `<button class="${cls}" type="button" data-action="pick-target" data-target-value="${v}">${v}</button>`;
    }).join('');
    return `
      <div class="live-new-match live-new-match--expanded">
        <button class="live-new-match__toggle btn btn-secondary btn-full" type="button" data-action="toggle-new-match">
          ＋ New Match
        </button>
        <div class="pick-panel">
          <div class="pick-confirm">
            <button class="pick-pill pick-pill--selected" type="button" data-action="deselect-player" data-player-id="${escapeHtml(_selectedP1)}">${p1Name}</button>
            <span class="pick-vs">vs</span>
            <button class="pick-pill pick-pill--selected" type="button" data-action="deselect-player" data-player-id="${escapeHtml(_selectedP2)}">${p2Name}</button>
          </div>
          <form id="start-match-form" class="pick-start-form">
            <div class="pick-target-grid">${targetButtonsHtml}</div>
            <button class="btn btn-primary btn-full" type="submit">Start</button>
            <button class="btn btn-secondary btn-sm" type="button" data-action="cancel-new-match">Cancel</button>
            <div data-match-error class="live-error" aria-live="polite"></div>
          </form>
        </div>
      </div>`;
  }

  const prompt = _pickStep === 2 ? 'Pick Player 2' : 'Pick Player 1';
  const buttonsHtml = players.map((p) => {
    const isSelected = p.id === _selectedP1;
    const cls = isSelected ? 'pick-btn pick-btn--selected' : 'pick-btn';
    const action = isSelected ? 'deselect-player' : 'pick-player';
    const disabled = '';
    const activeCount = matches.filter(
      (m) => m.status === 'active' && (m.player1Id === p.id || m.player2Id === p.id),
    ).length;
    const badge = activeCount > 0 ? `<span class="pick-btn__badge">${activeCount}</span>` : '';
    return `<button class="${cls}" type="button" data-action="${action}" data-player-id="${escapeHtml(p.id)}"${disabled}>${escapeHtml(p.name)}${badge}</button>`;
  }).join('');

  return `
    <div class="live-new-match live-new-match--expanded">
      <button class="live-new-match__toggle btn btn-secondary btn-full" type="button" data-action="toggle-new-match">
        ＋ New Match
      </button>
      <div class="pick-panel">
        <p class="pick-prompt">${prompt}</p>
        <div class="pick-grid">${buttonsHtml}</div>
        <button class="btn btn-secondary btn-sm" type="button" data-action="cancel-new-match">Cancel</button>
      </div>
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
      ${newMatchFormHtml(players, matches)}
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
  const { players, matches } = getState();
  const zone = _container.querySelector('.live-new-match');
  if (zone) zone.outerHTML = newMatchFormHtml(players, matches);
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
  _pickStep = null;
  _selectedP1 = null;
  _selectedP2 = null;
  _selectedTarget = 7;
  _selectedWinner = null;
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
        // Closing form — reset winner selection
        _expandedCardId = null;
        _selectedWinner = null;
        const formWrap = _container.querySelector(`[data-form-wrap="${matchId}"]`);
        if (formWrap) {
          formWrap.dataset.expanded = 'false';
          formWrap.innerHTML = '';
        }
      } else {
        // Opening form — reset winner selection to clean state
        _selectedWinner = null;
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

    if (action === 'pick-winner') {
      const clickedId = target.dataset.winnerId;
      // Toggle: clicking already-selected winner deselects; otherwise select
      _selectedWinner = _selectedWinner === clickedId ? null : clickedId;
      // Direct class toggle on existing DOM — no re-render needed
      const card = target.closest('.live-card');
      if (card) {
        card.querySelectorAll('[data-action="pick-winner"]').forEach((btn) => {
          if (btn.dataset.winnerId === _selectedWinner) {
            btn.classList.add('pick-btn--selected');
          } else {
            btn.classList.remove('pick-btn--selected');
          }
        });
        // Clear any existing error when a winner is picked/unpicked
        const errEl = card.querySelector('[data-game-error]');
        if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
      }
      return;
    }

    if (action === 'submit-game') {
      const card = _container.querySelector(`.live-card[data-match-id="${matchId}"]`);
      if (!card) return;

      // Validate: winner must be selected
      if (!_selectedWinner) {
        const errEl = card.querySelector('[data-game-error]');
        if (errEl) { errEl.textContent = 'Please select a winner'; errEl.style.display = ''; }
        return;
      }

      const resultType = card.querySelector('[data-result-type]')?.value ?? 'standard';
      const cubeValue = parseInt(card.querySelector('[data-cube-value]')?.value ?? '1', 10);
      const winner = _selectedWinner;
      try {
        recordMatchGame(matchId, { winnerId: winner, resultType, cubeValue });
        _expandedCardId = null;
        _selectedWinner = null;
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
      const match = getState().matches.find((m) => m.id === matchId);
      if (!match) return;

      let message;
      if (match.games.length === 0) {
        message = 'No games recorded. Abandon this match? No scores will be saved.';
      } else {
        const { p1, p2 } = computeScore(match);
        const { players } = getState();
        const n1 = playerName(players, match.player1Id);
        const n2 = playerName(players, match.player2Id);
        if (p1 === p2) {
          message = `End match early? ${n1} ${p1} – ${p2} ${n2}. Scores are tied — no winner will be declared.`;
        } else {
          const leaderName = p1 > p2 ? n1 : n2;
          message = `End match early? ${n1} ${p1} – ${p2} ${n2}. ${leaderName} will be declared winner.`;
        }
      }

      if (window.confirm(message)) {
        try {
          if (_expandedCardId === matchId) _expandedCardId = null;
          endMatchEarly(matchId);
          refreshActiveZone();
        } catch (err) {
          console.error('endMatchEarly error:', err);
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
            <button class="btn btn-primary btn-full" type="submit">Add</button>
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

    if (action === 'pick-player') {
      if (_pickStep === 1) {
        _selectedP1 = playerId;
        _pickStep = 2;
      } else if (_pickStep === 2) {
        _selectedP2 = playerId;
        _pickStep = 'confirm';
      }
      refreshNewMatchForm();
      return;
    }

    if (action === 'pick-target') {
      _selectedTarget = Number(target.dataset.targetValue);
      refreshNewMatchForm();
      return;
    }

    if (action === 'deselect-player') {
      if (_pickStep === 2) {
        _selectedP1 = null;
        _pickStep = 1;
      } else if (_pickStep === 'confirm') {
        _selectedP1 = null;
        _selectedP2 = null;
        _selectedTarget = 7;
        _pickStep = 1;
      }
      refreshNewMatchForm();
      return;
    }

    if (action === 'cancel-new-match') {
      _pickStep = null;
      _selectedP1 = null;
      _selectedP2 = null;
      _selectedTarget = 7;
      _newMatchExpanded = false;
      refreshNewMatchForm();
      return;
    }

    if (action === 'toggle-new-match') {
      _newMatchExpanded = !_newMatchExpanded;
      if (_newMatchExpanded) {
        _pickStep = 1;
        _selectedP1 = null;
        _selectedP2 = null;
        _selectedTarget = 7;
      } else {
        _pickStep = null;
        _selectedP1 = null;
        _selectedP2 = null;
        _selectedTarget = 7;
      }
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
      const errorEl = _container.querySelector('[data-match-error]');
      if (errorEl) errorEl.textContent = '';
      try {
        startMatch(_selectedP1, _selectedP2, _selectedTarget);
        _newMatchExpanded = false;
        _pickStep = null;
        _selectedP1 = null;
        _selectedP2 = null;
        _selectedTarget = 7;
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

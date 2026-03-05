import { getState, recordMatchGame } from '../store/store.js';
import { eventBus } from '../store/eventBus.js';
import { escapeHtml } from '../utils.js';

const RESULT_TYPES = ['standard', 'gammon', 'backgammon'];
const CUBE_VALUES = [1, 2, 4, 8, 16, 32, 64];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function playerName(players, id) {
  return players.find((p) => p.id === id)?.name ?? id;
}

function computeScore(match, playerId) {
  return match.games.reduce((sum, g) => (g.winnerId === playerId ? sum + g.matchPoints : sum), 0);
}

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

function gameFormHtml(match, players) {
  const p1 = players.find((p) => p.id === match.player1Id);
  const p2 = players.find((p) => p.id === match.player2Id);
  const winnerOptions = [p1, p2]
    .filter(Boolean)
    .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`)
    .join('');

  const resultOptions = RESULT_TYPES.map(
    (rt) => `<option value="${rt}">${rt.charAt(0).toUpperCase() + rt.slice(1)}</option>`,
  ).join('');

  const cubeOptions = CUBE_VALUES.map((v) => `<option value="${v}">${v}</option>`).join('');

  return `
    <form class="game-form" data-game-form novalidate>
      <div id="match-detail-error" class="error-message" role="alert" aria-live="polite" data-error hidden></div>

      <div class="form-group">
        <label for="game-winner-select">Winner</label>
        <select id="game-winner-select" class="input" data-game-winner>
          ${winnerOptions}
        </select>
      </div>

      <div class="form-group">
        <label for="result-type-select">Result</label>
        <select id="result-type-select" class="input" data-result-type>
          ${resultOptions}
        </select>
      </div>

      <div class="form-group">
        <label for="cube-value-select">Cube Value</label>
        <select id="cube-value-select" class="input" data-cube-value>
          ${cubeOptions}
        </select>
      </div>

      <button type="submit" class="btn btn-primary btn-full" data-action="record-game">Record Game</button>
    </form>`;
}

function gameLogHtml(match, players) {
  if (match.games.length === 0) {
    return `<p class="empty-state">No games recorded yet.</p>`;
  }
  const rows = match.games
    .map(
      (g) => `
      <tr>
        <td>${g.sequence}</td>
        <td>${escapeHtml(playerName(players, g.winnerId))}</td>
        <td>${escapeHtml(g.resultType)}</td>
        <td>${g.cubeValue}</td>
        <td>${g.matchPoints}</td>
      </tr>`,
    )
    .join('');
  return `
    <table class="game-log-table" aria-label="Game log">
      <thead>
        <tr>
          <th>#</th>
          <th>Winner</th>
          <th>Result</th>
          <th>Cube</th>
          <th>Pts</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function viewHtml(match, players) {
  const p1Name = escapeHtml(playerName(players, match.player1Id));
  const p2Name = escapeHtml(playerName(players, match.player2Id));
  const score1 = computeScore(match, match.player1Id);
  const score2 = computeScore(match, match.player2Id);
  const isComplete = match.status === 'complete';
  const winnerDisplayName = isComplete ? escapeHtml(playerName(players, match.winnerId)) : null;

  return `
    <section class="view view--match" aria-label="Match Detail">
      <button class="btn btn-sm" data-action="back-to-hub">&larr; Back</button>

      <div class="match-header">
        <h2>${p1Name} vs ${p2Name}</h2>
        <div class="match-scores">
          <span class="score-display">
            <span data-testid="score-p1">${score1}</span>
            &ndash;
            <span data-testid="score-p2">${score2}</span>
          </span>
          <span class="target-label">First to <span data-testid="target-score">${match.targetScore}</span></span>
        </div>
      </div>

      ${isComplete
        ? `<div class="match-complete-banner" data-testid="match-complete-banner">
             Match complete! <strong>${winnerDisplayName}</strong> wins!
           </div>`
        : ''}

      ${!isComplete ? gameFormHtml(match, players) : ''}

      <div class="game-log">
        <h3>Game Log</h3>
        ${gameLogHtml(match, players)}
      </div>
    </section>`;
}

// ---------------------------------------------------------------------------
// View module
// ---------------------------------------------------------------------------

let _matchesChangedHandler = null;

export function render(container) {
  const { selectedMatchId, matches, players } = getState();

  if (!selectedMatchId) {
    window.location.hash = '#/players';
    return;
  }

  const match = matches.find((m) => m.id === selectedMatchId);
  if (!match) {
    window.location.hash = '#/players';
    return;
  }

  container.innerHTML = viewHtml(match, players);
}

export function onMount(container) {
  function showError(msg) {
    const el = container.querySelector('[data-error]');
    if (el) { el.textContent = msg; el.hidden = false; }
  }
  function clearError() {
    const el = container.querySelector('[data-error]');
    if (el) { el.textContent = ''; el.hidden = true; }
  }

  // Game form submit — event delegation
  container.addEventListener('submit', (e) => {
    if (!e.target.matches('[data-game-form]')) return;
    e.preventDefault();
    clearError();

    const { selectedMatchId } = getState();
    if (!selectedMatchId) return;

    const winnerSelect = container.querySelector('select[data-game-winner]');
    const resultSelect = container.querySelector('select[data-result-type]');
    const cubeSelect = container.querySelector('select[data-cube-value]');

    const winnerId = winnerSelect?.value || '';
    const resultType = resultSelect?.value || 'standard';
    const cubeValue = Number(cubeSelect?.value || 1);

    if (!winnerId) {
      showError('Please select a winner.');
      return;
    }

    try {
      recordMatchGame(selectedMatchId, { winnerId, resultType, cubeValue });
    } catch (err) {
      showError(err.message);
    }
  });

  // Back button — event delegation
  container.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="back-to-hub"]')) {
      window.location.hash = '#/players';
    }
  });

  // Update only the dynamic parts so form selections are preserved
  _matchesChangedHandler = () => {
    const { selectedMatchId, matches, players } = getState();
    if (!selectedMatchId) return;
    const match = matches.find((m) => m.id === selectedMatchId);
    if (!match) return;

    // Update scores
    const score1 = computeScore(match, match.player1Id);
    const score2 = computeScore(match, match.player2Id);
    const scoreP1El = container.querySelector('[data-testid="score-p1"]');
    const scoreP2El = container.querySelector('[data-testid="score-p2"]');
    if (scoreP1El) scoreP1El.textContent = score1;
    if (scoreP2El) scoreP2El.textContent = score2;

    // Update game log
    const gameLogEl = container.querySelector('.game-log');
    if (gameLogEl) gameLogEl.innerHTML = `<h3>Game Log</h3>${gameLogHtml(match, players)}`;

    // Handle match completion
    if (match.status === 'complete') {
      // Remove form
      const form = container.querySelector('[data-game-form]');
      if (form) form.remove();

      // Insert banner if not already present
      if (!container.querySelector('.match-complete-banner')) {
        const winnerDisplayName = escapeHtml(playerName(players, match.winnerId));
        const bannerHtml = `<div class="match-complete-banner" data-testid="match-complete-banner">
          Match complete! <strong>${winnerDisplayName}</strong> wins!
        </div>`;
        const header = container.querySelector('.match-header');
        if (header) header.insertAdjacentHTML('afterend', bannerHtml);
      }
    }
  };

  eventBus.on('state:matches:changed', _matchesChangedHandler);
}

export function onUnmount() {
  if (_matchesChangedHandler) {
    eventBus.off('state:matches:changed', _matchesChangedHandler);
    _matchesChangedHandler = null;
  }
}

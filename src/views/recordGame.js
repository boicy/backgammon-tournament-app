import { getState, recordGame } from '../store/store.js';
import { eventBus } from '../store/eventBus.js';
import { escapeHtml } from '../utils.js';

const CUBE_VALUES = [2, 4, 8, 16, 32, 64];
const RESULT_TYPES = ['standard', 'gammon', 'backgammon'];

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

function playerOptions(players, selectedId = '') {
  return players
    .map(
      (p) =>
        `<option value="${escapeHtml(p.id)}" ${p.id === selectedId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`,
    )
    .join('');
}

function winnerOptions(players, p1Id, p2Id, selectedId = '') {
  const eligible = players.filter((p) => p.id === p1Id || p.id === p2Id);
  if (eligible.length === 0) return '<option value="">— select players first —</option>';
  return eligible
    .map(
      (p) =>
        `<option value="${escapeHtml(p.id)}" ${p.id === selectedId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`,
    )
    .join('');
}

function resultTypeHtml(selected = 'standard') {
  return RESULT_TYPES.map(
    (rt) => `
    <label class="radio-label">
      <input type="radio" name="result-type" value="${rt}" ${rt === selected ? 'checked' : ''} />
      ${rt.charAt(0).toUpperCase() + rt.slice(1)}
    </label>`,
  ).join('');
}

function cubeSelectHtml() {
  const opts = CUBE_VALUES.map((v) => `<option value="${v}">${v}</option>`).join('');
  return `
    <label for="cube-value-select" class="form-label">Cube Value</label>
    <select id="cube-value-select" class="input" data-cube-select>
      ${opts}
    </select>`;
}

function viewHtml(players) {
  if (players.length < 2) {
    return `
      <section class="view view--record" aria-label="Record Game">
        <h2>Record Game</h2>
        <p class="empty-state">Need at least 2 players to record a game.
          <a href="#/players">Add players</a> first.</p>
      </section>`;
  }

  const pOpts = playerOptions(players);

  return `
    <section class="view view--record" aria-label="Record Game">
      <h2>Record Game</h2>

      <div id="record-error" class="error-message" role="alert" aria-live="polite" data-error hidden></div>

      <form class="record-game-form" id="record-game-form" novalidate>

        <div class="form-group">
          <label for="player1-select">Player 1</label>
          <select id="player1-select" class="input" data-player-select aria-label="Player 1">
            <option value="">— select player —</option>
            ${pOpts}
          </select>
        </div>

        <div class="form-group">
          <label for="player2-select">Player 2</label>
          <select id="player2-select" class="input" data-player-select aria-label="Player 2">
            <option value="">— select player —</option>
            ${pOpts}
          </select>
        </div>

        <div class="form-group">
          <label for="winner-select">Winner</label>
          <select id="winner-select" class="input" data-winner-select aria-label="Winner">
            <option value="">— select players first —</option>
          </select>
        </div>

        <div class="form-group">
          <fieldset>
            <legend class="form-label">Result Type</legend>
            <div class="radio-group">
              ${resultTypeHtml()}
            </div>
          </fieldset>
        </div>

        <div class="cube-section form-group">
          <div class="toggle-row">
            <label class="toggle-label" for="cube-toggle">Doubling Cube Used?</label>
            <label class="toggle" aria-label="Enable doubling cube">
              <input type="checkbox" id="cube-toggle" name="cube-enabled" data-cube-toggle />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div data-cube-values hidden>
            ${cubeSelectHtml()}
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-full">Record Game</button>
      </form>
    </section>`;
}

// ---------------------------------------------------------------------------
// Update winner dropdown based on current player selections
// ---------------------------------------------------------------------------

function refreshWinnerSelect(container) {
  const [p1Select, p2Select] = [...container.querySelectorAll('select[data-player-select]')];
  const winnerSelect = container.querySelector('select[data-winner-select]');
  if (!winnerSelect) return;
  const { players } = getState();
  const p1Id = p1Select?.value || '';
  const p2Id = p2Select?.value || '';
  winnerSelect.innerHTML = '<option value="">— select winner —</option>' + winnerOptions(players, p1Id, p2Id);
}

// ---------------------------------------------------------------------------
// View module
// ---------------------------------------------------------------------------

let _playersChangedHandler = null;

export function render(container) {
  const { players } = getState();
  container.innerHTML = viewHtml(players);
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

  // Cube toggle
  container.addEventListener('change', (e) => {
    if (e.target.matches('[data-cube-toggle]')) {
      const cubeValuesEl = container.querySelector('[data-cube-values]');
      if (cubeValuesEl) cubeValuesEl.hidden = !e.target.checked;
    }

    // Player selects — update winner dropdown
    if (e.target.matches('[data-player-select]')) {
      refreshWinnerSelect(container);
    }
  });

  // Form submit
  const form = container.querySelector('#record-game-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearError();

      const [p1Select, p2Select] = [...container.querySelectorAll('select[data-player-select]')];
      const winnerSelect = container.querySelector('select[data-winner-select]');
      const resultRadio = container.querySelector('input[name="result-type"]:checked');
      const cubeToggle = container.querySelector('[data-cube-toggle]');
      const cubeSelect = container.querySelector('[data-cube-select]');

      const player1Id = p1Select?.value || '';
      const player2Id = p2Select?.value || '';
      const winnerId  = winnerSelect?.value || '';
      const resultType = resultRadio?.value || 'standard';
      const cubeEnabled = cubeToggle?.checked || false;
      const cubeValue = cubeEnabled ? Number(cubeSelect?.value || 2) : 1;

      if (!player1Id || !player2Id) {
        showError('Please select both players.');
        return;
      }
      if (player1Id === player2Id) {
        showError('Player 1 and Player 2 must be different.');
        return;
      }
      if (!winnerId) {
        showError('Please select the winner.');
        return;
      }

      try {
        recordGame({ player1Id, player2Id, winnerId, resultType, cubeValue });
        // Reset form to defaults
        if (p1Select) p1Select.value = '';
        if (p2Select) p2Select.value = '';
        if (winnerSelect) winnerSelect.innerHTML = '<option value="">— select players first —</option>';
        const defaultRadio = container.querySelector('input[name="result-type"][value="standard"]');
        if (defaultRadio) defaultRadio.checked = true;
        if (cubeToggle) cubeToggle.checked = false;
        const cubeValuesEl = container.querySelector('[data-cube-values]');
        if (cubeValuesEl) cubeValuesEl.hidden = true;
      } catch (err) {
        showError(err.message);
      }
    });
  }

  // Refresh player dropdowns when players change
  _playersChangedHandler = () => {
    const { players } = getState();
    container.querySelectorAll('select[data-player-select]').forEach((sel) => {
      const current = sel.value;
      sel.innerHTML = '<option value="">— select player —</option>' + playerOptions(players, current);
    });
    refreshWinnerSelect(container);
  };

  eventBus.on('state:players:changed', _playersChangedHandler);
  eventBus.on('state:reset', _playersChangedHandler);
}

export function onUnmount() {
  if (_playersChangedHandler) {
    eventBus.off('state:players:changed', _playersChangedHandler);
    eventBus.off('state:reset', _playersChangedHandler);
    _playersChangedHandler = null;
  }
}

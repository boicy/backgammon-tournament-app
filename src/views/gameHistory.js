import { getState, deleteGame } from '../store/store.js';
import { eventBus } from '../store/eventBus.js';
import { escapeHtml, formatTimestamp } from '../utils.js';

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

function playerName(players, playerId) {
  return players.find((p) => p.id === playerId)?.name ?? 'Unknown';
}

function gameItemHtml(game, players) {
  const p1Name = playerName(players, game.player1Id);
  const p2Name = playerName(players, game.player2Id);
  const winnerName = playerName(players, game.winnerId);
  const time = formatTimestamp(game.timestamp);
  const resultLabel = game.resultType.charAt(0).toUpperCase() + game.resultType.slice(1);

  return `
    <li class="history-item" data-game-id="${escapeHtml(game.id)}">
      <div class="history-summary" data-summary>
        <div class="history-players">
          <span class="history-winner">${escapeHtml(winnerName)}</span>
          <span class="history-vs"> beat </span>
          <span>${escapeHtml(winnerName === p1Name ? p2Name : p1Name)}</span>
          <span class="history-time"> · ${time} · #${game.sequence}</span>
        </div>
        <span class="history-pts">${game.matchPoints} pts</span>
        <div class="history-actions">
          <button class="btn btn-danger btn-sm" data-action="delete-game" data-delete-id="${escapeHtml(game.id)}"
            aria-label="Delete game #${game.sequence}">Delete</button>
        </div>
        <span class="history-expand-icon" aria-hidden="true">▾</span>
      </div>
      <div class="history-breakdown" data-breakdown hidden>
        <span class="breakdown-formula">${resultLabel} × ${game.cubeValue} = ${game.matchPoints} pts</span>
        <span class="breakdown-players"> — ${escapeHtml(p1Name)} vs ${escapeHtml(p2Name)}</span>
      </div>
    </li>`;
}

function listHtml(games, players) {
  if (games.length === 0) {
    return '<p class="empty-state">No games recorded yet. Record a game to see history.</p>';
  }
  // Display in reverse sequence order (most recent first)
  return `<ul class="history-list">${[...games].reverse().map((g) => gameItemHtml(g, players)).join('')}</ul>`;
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

let _container = null;
let _gamesChangedHandler = null;
let _currentFilter = '';

function rebuildList(container) {
  const { games, players } = getState();
  const listWrapper = container.querySelector('[data-history-list]');
  if (listWrapper) listWrapper.innerHTML = listHtml(games, players);
  applyFilter(container);
}

function applyFilter(container) {
  const filterValue = _currentFilter.trim().toLowerCase();
  container.querySelectorAll('[data-game-id]').forEach((item) => {
    if (!filterValue) {
      item.hidden = false;
      return;
    }
    const text = item.textContent.toLowerCase();
    item.hidden = !text.includes(filterValue);
  });
}

export function render(container) {
  const { games, players } = getState();
  container.innerHTML = `
    <section class="view view--history" aria-label="Game History">
      <h2>Game History</h2>
      <div class="history-filter form-group">
        <label for="history-filter" class="visually-hidden">Filter by player name</label>
        <input
          type="search"
          id="history-filter"
          class="input"
          placeholder="Filter by player name…"
          data-filter-input
          aria-label="Filter game history by player name"
        />
      </div>
      <div data-history-list>
        ${listHtml(games, players)}
      </div>
    </section>`;
}

export function onMount(container) {
  _currentFilter = '';

  // Filter input
  const filterInput = container.querySelector('[data-filter-input]');
  if (filterInput) {
    filterInput.addEventListener('input', (e) => {
      _currentFilter = e.target.value;
      applyFilter(container);
    });
  }

  // Event delegation for expand/collapse and delete
  container.addEventListener('click', _handleClick);

  function _handleClick(e) {
    // Delete game
    const deleteBtn = e.target.closest('[data-action="delete-game"]');
    if (deleteBtn) {
      e.stopPropagation(); // prevent expand toggle
      const gameId = deleteBtn.dataset.deleteId;
      if (window.confirm('Delete this game? Standings will be recalculated.')) {
        try {
          deleteGame(gameId);
        } catch (err) {
          console.error(err);
        }
      }
      return;
    }

    // Expand/collapse summary
    const summary = e.target.closest('[data-summary]');
    if (summary) {
      const item = summary.closest('[data-game-id]');
      if (!item) return;
      const breakdown = item.querySelector('[data-breakdown]');
      if (!breakdown) return;
      const isExpanded = !breakdown.hidden;
      breakdown.hidden = isExpanded;
      item.classList.toggle('expanded', !isExpanded);
    }
  }

  _container = container;
  container._handleClick = _handleClick;

  // Subscribe to store events
  _gamesChangedHandler = () => rebuildList(container);
  eventBus.on('state:games:changed', _gamesChangedHandler);
  eventBus.on('state:reset', _gamesChangedHandler);
}

export function onUnmount() {
  if (_container) {
    if (_container._handleClick) {
      _container.removeEventListener('click', _container._handleClick);
      _container._handleClick = null;
    }
    _container = null;
  }
  if (_gamesChangedHandler) {
    eventBus.off('state:games:changed', _gamesChangedHandler);
    eventBus.off('state:reset', _gamesChangedHandler);
    _gamesChangedHandler = null;
  }
  _currentFilter = '';
}

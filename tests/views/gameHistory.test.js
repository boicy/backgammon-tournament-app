import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const ALICE = { id: 'p1', name: 'Alice' };
const BOB   = { id: 'p2', name: 'Bob'   };

const makeGame = (overrides = {}) => ({
  id: 'g1',
  player1Id: 'p1',
  player2Id: 'p2',
  winnerId: 'p1',
  resultType: 'gammon',
  cubeValue: 4,
  matchPoints: 8,
  timestamp: 1741046400000,
  sequence: 1,
  ...overrides,
});

const { mockState, mockStore, busHandlers, mockEventBus } = vi.hoisted(() => {
  const busHandlers = {};
  const mockState = {
    tournament: { id: 't1', name: 'Test', date: new Date().toISOString(), status: 'active' },
    players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
    games: [],
    standings: [],
  };
  const mockStore = {
    getState: vi.fn(() => ({ ...mockState, games: [...mockState.games], players: [...mockState.players] })),
    deleteGame: vi.fn(),
  };
  const mockEventBus = {
    on: vi.fn((event, handler) => {
      if (!busHandlers[event]) busHandlers[event] = [];
      busHandlers[event].push(handler);
    }),
    off: vi.fn((event, handler) => {
      if (busHandlers[event]) {
        busHandlers[event] = busHandlers[event].filter((h) => h !== handler);
      }
    }),
    emit: vi.fn((event, detail) => {
      (busHandlers[event] || []).forEach((h) => h({ detail }));
    }),
  };
  return { mockState, mockStore, busHandlers, mockEventBus };
});

vi.mock('../../src/store/store.js', () => mockStore);
vi.mock('../../src/store/eventBus.js', () => ({ eventBus: mockEventBus }));

import * as view from '../../src/views/gameHistory.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContainer() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

function cleanup(el) {
  view.onUnmount();
  el.remove();
}

function setGames(games) {
  mockState.games = games;
  mockStore.getState.mockReturnValue({
    ...mockState,
    games: [...games],
    players: [...mockState.players],
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockState.games = [];
  mockStore.getState.mockReturnValue({ ...mockState, games: [], players: [ALICE, BOB] });
  Object.keys(busHandlers).forEach((k) => delete busHandlers[k]);
});

describe('gameHistory view — render', () => {
  it('shows empty state when no games exist', () => {
    const container = makeContainer();
    view.render(container);
    expect(container.textContent.toLowerCase()).toMatch(/no games|empty|record.*game/);
    cleanup(container);
  });

  it('renders one list item per game', () => {
    setGames([
      makeGame({ id: 'g1', sequence: 1 }),
      makeGame({ id: 'g2', sequence: 2, winnerId: 'p2' }),
    ]);
    const container = makeContainer();
    view.render(container);
    const items = container.querySelectorAll('[data-game-id]');
    expect(items).toHaveLength(2);
    cleanup(container);
  });

  it('each entry shows player names', () => {
    setGames([makeGame()]);
    const container = makeContainer();
    view.render(container);
    expect(container.textContent).toContain('Alice');
    expect(container.textContent).toContain('Bob');
    cleanup(container);
  });

  it('each entry shows total matchPoints', () => {
    setGames([makeGame({ matchPoints: 8 })]);
    const container = makeContainer();
    view.render(container);
    expect(container.textContent).toContain('8');
    cleanup(container);
  });

  it('renders a player filter input', () => {
    const container = makeContainer();
    view.render(container);
    expect(container.querySelector('[data-filter-input], input[type="search"], input[placeholder*="filter" i]')).not.toBeNull();
    cleanup(container);
  });
});

describe('gameHistory view — expand/collapse', () => {
  it('breakdown panel is hidden by default', () => {
    setGames([makeGame()]);
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    const breakdown = container.querySelector('[data-breakdown]');
    expect(breakdown).not.toBeNull();
    const hidden = breakdown.hidden || breakdown.style.display === 'none' || breakdown.classList.contains('hidden');
    expect(hidden).toBe(true);
    cleanup(container);
  });

  it('shows breakdown with score formula when summary is clicked', () => {
    setGames([makeGame({ resultType: 'gammon', cubeValue: 4, matchPoints: 8 })]);
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    container.querySelector('[data-summary]').click();

    const breakdown = container.querySelector('[data-breakdown]');
    const visible = !breakdown.hidden && breakdown.style.display !== 'none' && !breakdown.classList.contains('hidden');
    expect(visible).toBe(true);
    // Score breakdown should show "gammon × 4 = 8"
    const text = breakdown.textContent.toLowerCase();
    expect(text).toContain('gammon');
    expect(text).toContain('4');
    expect(text).toContain('8');
    cleanup(container);
  });

  it('collapses expanded breakdown when summary clicked again', () => {
    setGames([makeGame()]);
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    const summary = container.querySelector('[data-summary]');
    summary.click(); // expand
    summary.click(); // collapse

    const breakdown = container.querySelector('[data-breakdown]');
    const hidden = breakdown.hidden || breakdown.style.display === 'none' || breakdown.classList.contains('hidden');
    expect(hidden).toBe(true);
    cleanup(container);
  });
});

describe('gameHistory view — filter', () => {
  it('filters visible entries by player name', () => {
    setGames([
      makeGame({ id: 'g1', player1Id: 'p1', player2Id: 'p2' }),
      // A game without Alice: need a Charlie player — but we only have Alice/Bob
      // Instead test that Alice's game IS shown when filtering "Alice"
    ]);
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    const filterInput = container.querySelector('[data-filter-input]');
    filterInput.value = 'Alice';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));

    const visibleItems = [...container.querySelectorAll('[data-game-id]')].filter(
      (el) => !el.hidden && el.style.display !== 'none' && !el.classList.contains('hidden'),
    );
    expect(visibleItems.length).toBeGreaterThan(0);
    cleanup(container);
  });

  it('hides entries not matching the filter', () => {
    setGames([makeGame({ id: 'g1' })]);
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    const filterInput = container.querySelector('[data-filter-input]');
    filterInput.value = 'Charlie'; // no player named Charlie
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));

    const visibleItems = [...container.querySelectorAll('[data-game-id]')].filter(
      (el) => !el.hidden && el.style.display !== 'none' && !el.classList.contains('hidden'),
    );
    expect(visibleItems).toHaveLength(0);
    cleanup(container);
  });

  it('shows all entries when filter is cleared', () => {
    setGames([makeGame({ id: 'g1' }), makeGame({ id: 'g2', sequence: 2 })]);
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    const filterInput = container.querySelector('[data-filter-input]');
    filterInput.value = 'Charlie';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));

    filterInput.value = '';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));

    const visibleItems = [...container.querySelectorAll('[data-game-id]')].filter(
      (el) => !el.hidden && el.style.display !== 'none' && !el.classList.contains('hidden'),
    );
    expect(visibleItems).toHaveLength(2);
    cleanup(container);
  });
});

describe('gameHistory view — delete', () => {
  it('calls store.deleteGame when delete button is clicked and user confirms', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    setGames([makeGame({ id: 'g1' })]);
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    container.querySelector('[data-action="delete-game"]').click();

    expect(mockStore.deleteGame).toHaveBeenCalledWith('g1');
    cleanup(container);
  });

  it('does NOT call store.deleteGame when user cancels confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    setGames([makeGame({ id: 'g1' })]);
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    container.querySelector('[data-action="delete-game"]').click();

    expect(mockStore.deleteGame).not.toHaveBeenCalled();
    cleanup(container);
  });
});

describe('gameHistory view — event bus', () => {
  it('subscribes to state:games:changed in onMount', () => {
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    expect(mockEventBus.on).toHaveBeenCalledWith('state:games:changed', expect.any(Function));
    cleanup(container);
  });

  it('re-renders the list when state:games:changed fires', () => {
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    const newGames = [makeGame()];
    mockStore.getState.mockReturnValue({
      ...mockState,
      games: newGames,
      players: [ALICE, BOB],
    });
    mockEventBus.emit('state:games:changed', { games: newGames });

    expect(container.querySelectorAll('[data-game-id]')).toHaveLength(1);
    cleanup(container);
  });

  it('unsubscribes from state:games:changed in onUnmount', () => {
    const container = makeContainer();
    view.render(container);
    view.onMount(container);
    view.onUnmount();

    expect(mockEventBus.off).toHaveBeenCalledWith('state:games:changed', expect.any(Function));
    container.remove();
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const ALICE = { id: 'p1', name: 'Alice' };
const BOB   = { id: 'p2', name: 'Bob'   };

const { mockState, mockStore, busHandlers, mockEventBus } = vi.hoisted(() => {
  const busHandlers = {};
  const mockState = {
    tournament: { id: 't1', name: 'Test', date: new Date().toISOString(), status: 'active' },
    players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
    games: [],
    standings: [],
  };
  const mockStore = {
    getState: vi.fn(() => ({ ...mockState, players: [...mockState.players] })),
    recordGame: vi.fn(),
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

import * as view from '../../src/views/recordGame.js';

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

function setPlayers(players) {
  mockState.players = players;
  mockStore.getState.mockReturnValue({ ...mockState, players: [...players] });
}

function getSelects(container) {
  const selects = container.querySelectorAll('select');
  // Expect at least: player1, player2, winner selects (result type may be radio)
  return selects;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockState.players = [ALICE, BOB];
  mockStore.getState.mockReturnValue({ ...mockState, players: [ALICE, BOB] });
  Object.keys(busHandlers).forEach((k) => delete busHandlers[k]);
});

describe('recordGame view — render', () => {
  it('renders player dropdowns populated from state', () => {
    const container = makeContainer();
    view.render(container);
    const options = [...container.querySelectorAll('option')].map((o) => o.textContent.trim());
    expect(options).toContain('Alice');
    expect(options).toContain('Bob');
    cleanup(container);
  });

  it('renders result type options (standard, gammon, backgammon)', () => {
    const container = makeContainer();
    view.render(container);
    const text = container.textContent.toLowerCase();
    expect(text).toContain('standard');
    expect(text).toContain('gammon');
    expect(text).toContain('backgammon');
    cleanup(container);
  });

  it('renders a cube toggle control', () => {
    const container = makeContainer();
    view.render(container);
    const toggle = container.querySelector('[data-cube-toggle], input[type="checkbox"][name="cube-enabled"]');
    expect(toggle).not.toBeNull();
    cleanup(container);
  });

  it('cube value selector is hidden when toggle is off', () => {
    const container = makeContainer();
    view.render(container);
    // The cube dropdown / selector should not be visible initially
    const cubeValues = container.querySelector('[data-cube-values]');
    expect(cubeValues).not.toBeNull();
    const hidden = cubeValues.hidden || cubeValues.style.display === 'none' || cubeValues.classList.contains('hidden');
    expect(hidden).toBe(true);
    cleanup(container);
  });

  it('shows empty state when fewer than 2 players exist', () => {
    setPlayers([ALICE]);
    const container = makeContainer();
    view.render(container);
    const text = container.textContent.toLowerCase();
    expect(text).toMatch(/need|require|add.*player|at least/);
    cleanup(container);
  });
});

describe('recordGame view — cube toggle', () => {
  it('reveals cube value selector when toggle is turned on', () => {
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    const toggle = container.querySelector('[data-cube-toggle]');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));

    const cubeValues = container.querySelector('[data-cube-values]');
    const visible = !cubeValues.hidden && cubeValues.style.display !== 'none' && !cubeValues.classList.contains('hidden');
    expect(visible).toBe(true);
    cleanup(container);
  });

  it('cube value options include 2, 4, 8, 16, 32, 64', () => {
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    const toggle = container.querySelector('[data-cube-toggle]');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));

    const cubeSelect = container.querySelector('[data-cube-select]');
    expect(cubeSelect).not.toBeNull();
    const values = [...cubeSelect.options].map((o) => Number(o.value));
    expect(values).toContain(2);
    expect(values).toContain(4);
    expect(values).toContain(64);
    cleanup(container);
  });
});

describe('recordGame view — form submission', () => {
  it('calls store.recordGame with correct arguments on submit', () => {
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    // Select player1 = Alice, player2 = Bob, winner = Alice, result = standard, cube off (=1)
    const [p1Select, p2Select] = [...container.querySelectorAll('select[data-player-select]')];
    const winnerSelect = container.querySelector('select[data-winner-select]');

    if (p1Select) p1Select.value = ALICE.id;
    if (p2Select) p2Select.value = BOB.id;
    if (winnerSelect) {
      // Trigger a change to populate winner options
      if (p1Select) p1Select.dispatchEvent(new Event('change', { bubbles: true }));
      if (p2Select) p2Select.dispatchEvent(new Event('change', { bubbles: true }));
      winnerSelect.value = ALICE.id;
    }

    // Keep result type at default (standard), cube toggle off
    container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true }));

    expect(mockStore.recordGame).toHaveBeenCalledWith(
      expect.objectContaining({
        player1Id: ALICE.id,
        player2Id: BOB.id,
        winnerId: ALICE.id,
        resultType: 'standard',
        cubeValue: 1,
      }),
    );
    cleanup(container);
  });

  it('passes cubeValue from select when cube toggle is enabled', () => {
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    const toggle = container.querySelector('[data-cube-toggle]');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));

    const cubeSelect = container.querySelector('[data-cube-select]');
    if (cubeSelect) cubeSelect.value = '4';

    const [p1Select, p2Select] = [...container.querySelectorAll('select[data-player-select]')];
    const winnerSelect = container.querySelector('select[data-winner-select]');
    if (p1Select) p1Select.value = ALICE.id;
    if (p2Select) p2Select.value = BOB.id;
    if (p1Select) p1Select.dispatchEvent(new Event('change', { bubbles: true }));
    if (p2Select) p2Select.dispatchEvent(new Event('change', { bubbles: true }));
    if (winnerSelect) winnerSelect.value = ALICE.id;

    container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true }));

    expect(mockStore.recordGame).toHaveBeenCalledWith(
      expect.objectContaining({ cubeValue: 4 }),
    );
    cleanup(container);
  });

  it('shows error when same player selected for both roles', () => {
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    const [p1Select, p2Select] = [...container.querySelectorAll('select[data-player-select]')];
    if (p1Select) p1Select.value = ALICE.id;
    if (p2Select) p2Select.value = ALICE.id;

    container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true }));

    const errorEl = container.querySelector('[role="alert"], .error-message, [data-error]');
    expect(errorEl?.textContent.trim().length).toBeGreaterThan(0);
    expect(mockStore.recordGame).not.toHaveBeenCalled();
    cleanup(container);
  });

  it('shows error when store.recordGame throws', () => {
    mockStore.recordGame.mockImplementation(() => { throw new Error('Invalid game data'); });
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    const [p1Select, p2Select] = [...container.querySelectorAll('select[data-player-select]')];
    const winnerSelect = container.querySelector('select[data-winner-select]');
    if (p1Select) p1Select.value = ALICE.id;
    if (p2Select) p2Select.value = BOB.id;
    if (p1Select) p1Select.dispatchEvent(new Event('change', { bubbles: true }));
    if (p2Select) p2Select.dispatchEvent(new Event('change', { bubbles: true }));
    if (winnerSelect) winnerSelect.value = ALICE.id;

    container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true }));

    const errorEl = container.querySelector('[role="alert"], .error-message, [data-error]');
    expect(errorEl?.textContent.trim().length).toBeGreaterThan(0);
    cleanup(container);
  });
});

describe('recordGame view — event bus subscription', () => {
  it('subscribes to state:players:changed in onMount', () => {
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    expect(mockEventBus.on).toHaveBeenCalledWith('state:players:changed', expect.any(Function));
    cleanup(container);
  });

  it('refreshes player dropdowns when state:players:changed fires', () => {
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    const newPlayers = [ALICE, BOB, { id: 'p3', name: 'Charlie' }];
    mockStore.getState.mockReturnValue({ ...mockState, players: newPlayers });
    mockEventBus.emit('state:players:changed', { players: newPlayers });

    expect(container.textContent).toContain('Charlie');
    cleanup(container);
  });

  it('unsubscribes from events in onUnmount', () => {
    const container = makeContainer();
    view.render(container);
    view.onMount(container);
    view.onUnmount();

    expect(mockEventBus.off).toHaveBeenCalledWith('state:players:changed', expect.any(Function));
    container.remove();
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — must come before importing the module under test
// ---------------------------------------------------------------------------

const { mockState, mockStore, busHandlers, mockEventBus } = vi.hoisted(() => {
  const busHandlers = {};
  const mockState = {
    tournament: { id: 't1', name: 'Test', date: new Date().toISOString(), status: 'active' },
    players: [],
    games: [],
    standings: [],
    schedule: null,
    roster: [],
    archive: [],
  };
  const mockStore = {
    getState: vi.fn(() => ({ ...mockState, players: [...mockState.players], roster: [...(mockState.roster || [])] })),
    addPlayer: vi.fn(),
    removePlayer: vi.fn(),
    resetTournament: vi.fn(),
    endTournament: vi.fn(),
    initTournament: vi.fn(),
    enableRoundRobin: vi.fn(),
    disableRoundRobin: vi.fn(),
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

import * as view from '../../src/views/playerRegistration.js';

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockState.players = [];
  mockStore.getState.mockReturnValue({ ...mockState, players: [] });
  Object.keys(busHandlers).forEach((k) => delete busHandlers[k]);
});

describe('playerRegistration view — render', () => {
  it('renders an add-player form with a name input and submit button', () => {
    const container = makeContainer();
    view.render(container);
    expect(container.querySelector('input[type="text"]')).not.toBeNull();
    expect(container.querySelector('button[type="submit"], input[type="submit"]')).not.toBeNull();
    cleanup(container);
  });

  it('shows empty state message when player list is empty', () => {
    const container = makeContainer();
    view.render(container);
    const text = container.textContent.toLowerCase();
    expect(text).toMatch(/no players|add.*player|empty/);
    cleanup(container);
  });

  it('renders a list of player names when players exist', () => {
    setPlayers([{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }]);
    const container = makeContainer();
    view.render(container);
    expect(container.textContent).toContain('Alice');
    expect(container.textContent).toContain('Bob');
    cleanup(container);
  });

  it('renders a remove button for each player', () => {
    setPlayers([{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }]);
    const container = makeContainer();
    view.render(container);
    const removeButtons = container.querySelectorAll('[data-action="remove-player"]');
    expect(removeButtons).toHaveLength(2);
    cleanup(container);
  });

  it('renders a reset-tournament button', () => {
    const container = makeContainer();
    view.render(container);
    const resetBtn = container.querySelector('[data-action="reset-tournament"]');
    expect(resetBtn).not.toBeNull();
    cleanup(container);
  });
});

describe('playerRegistration view — add player', () => {
  it('calls store.addPlayer with the trimmed name on form submit', () => {
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    const input = container.querySelector('input[type="text"]');
    const form = container.querySelector('form');
    input.value = '  Alice  ';
    form.dispatchEvent(new Event('submit', { bubbles: true }));

    expect(mockStore.addPlayer).toHaveBeenCalledWith('Alice');
    cleanup(container);
  });

  it('clears the input after a successful submission', () => {
    mockStore.addPlayer.mockImplementation(() => {});
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    const input = container.querySelector('input[type="text"]');
    const form = container.querySelector('form');
    input.value = 'Charlie';
    form.dispatchEvent(new Event('submit', { bubbles: true }));

    expect(input.value).toBe('');
    cleanup(container);
  });

  it('shows an inline error message when store.addPlayer throws', () => {
    mockStore.addPlayer.mockImplementation(() => { throw new Error('Player name already exists'); });
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    const input = container.querySelector('input[type="text"]');
    const form = container.querySelector('form');
    input.value = 'Alice';
    form.dispatchEvent(new Event('submit', { bubbles: true }));

    const errorEl = container.querySelector('[role="alert"], .error, [data-error]');
    expect(errorEl).not.toBeNull();
    expect(errorEl.textContent).toMatch(/already exists/i);
    cleanup(container);
  });

  it('does not submit when the input is empty', () => {
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    const input = container.querySelector('input[type="text"]');
    const form = container.querySelector('form');
    input.value = '';
    form.dispatchEvent(new Event('submit', { bubbles: true }));

    expect(mockStore.addPlayer).not.toHaveBeenCalled();
    cleanup(container);
  });
});

describe('playerRegistration view — remove player', () => {
  it('calls store.removePlayer with the player id when remove button clicked', () => {
    setPlayers([{ id: 'p1', name: 'Alice' }]);
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    const removeBtn = container.querySelector('[data-action="remove-player"]');
    removeBtn.click();

    expect(mockStore.removePlayer).toHaveBeenCalledWith('p1');
    cleanup(container);
  });

  it('shows an error when store.removePlayer throws', () => {
    setPlayers([{ id: 'p1', name: 'Alice' }]);
    mockStore.removePlayer.mockImplementation(() => { throw new Error('Cannot remove a player with recorded games'); });
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    container.querySelector('[data-action="remove-player"]').click();

    const errorEl = container.querySelector('[role="alert"], .error, [data-error]');
    expect(errorEl).not.toBeNull();
    expect(errorEl.textContent).toMatch(/recorded games/i);
    cleanup(container);
  });
});

describe('playerRegistration view — reset tournament', () => {
  it('shows a confirmation before calling store.resetTournament', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    container.querySelector('[data-action="reset-tournament"]').click();

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockStore.resetTournament).toHaveBeenCalled();
    confirmSpy.mockRestore();
    cleanup(container);
  });

  it('does NOT call store.resetTournament when user cancels confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    container.querySelector('[data-action="reset-tournament"]').click();

    expect(mockStore.resetTournament).not.toHaveBeenCalled();
    cleanup(container);
  });
});

describe('playerRegistration view — event bus subscription', () => {
  it('subscribes to state:players:changed in onMount', () => {
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    expect(mockEventBus.on).toHaveBeenCalledWith('state:players:changed', expect.any(Function));
    cleanup(container);
  });

  it('re-renders the player list when state:players:changed fires', () => {
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    // Simulate a player being added
    mockStore.getState.mockReturnValue({
      ...mockState,
      players: [{ id: 'p1', name: 'Alice' }],
    });
    mockEventBus.emit('state:players:changed', { players: [{ id: 'p1', name: 'Alice' }] });

    expect(container.textContent).toContain('Alice');
    cleanup(container);
  });

  it('unsubscribes from state:players:changed in onUnmount', () => {
    const container = makeContainer();
    view.render(container);
    view.onMount(container);
    view.onUnmount();

    expect(mockEventBus.off).toHaveBeenCalledWith('state:players:changed', expect.any(Function));
    container.remove();
  });
});

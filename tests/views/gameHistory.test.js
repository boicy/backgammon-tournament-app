import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const ALICE = { id: 'p1', name: 'Alice' };
const BOB   = { id: 'p2', name: 'Bob'   };

function makeGame(overrides = {}) {
  return {
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
  };
}

function makeMatch(overrides = {}) {
  return {
    id: 'm1',
    player1Id: 'p1',
    player2Id: 'p2',
    targetScore: 5,
    status: 'complete',
    winnerId: 'p1',
    startedAt: 1000,
    completedAt: 2000,
    games: [makeGame()],
    ...overrides,
  };
}

const { mockState, mockStore, busHandlers, mockEventBus } = vi.hoisted(() => {
  const busHandlers = {};
  const mockState = {
    tournament: { id: 't1', name: 'Test', date: new Date().toISOString(), status: 'active' },
    players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
    matches: [],
    standings: [],
  };
  const mockStore = {
    getState: vi.fn(() => ({
      ...mockState,
      matches: [...mockState.matches],
      players: [...mockState.players],
    })),
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

function setMatches(matches) {
  mockState.matches = matches;
  mockStore.getState.mockReturnValue({
    ...mockState,
    matches: [...matches],
    players: [...mockState.players],
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockState.matches = [];
  mockStore.getState.mockReturnValue({ ...mockState, matches: [], players: [ALICE, BOB] });
  Object.keys(busHandlers).forEach((k) => delete busHandlers[k]);
});

describe('gameHistory view — render', () => {
  it('shows empty state when no matches exist', () => {
    const container = makeContainer();
    view.render(container);
    expect(container.textContent.toLowerCase()).toMatch(/no matches|empty/);
    cleanup(container);
  });

  it('renders a match group header per match', () => {
    setMatches([makeMatch()]);
    const container = makeContainer();
    view.render(container);
    const headers = container.querySelectorAll('.match-group-header');
    expect(headers).toHaveLength(1);
    cleanup(container);
  });

  it('match group header shows both player names', () => {
    setMatches([makeMatch()]);
    const container = makeContainer();
    view.render(container);
    const header = container.querySelector('.match-group-header');
    expect(header.textContent).toContain('Alice');
    expect(header.textContent).toContain('Bob');
    cleanup(container);
  });

  it('renders game items within a match group', () => {
    setMatches([makeMatch({ games: [makeGame({ id: 'g1' }), makeGame({ id: 'g2', sequence: 2 })] })]);
    const container = makeContainer();
    view.render(container);
    const items = container.querySelectorAll('.history-item');
    expect(items).toHaveLength(2);
    cleanup(container);
  });

  it('shows winner name in each game row', () => {
    setMatches([makeMatch()]);
    const container = makeContainer();
    view.render(container);
    expect(container.textContent).toContain('Alice');
    cleanup(container);
  });

  it('shows match points in each game row', () => {
    setMatches([makeMatch({ games: [makeGame({ matchPoints: 8 })] })]);
    const container = makeContainer();
    view.render(container);
    expect(container.textContent).toContain('8');
    cleanup(container);
  });

  it('renders multiple match groups', () => {
    setMatches([
      makeMatch({ id: 'm1' }),
      makeMatch({ id: 'm2', player1Id: 'p1', player2Id: 'p2', games: [makeGame({ id: 'g2', sequence: 2 })] }),
    ]);
    const container = makeContainer();
    view.render(container);
    const groups = container.querySelectorAll('.match-group');
    expect(groups).toHaveLength(2);
    cleanup(container);
  });
});

describe('gameHistory view — event bus', () => {
  it('subscribes to state:matches:changed in onMount', () => {
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    expect(mockEventBus.on).toHaveBeenCalledWith('state:matches:changed', expect.any(Function));
    cleanup(container);
  });

  it('re-renders the list when state:matches:changed fires', () => {
    const container = makeContainer();
    view.render(container);
    view.onMount(container);

    const newMatches = [makeMatch()];
    mockStore.getState.mockReturnValue({
      ...mockState,
      matches: newMatches,
      players: [ALICE, BOB],
    });
    mockEventBus.emit('state:matches:changed', { matches: newMatches });

    expect(container.querySelectorAll('.match-group')).toHaveLength(1);
    cleanup(container);
  });

  it('unsubscribes from state:matches:changed in onUnmount', () => {
    const container = makeContainer();
    view.render(container);
    view.onMount(container);
    view.onUnmount();

    expect(mockEventBus.off).toHaveBeenCalledWith('state:matches:changed', expect.any(Function));
    container.remove();
  });
});

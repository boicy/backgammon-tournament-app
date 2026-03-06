import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const { mockState, busHandlers, mockEventBus } = vi.hoisted(() => {
  const busHandlers = {};
  const mockState = {
    tournament: { id: 't1', name: 'Club Night', date: '2026-03-06', status: 'active' },
    players: [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
      { id: 'p3', name: 'Charlie' },
    ],
    matches: [],
    roster: [],
    standings: [],
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
  return { mockState, busHandlers, mockEventBus };
});

vi.mock('../../src/store/store.js', () => ({
  getState: vi.fn(),
  addPlayer: vi.fn(),
  removePlayer: vi.fn(),
  startMatch: vi.fn(),
  abandonMatch: vi.fn(),
  recordMatchGame: vi.fn(),
}));
vi.mock('../../src/store/eventBus.js', () => ({ eventBus: mockEventBus }));
vi.mock('../../src/router.js', () => ({ updateTournamentState: vi.fn() }));

import { getState } from '../../src/store/store.js';
import * as view from '../../src/views/liveView.js';

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

function makeMatch(overrides = {}) {
  return {
    id: 'm1',
    player1Id: 'p1',
    player2Id: 'p2',
    targetScore: 7,
    status: 'active',
    games: [],
    winnerId: null,
    ...overrides,
  };
}

function makeGame(winnerId, pts = 1) {
  return { winnerId, matchPoints: pts, resultType: 'standard', cubeValue: 1 };
}

function setState(overrides = {}) {
  const state = { ...mockState, ...overrides };
  getState.mockReturnValue(state);
  return state;
}

// ---------------------------------------------------------------------------
// Phase 2 / T004: renderMatchCard HTML rendering
// ---------------------------------------------------------------------------

describe('liveView — renderMatchCard', () => {
  beforeEach(() => {
    Object.keys(busHandlers).forEach((k) => delete busHandlers[k]);
    vi.clearAllMocks();
  });

  it('renders player names on active match card', () => {
    const container = makeContainer();
    setState({
      players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
      matches: [makeMatch()],
    });
    view.render(container);
    expect(container.textContent).toContain('Alice');
    expect(container.textContent).toContain('Bob');
    cleanup(container);
  });

  it('renders scores 0-0 on a new match', () => {
    const container = makeContainer();
    setState({ matches: [makeMatch({ games: [] })] });
    view.render(container);
    const scoreEl = container.querySelector('.live-card__score');
    expect(scoreEl).not.toBeNull();
    // Score element should contain two 0s
    const text = scoreEl.textContent.replace(/\s/g, '');
    expect(text).toMatch(/0.*0/);
    cleanup(container);
  });

  it('renders target score on card', () => {
    const container = makeContainer();
    setState({ matches: [makeMatch({ targetScore: 7 })] });
    view.render(container);
    expect(container.textContent).toContain('7');
    cleanup(container);
  });

  it('renders game count on card after 3 games', () => {
    const container = makeContainer();
    setState({
      matches: [makeMatch({ games: [makeGame('p1'), makeGame('p2'), makeGame('p1')] })],
    });
    view.render(container);
    expect(container.textContent).toMatch(/game\s*3|3\s*game/i);
    cleanup(container);
  });

  it('renders Record Game button on active match card', () => {
    const container = makeContainer();
    setState({ matches: [makeMatch()] });
    view.render(container);
    const btn = container.querySelector('[data-action="record-game"]');
    expect(btn).not.toBeNull();
    cleanup(container);
  });

  it('renders overflow \u22ef button on active match card', () => {
    const container = makeContainer();
    setState({ matches: [makeMatch()] });
    view.render(container);
    const overflow = container.querySelector('[data-action="open-overflow"]') ||
                     container.querySelector('.live-card__overflow-btn');
    expect(overflow).not.toBeNull();
    cleanup(container);
  });

  it('renders completed card with winner name and complete class', () => {
    const container = makeContainer();
    setState({
      players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
      matches: [makeMatch({ status: 'complete', winnerId: 'p1' })],
    });
    view.render(container);
    const card = container.querySelector('.live-card--complete');
    expect(card).not.toBeNull();
    expect(card.textContent).toContain('Alice');
    cleanup(container);
  });
});

// ---------------------------------------------------------------------------
// Phase 4 / T009: expand/collapse logic
// ---------------------------------------------------------------------------

describe('liveView — expand/collapse (_expandedCardId)', () => {
  beforeEach(() => {
    Object.keys(busHandlers).forEach((k) => delete busHandlers[k]);
    vi.clearAllMocks();
  });

  it('clicking Record Game expands the inline form', () => {
    const container = makeContainer();
    setState({ matches: [makeMatch({ id: 'm1' })] });
    view.render(container);
    view.onMount(container);

    container.querySelector('[data-action="record-game"]').click();

    const formWrap = container.querySelector('[data-expanded="true"]');
    expect(formWrap).not.toBeNull();
    cleanup(container);
  });

  it('clicking Record Game again collapses the form', () => {
    const container = makeContainer();
    setState({ matches: [makeMatch({ id: 'm1' })] });
    view.render(container);
    view.onMount(container);

    const btn = container.querySelector('[data-action="record-game"]');
    btn.click();
    btn.click();

    const formWrap = container.querySelector('[data-expanded="true"]');
    expect(formWrap).toBeNull();
    cleanup(container);
  });

  it('expanding card B collapses card A (single form constraint)', () => {
    const container = makeContainer();
    setState({
      players: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Charlie' },
      ],
      matches: [
        makeMatch({ id: 'm1', player1Id: 'p1', player2Id: 'p2' }),
        makeMatch({ id: 'm2', player1Id: 'p3', player2Id: 'p2' }),
      ],
    });
    view.render(container);
    view.onMount(container);

    const [btnA, btnB] = container.querySelectorAll('[data-action="record-game"]');
    btnA.click();
    btnB.click();

    const expanded = container.querySelectorAll('[data-expanded="true"]');
    expect(expanded.length).toBe(1);
    cleanup(container);
  });

  it('expanded card shows winner/result/cube selectors and submit', () => {
    const container = makeContainer();
    setState({
      players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
      matches: [makeMatch({ id: 'm1' })],
    });
    view.render(container);
    view.onMount(container);

    container.querySelector('[data-action="record-game"]').click();

    const form = container.querySelector('.live-card__form') ||
                 container.querySelector('[data-game-form]');
    expect(form).not.toBeNull();
    // Should have selects (winner, result type, cube value)
    const selects = form.querySelectorAll('select');
    expect(selects.length).toBeGreaterThanOrEqual(1);
    // Should have a submit button
    const submit = form.querySelector('[data-action="submit-game"]') ||
                   form.querySelector('button[type="submit"]');
    expect(submit).not.toBeNull();
    cleanup(container);
  });
});

// ---------------------------------------------------------------------------
// Phase 8 / T024: tournament header rendering
// ---------------------------------------------------------------------------

describe('liveView — tournament header', () => {
  beforeEach(() => {
    Object.keys(busHandlers).forEach((k) => delete busHandlers[k]);
    vi.clearAllMocks();
  });

  it('renders player count in header', () => {
    const container = makeContainer();
    setState({
      players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
      matches: [],
    });
    view.render(container);
    expect(container.textContent).toMatch(/2\s*player/i);
    cleanup(container);
  });

  it('renders add-player + button', () => {
    const container = makeContainer();
    setState({ matches: [] });
    view.render(container);
    const addBtn = container.querySelector('[data-action="toggle-add-player"]') ||
                   container.querySelector('.live-header__add-btn');
    expect(addBtn).not.toBeNull();
    cleanup(container);
  });

  it('roster is collapsed by default', () => {
    const container = makeContainer();
    setState({ matches: [] });
    view.render(container);
    const roster = container.querySelector('.live-roster');
    if (roster) {
      expect(roster.dataset.expanded).not.toBe('true');
    } else {
      expect(container.querySelector('[data-action="remove-player"]')).toBeNull();
    }
    cleanup(container);
  });

  it('tapping player count expands roster with Remove buttons', () => {
    const container = makeContainer();
    setState({
      players: [{ id: 'p1', name: 'Alice' }],
      matches: [],
    });
    view.render(container);
    view.onMount(container);

    const playersBtn = container.querySelector('[data-action="toggle-roster"]') ||
                       container.querySelector('.live-header__players-btn');
    if (playersBtn) playersBtn.click();

    expect(container.querySelector('[data-action="remove-player"]')).not.toBeNull();
    cleanup(container);
  });
});

// ---------------------------------------------------------------------------
// Phase 9 / T027: new match form
// ---------------------------------------------------------------------------

describe('liveView — new match form', () => {
  beforeEach(() => {
    Object.keys(busHandlers).forEach((k) => delete busHandlers[k]);
    vi.clearAllMocks();
  });

  it('renders + New Match button', () => {
    const container = makeContainer();
    setState({ matches: [] });
    view.render(container);
    const btn = container.querySelector('[data-action="toggle-new-match"]') ||
                container.querySelector('.live-new-match__toggle');
    expect(btn).not.toBeNull();
    cleanup(container);
  });

  it('+ New Match button is disabled when fewer than 2 players', () => {
    const container = makeContainer();
    setState({ players: [{ id: 'p1', name: 'Alice' }], matches: [] });
    view.render(container);
    const btn = container.querySelector('[data-action="toggle-new-match"]') ||
                container.querySelector('.live-new-match__toggle');
    expect(btn?.disabled).toBe(true);
    cleanup(container);
  });

  it('expanded new match form has player selects', () => {
    const container = makeContainer();
    setState({
      players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
      matches: [],
    });
    view.render(container);
    view.onMount(container);

    const toggleBtn = container.querySelector('[data-action="toggle-new-match"]') ||
                      container.querySelector('.live-new-match__toggle');
    if (toggleBtn && !toggleBtn.disabled) toggleBtn.click();

    const pickBtns = container.querySelectorAll('[data-action="pick-player"]');
    expect(pickBtns.length).toBeGreaterThanOrEqual(2);
    cleanup(container);
  });
});

// ---------------------------------------------------------------------------
// Event bus lifecycle
// ---------------------------------------------------------------------------

describe('liveView — event bus lifecycle', () => {
  beforeEach(() => {
    Object.keys(busHandlers).forEach((k) => delete busHandlers[k]);
    vi.clearAllMocks();
  });

  it('subscribes to state:matches:changed in onMount', () => {
    const container = makeContainer();
    setState({ matches: [] });
    view.render(container);
    view.onMount(container);
    expect(mockEventBus.on).toHaveBeenCalledWith('state:matches:changed', expect.any(Function));
    cleanup(container);
  });

  it('subscribes to state:players:changed in onMount', () => {
    const container = makeContainer();
    setState({ matches: [] });
    view.render(container);
    view.onMount(container);
    expect(mockEventBus.on).toHaveBeenCalledWith('state:players:changed', expect.any(Function));
    cleanup(container);
  });

  it('unsubscribes all handlers in onUnmount', () => {
    const container = makeContainer();
    setState({ matches: [] });
    view.render(container);
    view.onMount(container);
    view.onUnmount();
    expect(mockEventBus.off).toHaveBeenCalled();
    container.remove();
  });
});

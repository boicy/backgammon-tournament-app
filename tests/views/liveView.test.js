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

import { getState, recordMatchGame } from '../../src/store/store.js';
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

  it('confirm step renders 10 pick-target buttons with 7 pre-selected', () => {
    const container = makeContainer();
    setState({
      players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
      matches: [],
    });
    view.render(container);
    view.onMount(container);

    // Open the form and advance to confirm step by clicking both players
    const toggleBtn = container.querySelector('[data-action="toggle-new-match"]');
    if (toggleBtn && !toggleBtn.disabled) toggleBtn.click();
    // Re-query after each click because refreshNewMatchForm() replaces the DOM
    container.querySelectorAll('[data-action="pick-player"]')[0]?.click(); // pick P1
    container.querySelectorAll('[data-action="pick-player"]')[0]?.click(); // pick P2 → confirm step

    const targetBtns = container.querySelectorAll('[data-action="pick-target"]');
    expect(targetBtns.length).toBe(10);

    const selected = [...targetBtns].filter((b) => b.classList.contains('pick-btn--selected'));
    expect(selected.length).toBe(1);
    expect(selected[0].dataset.targetValue).toBe('7');

    const noNumberInput = container.querySelector('input[data-start-target]');
    expect(noNumberInput).toBeNull();

    cleanup(container);
  });
});

// ---------------------------------------------------------------------------
// Phase 3 / T004 (008-record-game-ux): winner pick buttons
// ---------------------------------------------------------------------------

describe('liveView — winner pick buttons', () => {
  beforeEach(() => {
    Object.keys(busHandlers).forEach((k) => delete busHandlers[k]);
    vi.clearAllMocks();
  });

  function expandGameForm(container) {
    container.querySelector('[data-action="record-game"]').click();
    return container.querySelector('[data-game-form]');
  }

  it('expanded game form shows two pick-winner buttons, not a [data-game-winner] select', () => {
    const container = makeContainer();
    setState({
      players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
      matches: [makeMatch({ id: 'm1' })],
    });
    view.render(container);
    view.onMount(container);

    const form = expandGameForm(container);
    expect(form).not.toBeNull();

    const winnerBtns = form.querySelectorAll('[data-action="pick-winner"]');
    expect(winnerBtns.length).toBe(2);
    expect([...winnerBtns].map((b) => b.textContent)).toContain('Alice');
    expect([...winnerBtns].map((b) => b.textContent)).toContain('Bob');

    const oldSelect = form.querySelector('[data-game-winner]');
    expect(oldSelect).toBeNull();

    // result-type select and cube-value lozenge buttons still present
    expect(form.querySelector('[data-result-type]')).not.toBeNull();
    expect(form.querySelector('[data-cube-value]')).not.toBeNull();

    cleanup(container);
  });

  it('tapping a winner button highlights it and clears the other', () => {
    const container = makeContainer();
    setState({
      players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
      matches: [makeMatch({ id: 'm1' })],
    });
    view.render(container);
    view.onMount(container);
    expandGameForm(container);

    const [btnAlice, btnBob] = container.querySelectorAll('[data-action="pick-winner"]');
    btnAlice.click();
    expect(btnAlice.classList.contains('pick-btn--selected')).toBe(true);
    expect(btnBob.classList.contains('pick-btn--selected')).toBe(false);

    cleanup(container);
  });

  it('tapping the other winner button switches selection', () => {
    const container = makeContainer();
    setState({
      players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
      matches: [makeMatch({ id: 'm1' })],
    });
    view.render(container);
    view.onMount(container);
    expandGameForm(container);

    const [btnAlice, btnBob] = container.querySelectorAll('[data-action="pick-winner"]');
    btnAlice.click();
    btnBob.click();
    expect(btnBob.classList.contains('pick-btn--selected')).toBe(true);
    expect(btnAlice.classList.contains('pick-btn--selected')).toBe(false);

    cleanup(container);
  });

  it('tapping the already-selected button deselects it (toggle-off)', () => {
    const container = makeContainer();
    setState({
      players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
      matches: [makeMatch({ id: 'm1' })],
    });
    view.render(container);
    view.onMount(container);
    expandGameForm(container);

    const [btnAlice, btnBob] = container.querySelectorAll('[data-action="pick-winner"]');
    btnAlice.click(); // select
    btnAlice.click(); // deselect
    expect(btnAlice.classList.contains('pick-btn--selected')).toBe(false);
    expect(btnBob.classList.contains('pick-btn--selected')).toBe(false);

    cleanup(container);
  });

  it('submitting with no winner shows [data-game-error] and does NOT call recordMatchGame', () => {
    const container = makeContainer();
    setState({
      players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
      matches: [makeMatch({ id: 'm1' })],
    });
    view.render(container);
    view.onMount(container);
    expandGameForm(container);

    // Do NOT pick a winner — tap submit immediately
    container.querySelector('[data-action="submit-game"]').click();

    const errorEl = container.querySelector('[data-game-error]');
    expect(errorEl).not.toBeNull();
    expect(errorEl.textContent).toBeTruthy();
    expect(recordMatchGame).not.toHaveBeenCalled();

    cleanup(container);
  });
});

// ---------------------------------------------------------------------------
// 013-cube-lozenges / T002: gameFormHtml cube lozenge rendering
// ---------------------------------------------------------------------------

describe('liveView — gameFormHtml cube lozenge rendering', () => {
  const match = {
    id: 'm1',
    player1Id: 'p1',
    player2Id: 'p2',
    targetScore: 7,
    status: 'active',
    games: [],
    winnerId: null,
  };
  const players = [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
  ];

  function parseHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div;
  }

  it('renders exactly 7 [data-action="pick-cube-value"] buttons', () => {
    const html = view.gameFormHtml(match, players);
    const container = parseHtml(html);
    const buttons = container.querySelectorAll('[data-action="pick-cube-value"]');
    expect(buttons.length).toBe(7);
  });

  it('data-cube-value attributes are "1","2","4","8","16","32","64" in order', () => {
    const html = view.gameFormHtml(match, players);
    const container = parseHtml(html);
    const values = [...container.querySelectorAll('[data-action="pick-cube-value"]')].map(
      (b) => b.dataset.cubeValue
    );
    expect(values).toEqual(['1', '2', '4', '8', '16', '32', '64']);
  });

  it('button with data-cube-value="1" has pick-btn--selected class by default', () => {
    const html = view.gameFormHtml(match, players);
    const container = parseHtml(html);
    const btn1 = container.querySelector('[data-action="pick-cube-value"][data-cube-value="1"]');
    expect(btn1).not.toBeNull();
    expect(btn1.classList.contains('pick-btn--selected')).toBe(true);
    const otherBtns = [...container.querySelectorAll('[data-action="pick-cube-value"]')].filter(
      (b) => b.dataset.cubeValue !== '1'
    );
    otherBtns.forEach((b) => expect(b.classList.contains('pick-btn--selected')).toBe(false));
  });

  it('no <select data-cube-value> element exists in the rendered HTML', () => {
    const html = view.gameFormHtml(match, players);
    const container = parseHtml(html);
    expect(container.querySelector('select[data-cube-value]')).toBeNull();
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

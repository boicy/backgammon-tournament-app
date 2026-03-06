import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Router guard unit tests (updated for 004-ux-redesign)
//
// Route changes:
//   #/players → redirects to #/live
//   #/match   → redirects to #/live
//   Unguarded: /start, /club, /history
// ---------------------------------------------------------------------------

vi.mock('../src/store/store.js', () => ({
  getState: vi.fn(),
  endTournament: vi.fn(),
  resetTournament: vi.fn(),
}));

import { getState } from '../src/store/store.js';

function setupDOM() {
  document.body.innerHTML = `
    <header class="app-header">
      <nav class="app-tabs">
        <a href="#/live" class="nav-link">Live</a>
        <a href="#/leaderboard" class="nav-link">Standings</a>
      </nav>
      <div class="hamburger-menu-wrapper">
        <button id="hamburger-btn">☰</button>
        <div class="hamburger-menu" id="hamburger-menu">
          <a href="#/history">History</a>
          <a href="#/club">Club</a>
          <div id="menu-divider-tournament"></div>
          <button id="menu-end-tournament" data-action="end-tournament">End</button>
          <button id="menu-reset-tournament" data-action="reset-tournament">Reset</button>
        </div>
      </div>
    </header>
    <main id="app"></main>`;
  return document.getElementById('app');
}

describe('router guard — redirect to #/start when tournament is null', () => {
  let originalHash;

  beforeEach(() => {
    originalHash = window.location.hash;
    setupDOM();
  });

  afterEach(() => {
    vi.resetModules();
    history.replaceState(null, '', originalHash || '#/live');
  });

  it('navigates to #/start when tournament is null and path is /live', async () => {
    getState.mockReturnValue({ tournament: null });
    history.replaceState(null, '', '#/live');

    const { initRouter } = await import('../src/router.js');
    const container = setupDOM();
    initRouter(container);

    expect(window.location.hash).toBe('#/start');
  });

  it('redirects #/players to #/start when no tournament', async () => {
    getState.mockReturnValue({ tournament: null });
    history.replaceState(null, '', '#/players');

    const { initRouter } = await import('../src/router.js');
    const container = setupDOM();
    initRouter(container);

    expect(window.location.hash).toBe('#/start');
  });

  it('redirects #/match to #/start when no tournament', async () => {
    getState.mockReturnValue({ tournament: null });
    history.replaceState(null, '', '#/match');

    const { initRouter } = await import('../src/router.js');
    const container = setupDOM();
    initRouter(container);

    expect(window.location.hash).toBe('#/start');
  });

  it('does not redirect when tournament is null and path is /start', async () => {
    getState.mockReturnValue({ tournament: null });
    history.replaceState(null, '', '#/start');

    const { initRouter } = await import('../src/router.js');
    const container = setupDOM();
    initRouter(container);

    expect(window.location.hash).toBe('#/start');
  });

  it('does not redirect when tournament is null and path is /club', async () => {
    getState.mockReturnValue({ tournament: null });
    history.replaceState(null, '', '#/club');

    const { initRouter } = await import('../src/router.js');
    const container = setupDOM();
    initRouter(container);

    expect(window.location.hash).toBe('#/club');
  });

  it('does not redirect when tournament is null and path is /history', async () => {
    getState.mockReturnValue({ tournament: null });
    history.replaceState(null, '', '#/history');

    const { initRouter } = await import('../src/router.js');
    const container = setupDOM();
    initRouter(container);

    expect(window.location.hash).toBe('#/history');
  });

  it('allows navigation to /live when tournament exists', async () => {
    getState.mockReturnValue({ tournament: { id: 'x', name: 'T', date: '2026-01-01', status: 'active' } });
    history.replaceState(null, '', '#/live');

    const { initRouter } = await import('../src/router.js');
    const container = setupDOM();
    initRouter(container);

    expect(window.location.hash).toBe('#/live');
  });

  it('redirects #/players to #/live when tournament exists', async () => {
    getState.mockReturnValue({ tournament: { id: 'x', name: 'T', date: '2026-01-01', status: 'active' } });
    history.replaceState(null, '', '#/players');

    const { initRouter } = await import('../src/router.js');
    const container = setupDOM();
    initRouter(container);

    expect(window.location.hash).toBe('#/live');
  });
});

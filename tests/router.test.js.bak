import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Router guard unit tests (T008)
//
// Tests that navigate() redirects to #/start when tournament is null,
// and allows navigation to /start and /club without redirect.
// ---------------------------------------------------------------------------

// Mock the store
vi.mock('../src/store/store.js', () => ({
  getState: vi.fn(),
}));

import { getState } from '../src/store/store.js';

// Set up a minimal DOM environment (jsdom via vitest)
function setupHashAndContainer() {
  document.body.innerHTML = '<main id="app"></main><nav><a href="#/players">Players</a><a href="#/club">Club</a></nav>';
  return document.getElementById('app');
}

describe('router guard — redirect to #/start when tournament is null', () => {
  let originalHash;

  beforeEach(() => {
    originalHash = window.location.hash;
    setupHashAndContainer();
  });

  afterEach(() => {
    vi.resetModules();
    // Restore hash
    history.replaceState(null, '', originalHash || '#/players');
  });

  it('navigates to #/start when tournament is null and path is /players', async () => {
    getState.mockReturnValue({ tournament: null });

    // Set hash to players
    history.replaceState(null, '', '#/players');

    // Import router fresh
    const { initRouter } = await import('../src/router.js');
    const container = setupHashAndContainer();
    initRouter(container);

    // The router guard should redirect to #/start
    expect(window.location.hash).toBe('#/start');
  });

  it('does not redirect when tournament is null and path is /start', async () => {
    getState.mockReturnValue({ tournament: null });

    history.replaceState(null, '', '#/start');

    const { initRouter } = await import('../src/router.js');
    const container = setupHashAndContainer();
    initRouter(container);

    expect(window.location.hash).toBe('#/start');
  });

  it('does not redirect when tournament is null and path is /club', async () => {
    getState.mockReturnValue({ tournament: { id: 'x', name: 'T', date: '2026-01-01', status: 'active' } });

    history.replaceState(null, '', '#/club');

    const { initRouter } = await import('../src/router.js');
    const container = setupHashAndContainer();
    initRouter(container);

    expect(window.location.hash).toBe('#/club');
  });

  it('allows navigation to /players when tournament exists', async () => {
    getState.mockReturnValue({ tournament: { id: 'x', name: 'T', date: '2026-01-01', status: 'active' } });

    history.replaceState(null, '', '#/players');

    const { initRouter } = await import('../src/router.js');
    const container = setupHashAndContainer();
    initRouter(container);

    // Should stay on #/players (not redirect)
    expect(window.location.hash).toBe('#/players');
  });
});

// Hash-based router.
// Route format: #/players | #/record | #/leaderboard | #/history | #/start | #/club

import { getState } from './store/store.js';

const ROUTES = {
  '/start': () => import('./views/namePrompt.js'),
  '/players': () => import('./views/playerRegistration.js'),
  '/record': () => import('./views/recordGame.js'),
  '/leaderboard': () => import('./views/leaderboard.js'),
  '/history': () => import('./views/gameHistory.js'),
  '/club': () => import('./views/club.js'),
};

// Routes accessible even without an active tournament
const UNGUARDED_ROUTES = new Set(['/start', '/club']);

let container = null;
let currentView = null;

function getPath() {
  const hash = window.location.hash;
  if (!hash || hash === '#') return null; // No path specified — caller will decide default
  // Strip leading '#'
  return hash.startsWith('#') ? hash.slice(1) : hash;
}

function updateNavHighlight(path) {
  document.querySelectorAll('nav a').forEach((link) => {
    const href = link.getAttribute('href');
    const linkPath = href && href.startsWith('#') ? href.slice(1) : href;
    link.classList.toggle('active', linkPath === path);
  });
}

async function navigate() {
  let path = getPath();

  // If no hash in URL, determine default based on tournament state
  if (path === null) {
    path = getState().tournament !== null ? '/players' : '/start';
    history.replaceState(null, '', `#${path}`);
  }

  // Router guard: if no active tournament, redirect to #/start
  // (except /start and /club which are valid without a tournament)
  if (!UNGUARDED_ROUTES.has(path) && getState().tournament === null) {
    history.replaceState(null, '', '#/start');
    path = '/start';
  }

  // Unmount the current view before navigating away
  if (currentView && typeof currentView.onUnmount === 'function') {
    currentView.onUnmount();
    currentView = null;
  }
  // Clear stale DOM immediately so assertions don't see old content
  container.innerHTML = '';

  const loader = ROUTES[path] || ROUTES['/start'];
  try {
    const view = await loader();
    currentView = view;
    view.render(container);
    if (typeof view.onMount === 'function') {
      view.onMount(container);
    }
    updateNavHighlight(path);
  } catch (err) {
    container.innerHTML = `<p class="error">Failed to load view: ${path}</p>`;
    console.error(err);
  }
}

export function initRouter(appContainer) {
  container = appContainer;

  window.addEventListener('hashchange', navigate);

  navigate();
}

// Hash-based router.
// Route format: #/players | #/record | #/leaderboard | #/history

const ROUTES = {
  '/players': () => import('./views/playerRegistration.js'),
  '/record': () => import('./views/recordGame.js'),
  '/leaderboard': () => import('./views/leaderboard.js'),
  '/history': () => import('./views/gameHistory.js'),
};

const DEFAULT_ROUTE = '#/players';

let container = null;
let currentView = null;

function getPath() {
  const hash = window.location.hash || DEFAULT_ROUTE;
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
  const path = getPath();

  // Unmount the current view before navigating away
  if (currentView && typeof currentView.onUnmount === 'function') {
    currentView.onUnmount();
    currentView = null;
  }

  const loader = ROUTES[path] || ROUTES[DEFAULT_ROUTE.slice(1)];
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

  // Silently fix up URL if there's no hash, then navigate normally
  if (!window.location.hash || window.location.hash === '#') {
    history.replaceState(null, '', DEFAULT_ROUTE);
  }

  navigate();
}

// Hash-based router.
// Route format: #/live | #/leaderboard | #/history | #/start | #/club
// Legacy redirects: #/players → #/live, #/match → #/live

import { getState, endTournament, resetTournament } from './store/store.js';

const ROUTES = {
  '/start':       () => import('./views/namePrompt.js'),
  '/live':        () => import('./views/liveView.js'),
  '/leaderboard': () => import('./views/leaderboard.js'),
  '/history':     () => import('./views/gameHistory.js'),
  '/club':        () => import('./views/club.js'),
};

// Routes accessible even without an active tournament
const UNGUARDED_ROUTES = new Set(['/start', '/club', '/history']);

let container = null;
let currentView = null;

function getPath() {
  const hash = window.location.hash;
  if (!hash || hash === '#') return null;
  return hash.startsWith('#') ? hash.slice(1) : hash;
}

function updateNavHighlight(path) {
  document.querySelectorAll('.app-tabs .nav-link').forEach((link) => {
    const href = link.getAttribute('href');
    const linkPath = href && href.startsWith('#') ? href.slice(1) : href;
    link.classList.toggle('active', linkPath === path);
  });
}

function updateTournamentState() {
  const hasTournament = getState().tournament !== null;
  document.body.dataset.hasTournament = hasTournament ? 'true' : 'false';

  // Show/hide tournament-only menu items
  const divider      = document.getElementById('menu-divider-tournament');
  const endBtn       = document.getElementById('menu-end-tournament');
  const resetBtn     = document.getElementById('menu-reset-tournament');
  const liveLink     = document.getElementById('menu-live');
  const standingsLink = document.getElementById('menu-standings');
  const primaryDiv   = document.getElementById('menu-divider-primary');
  if (divider)       divider.hidden      = !hasTournament;
  if (endBtn)        endBtn.hidden       = !hasTournament;
  if (resetBtn)      resetBtn.hidden     = !hasTournament;
  if (liveLink)      liveLink.hidden     = !hasTournament;
  if (standingsLink) standingsLink.hidden = !hasTournament;
  if (primaryDiv)    primaryDiv.hidden   = !hasTournament;
}

// ---------------------------------------------------------------------------
// Hamburger menu (implemented here per T014)
// ---------------------------------------------------------------------------

let _menuOutsideHandler = null;

function openMenu() {
  const menu = document.getElementById('hamburger-menu');
  const btn  = document.getElementById('hamburger-btn');
  if (!menu) return;
  menu.classList.add('open');
  if (btn) btn.setAttribute('aria-expanded', 'true');

  // Close on outside click
  setTimeout(() => {
    _menuOutsideHandler = (e) => {
      const wrapper = document.querySelector('.hamburger-menu-wrapper');
      if (wrapper && !wrapper.contains(e.target)) closeMenu();
    };
    document.addEventListener('click', _menuOutsideHandler);
  }, 0);
}

function closeMenu() {
  const menu = document.getElementById('hamburger-menu');
  const btn  = document.getElementById('hamburger-btn');
  if (!menu) return;
  menu.classList.remove('open');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  if (_menuOutsideHandler) {
    document.removeEventListener('click', _menuOutsideHandler);
    _menuOutsideHandler = null;
  }
}

function initHamburgerMenu() {
  const btn = document.getElementById('hamburger-btn');
  if (!btn) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = document.getElementById('hamburger-menu');
    if (menu && menu.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Close menu when a nav link inside it is clicked
  const menu = document.getElementById('hamburger-menu');
  if (menu) {
    menu.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;

      if (action === 'end-tournament') {
        closeMenu();
        if (window.confirm('End this tournament and save it to the archive?')) {
          endTournament();
          window.location.hash = '#/start';
        }
        return;
      }

      if (action === 'reset-tournament') {
        closeMenu();
        if (window.confirm('Reset the tournament? All data will be deleted.')) {
          resetTournament();
          window.location.hash = '#/start';
        }
        return;
      }

      // Regular nav links — close on click
      if (e.target.closest('a')) {
        closeMenu();
      }
    });
  }

  // Close menu when a primary tab is clicked
  document.querySelectorAll('.app-tabs .nav-link').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

async function navigate() {
  let path = getPath();

  // Legacy and redirect handling
  if (path === '/players') {
    history.replaceState(null, '', '#/live');
    path = '/live';
  }
  if (path === '/match' || path === '/record') {
    history.replaceState(null, '', '#/live');
    path = '/live';
  }

  // Default path when no hash
  if (path === null) {
    path = getState().tournament !== null ? '/live' : '/start';
    history.replaceState(null, '', `#${path}`);
  }

  // Guard: no active tournament → redirect to /start
  if (!UNGUARDED_ROUTES.has(path) && getState().tournament === null) {
    history.replaceState(null, '', '#/start');
    path = '/start';
  }

  // Close hamburger menu on any navigation
  closeMenu();

  // Unmount current view
  if (currentView && typeof currentView.onUnmount === 'function') {
    currentView.onUnmount();
    currentView = null;
  }
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
    updateTournamentState();
  } catch (err) {
    container.innerHTML = `<p class="error">Failed to load view: ${path}</p>`;
    console.error(err);
  }
}

export function initRouter(appContainer) {
  container = appContainer;
  initHamburgerMenu();
  window.addEventListener('hashchange', navigate);
  navigate();
}

// Exported so views can call it after End/Reset Tournament actions
export { updateTournamentState };

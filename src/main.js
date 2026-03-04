import { loadFromStorage } from './store/store.js';
import { initRouter } from './router.js';

// Check localStorage availability and warn the user if unavailable
function checkStorage() {
  try {
    const probe = '__backgammon_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch (_err) {
    return false;
  }
}

function showStorageWarning() {
  const banner = document.createElement('div');
  banner.className = 'storage-warning';
  banner.setAttribute('role', 'alert');
  banner.textContent =
    'Storage unavailable — data will not persist across page refreshes. ' +
    'Check your browser privacy settings.';
  document.body.insertBefore(banner, document.body.firstChild);
}

document.addEventListener('DOMContentLoaded', () => {
  if (!checkStorage()) {
    showStorageWarning();
  } else {
    loadFromStorage();
  }

  const app = document.getElementById('app');
  initRouter(app);
});

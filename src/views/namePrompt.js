import { initTournament } from '../store/store.js';
import { eventBus } from '../store/eventBus.js';
import { escapeHtml } from '../utils.js';

let _container = null;
let _resetHandler = null;

export function render(container) {
  container.innerHTML = `
    <section class="view view--start" aria-label="Name this tournament">
      <div class="name-prompt">
        <h2>Name this tournament</h2>
        <form id="name-prompt-form" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label for="tournament-name-input" class="visually-hidden">Tournament name</label>
              <input
                type="text"
                id="tournament-name-input"
                class="input"
                placeholder="e.g. April Club Night"
                maxlength="100"
                autocomplete="off"
                aria-label="Tournament name"
              />
            </div>
            <button type="submit" class="btn btn-primary" aria-label="Start tournament">
              Start
            </button>
          </div>
          <div id="name-error" class="error-message" data-error role="alert" aria-live="polite"></div>
        </form>
      </div>
    </section>
  `;
}

export function onMount(container) {
  _container = container;

  const form = container.querySelector('#name-prompt-form');
  if (form) {
    form.addEventListener('submit', _handleSubmit);
  }

  _resetHandler = () => render(container);
  eventBus.on('state:reset', _resetHandler);
}

function _handleSubmit(e) {
  e.preventDefault();
  const input = _container.querySelector('#tournament-name-input');
  const name = (input?.value ?? '').trim();

  const errorEl = _container.querySelector('[data-error]');
  if (errorEl) {
    errorEl.textContent = '';
  }

  if (!name) {
    if (errorEl) {
      errorEl.textContent = 'Please enter a tournament name.';
    }
    return;
  }

  try {
    initTournament(name);
    window.location.hash = '#/players';
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = escapeHtml(err.message);
    }
  }
}

export function onUnmount() {
  if (_container) {
    const form = _container.querySelector('#name-prompt-form');
    if (form) form.removeEventListener('submit', _handleSubmit);
    _container = null;
  }
  if (_resetHandler) {
    eventBus.off('state:reset', _resetHandler);
    _resetHandler = null;
  }
}

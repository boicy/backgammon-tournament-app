import { initTournament } from '../store/store.js';

let _container = null;
let _startHandler = null;

export function render(container) {
  container.innerHTML = `
    <section class="view view--start" aria-label="Start a new tournament">
      <div class="name-prompt">
        <h2>Ready to play?</h2>
        <button id="start-tournament-btn" class="btn btn-primary btn-full" aria-label="Start tournament">
          Start Tournament
        </button>
      </div>
    </section>
  `;
}

export function onMount(container) {
  _container = container;
  _startHandler = () => {
    initTournament();
    window.location.hash = '#/live';
  };
  const btn = container.querySelector('#start-tournament-btn');
  if (btn) btn.addEventListener('click', _startHandler);
}

export function onUnmount() {
  if (_container) {
    const btn = _container.querySelector('#start-tournament-btn');
    if (btn && _startHandler) btn.removeEventListener('click', _startHandler);
    _container = null;
  }
  _startHandler = null;
}

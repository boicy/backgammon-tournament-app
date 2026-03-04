const _bus = document.createComment('backgammon-event-bus');

export const eventBus = {
  on(event, handler) {
    _bus.addEventListener(event, handler);
  },
  off(event, handler) {
    _bus.removeEventListener(event, handler);
  },
  emit(event, detail = {}) {
    _bus.dispatchEvent(new CustomEvent(event, { detail }));
  },
};

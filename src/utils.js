export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generateId() {
  return crypto.randomUUID();
}

export function formatTimestamp(epochMs) {
  return new Date(epochMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function generateTournamentName(date = new Date()) {
  const HH = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const dddd = date.toLocaleDateString('en-US', { weekday: 'long' });
  const MMM = date.toLocaleDateString('en-US', { month: 'short' });
  const d = date.getDate();
  const yyyy = date.getFullYear();
  return `${HH}:${mm}. ${dddd}, ${MMM} ${d}, ${yyyy}`;
}

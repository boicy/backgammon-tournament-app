import { getState } from '../store/store.js';
import { eventBus } from '../store/eventBus.js';
import { deriveAllTimeStandings } from '../models/allTimeStanding.js';
import { escapeHtml } from '../utils.js';

// ---------------------------------------------------------------------------
// Module-level state for inline detail pattern (no new route)
// ---------------------------------------------------------------------------

let _selectedSnapshotId = null;
let _container = null;
let _archiveChangedHandler = null;
let _resetHandler = null;
let _standingsChangedHandler = null;

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

function formatDate(isoString) {
  try {
    return new Date(isoString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return isoString;
  }
}

function allTimeTableHtml(archive, tournament, players, games) {
  const standings = deriveAllTimeStandings(archive, tournament, players, games);

  if (standings.length === 0) {
    return `<p class="club-note">No players yet.</p>`;
  }

  const hasArchive = archive.length > 0;
  const noteHtml = !hasArchive
    ? `<p class="club-note" style="margin-bottom:var(--space-md)">Complete your first tournament to start tracking wins.</p>`
    : '';

  const rows = standings.map((s) => `
    <tr class="${s.rank === 1 ? 'rank-1' : ''}">
      <td class="rank-cell">${s.rank}</td>
      <td>${escapeHtml(s.name)}</td>
      <td class="wins-cell">${s.tournamentWins}</td>
      <td>${s.cumulativePoints}</td>
      <td>${s.tournamentsPlayed}</td>
    </tr>`).join('');

  return `
    ${noteHtml}
    <div class="leaderboard-wrapper">
      <table class="all-time-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Wins</th>
            <th>Pts</th>
            <th>Played</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function archiveListHtml(archive) {
  if (archive.length === 0) {
    return `<p class="club-note" data-testid="archive-empty">No past tournaments yet. End a tournament to see it here.</p>`;
  }

  // Reverse-chronological (newest first)
  const sorted = [...archive].sort((a, b) => b.archivedAt - a.archivedAt);
  const items = sorted.map((snap) => `
    <li class="archive-item" data-action="open-snapshot" data-snapshot-id="${escapeHtml(snap.id)}"
        role="button" tabindex="0" aria-label="View ${escapeHtml(snap.name)}">
      <span class="archive-item-name">${escapeHtml(snap.name)}</span>
      <span class="archive-item-meta">
        <span>${formatDate(snap.date)}</span>
        <span class="archive-item-games">${snap.gameCount} game${snap.gameCount !== 1 ? 's' : ''}</span>
      </span>
    </li>`).join('');

  return `<ul class="archive-list">${items}</ul>`;
}

function snapshotDetailHtml(snapshot) {
  const standingsRows = snapshot.finalStandings.map((s) => `
    <tr class="${s.rank === 1 ? 'rank-1' : ''}">
      <td class="rank-cell">${s.rank}</td>
      <td>${escapeHtml(s.name)}</td>
      <td>${s.matchPoints}</td>
      <td>${s.wins}</td>
      <td>${s.losses}</td>
    </tr>`).join('');

  const gamesHtml = snapshot.games.length === 0
    ? '<p class="club-note">No games recorded.</p>'
    : `<ul class="detail-games-list">
      ${snapshot.games.map((g) => {
        const winner = snapshot.players.find((p) => p.id === g.winnerId);
        const loserId = g.player1Id === g.winnerId ? g.player2Id : g.player1Id;
        const loser = snapshot.players.find((p) => p.id === loserId);
        return `<li class="detail-game-item">
          <span class="detail-game-winner">${escapeHtml(winner?.name ?? '?')}</span>
          beat ${escapeHtml(loser?.name ?? '?')}
          — ${escapeHtml(g.resultType)} × ${g.cubeValue} = <strong>${g.matchPoints} pts</strong>
        </li>`;
      }).join('')}
    </ul>`;

  return `
    <div class="tournament-detail">
      <div class="tournament-detail-header">
        <button class="btn btn-sm" data-action="back-to-list" aria-label="Back to archive list">← Back</button>
        <span class="tournament-detail-title">${escapeHtml(snapshot.name)}</span>
        <span class="tournament-detail-meta">${formatDate(snapshot.date)} · ${snapshot.gameCount} game${snapshot.gameCount !== 1 ? 's' : ''}</span>
      </div>

      <div>
        <p class="section-heading">Final Standings</p>
        <div class="leaderboard-wrapper">
          <table class="leaderboard-table">
            <thead>
              <tr>
                <th>#</th><th>Player</th><th>Pts</th><th>W</th><th>L</th>
              </tr>
            </thead>
            <tbody>${standingsRows}</tbody>
          </table>
        </div>
      </div>

      <div>
        <p class="section-heading">Game History</p>
        ${gamesHtml}
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export function render(container) {
  const { archive, tournament, players, games } = getState();

  if (_selectedSnapshotId) {
    const snapshot = archive.find((s) => s.id === _selectedSnapshotId);
    if (snapshot) {
      container.innerHTML = `
        <section class="view view--club" aria-label="Tournament Detail">
          ${snapshotDetailHtml(snapshot)}
        </section>`;
      return;
    }
    // Snapshot not found (e.g., cleared) — fall through to list
    _selectedSnapshotId = null;
  }

  container.innerHTML = `
    <section class="view view--club" aria-label="Club">
      <div class="club-section">
        <div>
          <h2>All-Time Standings</h2>
          <div class="all-time-section" data-testid="all-time-section">
            ${allTimeTableHtml(archive, tournament, players, games)}
          </div>
        </div>

        <div>
          <h2>Past Tournaments</h2>
          ${archiveListHtml(archive)}
        </div>
      </div>
    </section>`;
}

export function onMount(container) {
  _container = container;

  container.addEventListener('click', _handleClick);
  container.addEventListener('keydown', _handleKeydown);

  _archiveChangedHandler = () => {
    _selectedSnapshotId = null;
    render(container);
  };
  _resetHandler = () => {
    _selectedSnapshotId = null;
    render(container);
  };
  _standingsChangedHandler = () => {
    // Re-render All-Time section in place if we're in list mode
    if (!_selectedSnapshotId) {
      const allTimeSection = container.querySelector('.all-time-section');
      if (allTimeSection) {
        const { archive, tournament, players, games } = getState();
        allTimeSection.innerHTML = allTimeTableHtml(archive, tournament, players, games);
      }
    }
  };

  eventBus.on('state:archive:changed', _archiveChangedHandler);
  eventBus.on('state:reset', _resetHandler);
  eventBus.on('state:standings:changed', _standingsChangedHandler);
}

function _handleClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;

  if (action === 'open-snapshot') {
    _selectedSnapshotId = target.dataset.snapshotId;
    render(_container);
  }

  if (action === 'back-to-list') {
    _selectedSnapshotId = null;
    render(_container);
  }
}

function _handleKeydown(e) {
  if (e.key === 'Enter' || e.key === ' ') {
    const target = e.target.closest('[data-action="open-snapshot"]');
    if (target) {
      e.preventDefault();
      _selectedSnapshotId = target.dataset.snapshotId;
      render(_container);
    }
  }
}

export function onUnmount() {
  if (_container) {
    _container.removeEventListener('click', _handleClick);
    _container.removeEventListener('keydown', _handleKeydown);
    _container = null;
  }
  if (_archiveChangedHandler) {
    eventBus.off('state:archive:changed', _archiveChangedHandler);
    _archiveChangedHandler = null;
  }
  if (_resetHandler) {
    eventBus.off('state:reset', _resetHandler);
    _resetHandler = null;
  }
  if (_standingsChangedHandler) {
    eventBus.off('state:standings:changed', _standingsChangedHandler);
    _standingsChangedHandler = null;
  }
}

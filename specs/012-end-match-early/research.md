# Research: 012-end-match-early

## Decision 1: Match Status Strategy for Early-Ended Matches

**Decision**: Reuse `status: 'complete'` for early-ended matches with games recorded; add a boolean `endedEarly: true` flag. Early-ended matches with zero games reuse existing `abandonMatch()` behavior (`status: 'abandoned'`).

**Rationale**: `matchStanding.js` already filters by `status === 'complete'` — reusing this status means standings work with zero changes to the standings derivation path. The `endedEarly` flag is the only addition needed to distinguish history display (FR-004) without touching data pipeline logic.

**Alternatives considered**:
- New status `'ended-early'`: Would require updating every place that checks for `'complete'` (standings, history, liveView completed zone filter). More invasive.
- Overloading `'abandoned'` for all early-ends: Loses game data and earned points from standings — violates FR-005.

---

## Decision 2: Winner Determination for Early-Ended Matches

**Decision**: `earlyMatchWinner(match)` — new model function that returns the playerId of the player with more accumulated match points, or `null` if scores are tied (including zero games).

**Rationale**: Mirrors the existing `matchWinner()` function shape. Null winner on a tie is consistent with FR-008 (no winner declared on tied score).

**Latent bug found**: `matchStanding.js` counts losses as "player in match AND `winnerId !== player.id`." For `winnerId === null` (tied early-end), this incorrectly assigns a loss to both players. Fix: add `m.winnerId !== null` guard to the loss filter. This is a correctness fix bundled with this feature.

**Alternatives considered**:
- Forcing a tiebreaker (last-game-winner): Rejected by user (clarification Q2, answer B).
- Counting tied matches as a loss for both: Unfair, incorrect per spec FR-008.

---

## Decision 3: UI Entry Point — Single "End Match" Action

**Decision**: Replace the current `open-overflow` → `window.confirm('Abandon this match?')` path with a smarter handler: check game count, show an adapted confirmation message, and call a new `endMatchEarly(matchId)` store action. The overflow button label and trigger remain identical (`data-action="open-overflow"`).

**Rationale**: Keeps the UI surface unchanged (single ⋯ overflow button). The store action handles the two-path logic (games vs no-games) internally. Clarification Q3 confirmed a single action with adaptive confirmation.

**Alternatives considered**:
- Two separate overflow menu items: More UI complexity, rejected in Q3.
- Inline confirm UI (non-`window.confirm`): Deferred — no constitution requirement for custom confirm dialogs; `window.confirm` matches existing pattern.

---

## Decision 4: Overflow Confirmation Message

**Decision**:
- 1+ games: `"End match early? [P1] [X] – [Y] [P2]. [Leader] will be declared winner."` (or `"Scores are tied. No winner will be declared."` if tied)
- 0 games: `"No games recorded. Abandon this match? No scores will be saved."`

**Rationale**: User must understand the consequence before confirming (FR-006). Adapting the message satisfies the spec's adaptive confirmation requirement without a custom modal.

---

## No External Unknowns

This feature is entirely internal — no new dependencies, no APIs, no localStorage key changes. All state is derived from the existing `matches` array with the addition of the `endedEarly` boolean field.

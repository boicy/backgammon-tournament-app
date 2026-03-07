# Data Model: Concurrent Match Participation

**Feature**: 010-concurrent-matches
**Date**: 2026-03-07

## Summary

No new entities, no new `localStorage` keys, and no new fields on existing entities.
This feature is a constraint relaxation — the only data-model change is to the uniqueness rule governing active matches.

---

## Entities (unchanged structure)

### Match

| Field | Type | Notes |
|-------|------|-------|
| `id` | string (UUID) | Immutable |
| `player1Id` | string (UUID) | References Player |
| `player2Id` | string (UUID) | References Player |
| `targetScore` | integer ≥ 1 | |
| `status` | `'active'` \| `'complete'` \| `'abandoned'` | |
| `games` | Game[] | Append-only |
| `winnerId` | string \| null | Set on completion |
| `completedAt` | number \| null | `Date.now()` on completion |

### Player

| Field | Type | Notes |
|-------|------|-------|
| `id` | string (UUID) | Immutable |
| `name` | string | Unique within tournament (case-insensitive) |

---

## Uniqueness Constraint Change

### Before (FR-012, removed)

> A player may not appear in more than one active match at a time.

### After (FR-004, new)

> No two active matches may share the same player pair (order-independent).
> Formally: for any two active matches M1 and M2, it must NOT be the case that
> `{M1.player1Id, M1.player2Id} == {M2.player1Id, M2.player2Id}`.

A single player may now appear in multiple simultaneous active matches, provided each match is against a distinct opponent.

---

## Derived State

### Active match count per player (view-only)

Computed on demand in `liveView.js` from the `matches` array for the player picker badge:

```
activeCount(playerId) = matches.filter(m => m.status === 'active' &&
  (m.player1Id === playerId || m.player2Id === playerId)).length
```

This value is never stored — it is derived fresh each time the picker renders.

---

## localStorage Keys (unchanged)

| Key | Contents |
|-----|----------|
| `backgammon:tournament` | Current tournament metadata |
| `backgammon:players` | Player array for current tournament |
| `backgammon:matches` | Match array (includes all active, complete, abandoned) |
| `backgammon:archive` | Snapshots of ended tournaments |
| `backgammon:roster` | All-time player name suggestions |

# Store API Contract: 004-ux-redesign

**Date**: 2026-03-06

## Overview

The store API is **completely unchanged** for this feature. This document references the existing API surface that the new `liveView.js` will consume — the same functions and events used by the current `matchHub.js` and `matchDetail.js`.

## Actions (imported from `src/store/store.js`)

| Action | Signature | Used By |
|--------|-----------|---------|
| `getState()` | `() → State` | All views |
| `addPlayer(name)` | `(string) → void` | liveView (player management) |
| `removePlayer(id)` | `(string) → void` | liveView (player roster) |
| `startMatch(p1Id, p2Id, target)` | `(string, string, number) → void` | liveView (new match form) |
| `selectMatch(id)` | `(string) → void` | Not needed (no match detail page) |
| `abandonMatch(id)` | `(string) → void` | liveView (card overflow menu) |
| `recordMatchGame(matchId, opts)` | `(string, {winnerId, resultType, cubeValue}) → void` | liveView (inline game form) |
| `endTournament()` | `() → void` | Hamburger menu |
| `resetTournament()` | `() → void` | Hamburger menu |

**Note**: `selectMatch` is no longer needed since the Match Detail page is removed. The `selectedMatchId` store field becomes unused but can remain for backward compatibility.

## Events (from `src/store/eventBus.js`)

| Event | Fires When | Subscribed By |
|-------|------------|---------------|
| `state:players:changed` | Player added/removed | liveView (header count, roster) |
| `state:matches:changed` | Match started/game recorded/match complete/abandoned | liveView (match cards), leaderboard (Live column) |
| `state:standings:changed` | Match completed | leaderboard (Wins/Points columns) |
| `state:schedule:changed` | Round-robin toggled | Not used (schedule deprioritized) |
| `state:reset` | Tournament reset/re-initialized | All views |

## View Contract

Every view continues to export the same three functions:
- `render(container)` — initial HTML render
- `onMount(container)` — attach event listeners, subscribe to events
- `onUnmount()` — remove event listeners, unsubscribe from events

# Design: Add Live & Standings to Hamburger Menu

**Date:** 2026-03-06
**Branch:** 004-ux-redesign

## Problem

History and Club are only reachable via the hamburger menu. Once on those views, the hamburger menu has no links back to Live or Standings — leaving users stranded during a tournament.

## Solution

Add "Live" and "Standings" nav links at the top of the hamburger menu dropdown, separated from the existing History/Club links by a divider.

## Menu Structure (after)

```
Live          ← new (href="#/live")
Standings     ← new (href="#/leaderboard")
──────────────
History
Club
──────────────  (tournament only)
End Tournament
Reset Tournament
```

## Implementation

**File:** `index.html`

Add two `<a class="menu-item">` links and a `<div class="hamburger-menu-divider">` at the top of `#hamburger-menu`, before the existing History link.

No CSS changes needed — `.menu-item` styling already applies.
No JS changes needed — `closeMenu()` fires on any `<a>` click inside the menu (existing behaviour).
No router changes needed — guard already redirects to `/start` if no tournament is active.

## Scope

- 1 file changed: `index.html` (~5 lines added)
- No new tests required (pure HTML structure change, existing e2e nav tests unaffected)

# 004 — UX Redesign: Scoreboard-Style Tournament Director Interface

## Problem

The app has accumulated features across three development phases (001–003) resulting in a confused UI: 4 competing nav tabs, a Match Hub that combines player management + active matches + completed matches + match creation + danger zone into one scrolling page, a separate Match Detail page that breaks the director's flow, and a dark-gold ornamental visual style that feels dated. The primary user — a tournament director managing 2–3 simultaneous matches on their phone — needs at-a-glance match scores and fast game recording, not a feature showcase.

## Target User

A single tournament director running a backgammon club night on a phone or tablet. They add players at the start, start matches, then spend the rest of the night recording game results and checking standings. They're moving between tables, so the UI must be scannable from a distance and operable in 1–2 taps.

## Design Direction

"Scoreboard" — bold, sport-broadcast aesthetic. Dark background, high-contrast scores, electric amber accent. Optimized for the tournament director's two primary tasks: monitoring active matches and recording game results.

## Navigation & Information Architecture

### During a tournament night — 2 primary tabs:
- **Live** — active matches, player management, match creation (replaces the current "Tonight / Match Hub")
- **Standings** — leaderboard table with live match indicators

### Behind a ☰ hamburger menu (top-right of header):
- History
- Club
- Divider
- End Tournament (with confirmation dialog)
- Reset Tournament (with confirmation dialog)

### When no tournament is active:
- Main area shows centered "Start Tournament" card (name input + Start button)
- Nav shows only ☰ menu (History + Club accessible)
- No Live/Standings tabs (nothing to show)

## Live View

The Live view has three collapsible zones, top to bottom.

### Zone 1: Tournament Header (always visible, compact)
Single line: tournament name + player count + "＋" add-player button.
Example: `March Club Night · 4 players [＋]`

- Tapping "＋" expands an inline player name input with Add button; collapses after adding
- Tapping the "N players" text expands a roster list with Remove buttons; collapses when tapped again
- Collapsed by default — player setup happens early, shouldn't take permanent space

### Zone 2: Active Match Cards (the hero — dominates the view)
Each active match is a large card:

- Player names displayed large, left/right aligned (like a scoreboard)
- Score is the dominant element: ~3rem monospace, amber accent color, centered
- Target score shown smaller beneath ("of 7")
- Single primary CTA: **Record Game** button
- Tapping "Record Game" expands an inline form within the card showing: winner selector, result type selector (Standard/Gammon/Backgammon), cube value selector, and a Submit button
- After recording, the form collapses, score updates with a brief pulse animation
- "⋯" overflow menu on each card provides access to Abandon Match (with confirmation)
- No separate Match Detail page — all game recording happens inline on the card
- 2–3 cards should be visible without scrolling on a phone screen

### Zone 3: New Match + Completed
- **＋ New Match** button: tapping expands inline form with Player 1, Player 2, and Target selectors; collapses after starting
- **Completed matches**: shown below in a muted section — small cards with final score, winner name, green accent bar. Not prominent.

### Key UX change
The separate `#/match` route and `matchDetail.js` view are removed. Game recording happens in-place on match cards in the Live view. This eliminates the back-and-forth navigation that breaks the tournament director's flow.

## Standings View

Full-width table, restyled to match the new design system.

Columns: **#**, **Player**, **W** (match wins), **Pts** (total match points), **Live** (active match indicator)

The "Live" column shows current match info for players in active matches:
- Example: "vs Bob 1–2"
- Clears when match completes
- Solves the "all zeros" problem — standings have life even before any match finishes

Top row (rank 1) gets a subtle amber background tint. Scores in monospace, right-aligned.

Round-robin schedule panel is removed from this view (move behind ☰ menu if kept at all).

## Visual Design System

### Palette
- Base: `#0f0f0f` background, `#1a1a1a` card surfaces, `#252525` elevated elements
- Accent: Electric amber `#f5a623` — scores, active states, primary buttons
- Secondary accent: Cool blue `#4a9eff` — "in progress" indicators (sparingly)
- Text: `#f0f0f0` primary, `#888888` muted, `#444444` dim
- Success: `#34d399` (match complete)
- Danger: `#ef4444` (only in menu for End/Reset)
- Borders: `#2a2a2a` subtle — prefer surface color shifts over visible borders

### Typography
- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Scores: `'SF Mono', 'Cascadia Code', 'Consolas', monospace` at 2.5–3rem, bold, accent color
- Section labels: System sans, 600 weight, uppercase with letter-spacing
- Body: System sans, 400/500, 0.875–1rem
- No serif or display fonts

### Cards
- 8px border-radius
- No visible borders on active match cards — surface color + subtle box-shadow (`0 1px 3px rgba(0,0,0,0.4)`)
- Active match cards: faint 2px left-edge amber bar
- Completed match cards: 2px left-edge green bar, lower opacity

### Buttons
- Primary (Record Game, Start Match): Amber background, dark text, 44px min-height
- Secondary (＋ New Match, ＋ Player): Ghost style — transparent bg, amber border, amber text
- Destructive: Only in overflow/menu, red text, no border

### Motion
- Card expand/collapse: 200ms ease-out height transition
- Score update: brief pulse on changed number
- View transitions: 150ms fade

## What Changes vs What Stays

### Changes (CSS + HTML/JS):
- Complete new color palette, typography, and spacing tokens in `styles.css`
- Nav restructure: 4 tabs → 2 tabs + hamburger menu
- `matchHub.js` → rewritten as `liveView.js` with collapsible zones and inline game recording
- `matchDetail.js` → removed (functionality absorbed into live view match cards)
- Router: remove `#/match` route, rename `#/players` to `#/live`
- Leaderboard: add "Live" column showing active match scores
- `namePrompt.js`: restyle to match new design system
- Danger zone (End/Reset Tournament): moves from Match Hub into ☰ menu
- `gameHistory.js`, `club.js`: restyle only, no structural changes

### Stays the same:
- All model files (`match.js`, `game.js`, `player.js`, `standing.js`, `matchStanding.js`, `tournament.js`, `tournamentSnapshot.js`, `allTimeStanding.js`, `roundRobin.js`)
- `store/store.js` and `store/eventBus.js` — all actions and state management unchanged
- localStorage keys and data format (no migration needed)
- All business logic and validation rules
- Hash-based routing architecture (fewer routes, same mechanism)

### Removed:
- `#/match` route and `src/views/matchDetail.js`
- Cinzel display font and ornamental CSS (gold glows, serif headings, accent borders)
- Danger zone from main view

### Test impact:
- Unit tests (models, store): no changes expected
- E2e tests: will need updates for new selectors, removed Match Detail route, new nav structure. Same acceptance criteria, different DOM structure.

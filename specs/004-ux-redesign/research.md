# Research: 004-ux-redesign

**Date**: 2026-03-06

## Overview

This feature is a view/CSS-only redesign. No new technologies, data formats, or external dependencies are introduced. All technical context is established from phases 001–003. Research focuses on best practices for the interaction patterns being introduced.

## R1: Inline Expand/Collapse Cards (no page navigation)

**Decision**: Use CSS `max-height` transition with `overflow: hidden` for card expand/collapse, controlled by a data attribute (`data-expanded="true"`) toggled via JavaScript.

**Rationale**: Pure CSS transitions on `max-height` are the simplest approach that works without frameworks. The `height: auto` problem (CSS can't transition to `auto`) is solved by setting `max-height` to a generous fixed value (e.g., 500px) — the card content will never exceed this. The 200ms ease-out timing matches the spec's motion requirement.

**Alternatives considered**:
- `Element.animate()` Web Animations API — more precise but adds JS complexity for minimal visual benefit.
- No animation (instant show/hide) — functional but feels jarring; doesn't meet FR-023.

## R2: Hamburger Menu Pattern

**Decision**: Use a simple dropdown positioned absolutely below the ☰ button, rendered in the DOM and toggled via a `hidden` attribute or CSS class. Close on click outside (document-level click listener).

**Rationale**: A slide-in panel from the side requires transform animations and more complex positioning. A simple dropdown is sufficient for 4–5 menu items and aligns with the "simplicity first" constitution principle.

**Alternatives considered**:
- Slide-in panel from right — more "app-like" but unnecessary complexity for 5 items.
- Native `<dialog>` element — good for modals but awkward for dropdown menus; positioning is harder.
- `<details>/<summary>` — semantic but styling is inconsistent across browsers and doesn't support click-outside-to-close natively.

## R3: Score Pulse Animation

**Decision**: Use a CSS `@keyframes` animation (`pulse`) applied via a temporary class (`score-updated`) that is added on score change and removed after the animation completes (via `animationend` event).

**Rationale**: A brief scale+opacity pulse (e.g., scale 1→1.15→1, opacity 1→0.7→1 over 300ms) draws attention to the changed score without being distracting. CSS-only approach — no JS animation library needed.

**Alternatives considered**:
- `Element.animate()` — works but adds JS complexity.
- Color flash (amber→white→amber) — less noticeable than scale pulse.

## R4: Single Open Form Constraint (FR-008)

**Decision**: Track the currently expanded match card ID in a module-level variable (`_expandedCardId`). When "Record Game" is tapped on a different card, collapse the previous one first. This mirrors the existing pattern of `selectedMatchId` in the store but is view-local (not persisted).

**Rationale**: View-local state is appropriate because the expand/collapse state is ephemeral UI state, not application data. No store changes needed.

**Alternatives considered**:
- Store the expanded card ID in the store — over-engineering; this is pure UI state.
- Use `<details>` elements with `name` attribute for mutual exclusion — browser support is recent and behavior is not fully controllable.

## R5: Existing Store API Compatibility

**Decision**: The store API is completely unchanged. `liveView.js` calls the same functions as `matchHub.js` and `matchDetail.js` did: `addPlayer`, `removePlayer`, `startMatch`, `selectMatch`, `abandonMatch`, `recordMatchGame`, `endTournament`, `resetTournament`, `getState`. It subscribes to the same events: `state:players:changed`, `state:matches:changed`, `state:standings:changed`, `state:reset`.

**Rationale**: The redesign is purely a view-layer change. The store is well-tested and stable.

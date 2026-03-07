# Research: Consistent Action Button Styling (009)

## Finding 1: Root Cause of Size Inconsistency

**Decision**: Fix missing `.btn` base class in `liveView.js` rather than rewriting the button system.

**Rationale**: The `.btn` base class in `styles.css` already provides correct sizing (`min-height: var(--touch-target)` = 44px, `padding: var(--space-sm) var(--space-lg)`, `border-radius: var(--radius-md)`, font family/size). Many buttons in `liveView.js` use modifier classes (`btn-primary`, `btn-secondary`, `btn-danger`) *without* the base class, so they inherit browser defaults instead of the design system. Other views (`namePrompt.js`, `club.js`, `gameHistory.js`) already use the correct `btn btn-primary` pattern. The fix is surgical: add the missing `btn` class and `btn-full` where needed.

**Alternatives considered**:
- Rewrite button HTML with entirely new class structure → higher risk, more code changes, no added value
- Add `.btn-primary { min-height: 44px; ... }` CSS duplicating base class properties → violates DRY, fragile

---

## Finding 2: Pill/Lozenge Radius

**Decision**: Add a `--radius-pill: 9999px` design token and apply it to `.btn`, `.pick-btn`, and `.pick-pill`.

**Rationale**: Current `.btn` uses `--radius-md` (8px) — rounded corners but not pill-shaped. The spec requires visual parity with player name lozenges. The pick-player buttons (`.pick-btn`) that display player names in the pick grid are the "lozenges" referenced in the issue. Making all interactive controls use `9999px` radius creates a consistent pill aesthetic across the whole system. A single new token is trivial to add and can be used wherever pill shape is needed.

**Alternatives considered**:
- Keep `--radius-md` on buttons, just fix sizing → doesn't satisfy P2 rounded requirement
- Use `--radius-lg` (12px) → still not pill-shaped, partial improvement only

---

## Finding 3: Unified Colour Palette — Two Semantic Variants

**Decision**: Retain existing two-variant system: `btn-primary` (amber accent) for standard actions + `btn-danger` (red) for destructive actions. Remove `btn-secondary` from main action paths; `btn-secondary` remains valid only for toggle/UI-chrome controls (New Match toggle button).

**Rationale**: The existing amber/red colour pairing already satisfies the two-variant requirement from clarification Q4. No new colours need to be introduced. The current `btn-secondary` is a surface-coloured button used for UI toggles (the "＋ New Match" toggle) — this is NOT a primary action and should retain a subdued style so it reads as a section header rather than a CTA. All submit-type primary actions must use `btn-primary`.

**Alternatives considered**:
- One single colour for everything → loses danger distinction, safety risk for destructive actions
- Introduce new colour tokens → unnecessary new complexity

---

## Finding 4: Full-Width Buttons

**Decision**: Add `btn-full` to all submit/action buttons. Toggle controls (New Match toggle, roster player-count button) remain auto-width as they function as section headers.

**Rationale**: `btn-full { width: 100% }` already exists in styles.css. Adding it to action buttons makes all CTAs fill their container, eliminating width inconsistencies between short labels ("Add") and longer ones ("Start Match", "Save"). Toggle controls should not be full-width — they appear in the header bar alongside other elements.

**Alternatives considered**:
- Auto-width with shared `min-width` → labels of different lengths still produce different widths visually

---

## Finding 5: Scope of Affected Files

**Decision**: The following files require HTML changes (button class fixes); only `styles.css` requires CSS changes.

CSS changes:
- `styles.css` — add `--radius-pill`, update `.btn`, `.pick-btn`, `.pick-pill` border-radius

HTML/JS changes required:
- `src/views/liveView.js` — most buttons missing `btn` base class; primary focus of this fix
- `src/router.js` — End Tournament / Reset Tournament hamburger menu buttons (need to verify)

No changes needed (already correct):
- `src/views/namePrompt.js` — uses `btn btn-primary` correctly
- `src/views/club.js` — uses `btn btn-sm`, `btn btn-primary btn-sm` correctly
- `src/views/gameHistory.js` — uses `btn btn-primary` correctly
- `src/views/leaderboard.js` — no interactive buttons (read-only standings table)

**Alternatives considered**:
- CSS-only fix (override `.btn-primary` to include all base styles) → fragile, creates duplicate/overriding CSS, misses full-width requirement

---

## Finding 6: E2e Testing Approach

**Decision**: Use Playwright MCP to visually verify button consistency against all acceptance scenarios. No Vitest unit tests needed for this feature (pure CSS/HTML change, no business logic).

**Rationale**: Per the constitution, all frontend features require Playwright e2e coverage. Business logic is unchanged, so Vitest TDD cycle applies to CSS/HTML correctness only — which is not unit-testable. E2e tests will navigate to each view, expand relevant sections, and use visual assertions (snapshot or attribute checks on computed style where possible) to verify consistency.

**Alternatives considered**:
- Vitest unit tests for CSS → not feasible in jsdom without full CSSOM support
- Manual visual testing only → insufficient per constitution's E2e gate

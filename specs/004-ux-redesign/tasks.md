# Tasks: UX Redesign — Scoreboard-Style Tournament Director Interface

**Input**: Design documents from `/specs/004-ux-redesign/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/store-api.md

**Tests**: Tests are MANDATORY per the project constitution (TDD non-negotiable). Test tasks MUST appear before and block their corresponding implementation tasks. Tests MUST be observed to fail before implementation begins.

**E2E Tests**: Playwright e2e tests MUST cover all acceptance scenarios. Run via Playwright MCP (`browser_navigate`, `browser_click`, `browser_snapshot`, etc.) against locally served app (`npx serve .`). On failure, capture full-page screenshot to `./artifacts/screenshots/<timestamp>-failure.png` and console log to `./artifacts/console/<timestamp>.log`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: New design system foundation and route restructuring

- [X] T001 Rewrite `styles.css` with new design system tokens: color palette (#0f0f0f base, #f5a623 amber accent, #34d399 success, #ef4444 danger), system font stack, monospace score font, spacing scale, 8px border-radius, 44px touch targets, card shadows, left-edge accent bars, expand/collapse transition (max-height 200ms ease-out), score-pulse keyframes animation
- [X] T002 Update `index.html` header markup: replace 4 nav links with 2 tabs ("Live", "Standings") + ☰ menu button (top-right). Add hamburger menu dropdown container (hidden by default) with: History link, Club link, divider, End Tournament button, Reset Tournament button. Conditionally show/hide tabs based on tournament state via a `data-has-tournament` attribute on body or header
- [X] T003 Update `src/router.js`: rename `#/players` route to `#/live` (pointing to liveView), remove `#/match` route, add redirect from `#/match` → `#/live` and `#/players` → `#/live`. Update default route logic. (Hamburger menu behavior is implemented in T014, not here)

**Checkpoint**: App renders with new visual system, 2-tab nav works, routes updated. Existing views may look broken (expected — they'll be restyled in later phases).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core Live view with match card rendering — MUST be complete before user story work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Write unit tests for liveView match card HTML rendering in `tests/views/liveView.test.js`: test that `renderMatchCard(match, players)` returns correct HTML with player names, score, target, game count, "Record Game" button, and "⋯" overflow button. Test collapsed and expanded card states. Test completed card rendering (winner, green accent). Observe tests FAIL
- [X] T005 Create `src/views/liveView.js` with basic structure: export `render(container)`, `onMount(container)`, `onUnmount()`. Implement `renderMatchCard()` helper for active match cards (player names left/right, large monospace score centered, "of N" target, "Game X" count, Record Game button, ⋯ overflow). Implement `renderCompletedCard()` for completed matches (muted, green bar, winner name). Wire `render()` to output tournament header zone + active cards zone + new match zone + completed zone. Make T004 tests PASS

---

**Checkpoint**: liveView renders match cards correctly in unit tests. No interactivity yet — that comes in user story phases.

---

## Phase 3: User Story 1 — Live Match Monitoring (Priority: P1) 🎯 MVP

**Goal**: Tournament director sees all active match scores at a glance on the Live view — large, readable, no scrolling on mobile

**Independent Test**: Create tournament, add 3+ players, start 2–3 matches, verify Live view shows all match cards with scores visible without scrolling at 375px width

### Tests for US1 ⚠️ WRITE FIRST (TDD)

- [X] T006 [US1] Write Playwright e2e tests in `tests/e2e/us1-live-monitoring.test.js`: AC1 — create tournament, start 2 matches, verify both match cards visible at 375px without scrolling. AC2 — verify score is the largest element on card (check font-size). AC3 — verify empty state shows "＋ New Match" button when no active matches. Observe tests FAIL

### Implementation for US1

- [X] T007 [US1] Wire liveView into router and event bus in `src/views/liveView.js`: subscribe to `state:matches:changed`, `state:players:changed`, `state:reset` in `onMount()`. On state change, re-render active match cards zone (targeted DOM update, not full innerHTML replacement). Note: preserve-expanded-state logic (`_expandedCardId` guard) is introduced in T011 — do NOT implement it here; leave a TODO comment in the re-render function as a placeholder. Ensure match cards are compact enough that 2–3 fit at 375px without scrolling — tune card padding, font sizes, margins in `styles.css`
- [X] T008 [US1] Add empty state handling in `src/views/liveView.js`: when no active matches, show centered message with "＋ New Match" button. Verify no horizontal scroll at 375px and 320px. Run US1 e2e tests via Playwright MCP — all PASS

**Checkpoint**: Live view shows active matches with large scores. 2–3 cards fit on a phone screen. No interactivity beyond viewing.

---

## Phase 4: User Story 2 — Inline Game Recording (Priority: P1)

**Goal**: Director records a game by tapping "Record Game" on a match card — form expands inline, score updates in place, form collapses

**Independent Test**: Start a match, tap Record Game, select winner/result/cube, submit, verify score updates and form collapses without leaving Live view

### Tests for US2 ⚠️ WRITE FIRST (TDD)

- [X] T009 [P] [US2] Write unit tests for expand/collapse logic in `tests/views/liveView.test.js`: test `_expandedCardId` tracking — expanding card A sets ID, expanding card B collapses A and sets B, collapsing sets null. Test that `renderMatchCard()` with expanded=true includes inline form HTML (winner select, result select, cube select, submit button). Observe tests FAIL
- [X] T010 [P] [US2] Write Playwright e2e tests in `tests/e2e/us2-inline-recording.test.js`: AC1 — tap Record Game, verify inline form appears within card. AC2 — submit game, verify score updates and form collapses with pulse animation. AC3 — toggle Record Game off, verify form collapses without recording. AC4 — record game that completes match, verify card transitions to complete state. AC5 (edge case) — expand card A's form, then record a game on card B (via a separate action that triggers state:matches:changed), verify card A's form remains open with updated score. Observe tests FAIL

### Implementation for US2

- [X] T011 [US2] Implement expand/collapse logic in `src/views/liveView.js`: add module-level `_expandedCardId` variable. On "Record Game" click, toggle expand state — if same card, collapse; if different card, collapse previous and expand new. Add document-level click listener: if a click target is not inside the expanded card (`!card.contains(event.target)`), collapse the form (`_expandedCardId = null`, re-render). Render inline form (winner select, result type select, cube value select, Submit button) inside the card when expanded. Use CSS max-height transition for smooth expand/collapse (FR-023). Make T009 unit tests PASS
- [X] T012 [US2] Implement game recording in `src/views/liveView.js`: on form submit, call `recordMatchGame(matchId, {winnerId, resultType, cubeValue})`. After recording: collapse form (`_expandedCardId = null`), add `score-updated` CSS class to trigger pulse animation (FR-024), remove class on `animationend`. Handle match completion: card re-renders as completed and moves to completed section. Implement single-form constraint (FR-008). Make T010 e2e tests PASS via Playwright MCP

**Checkpoint**: Full game recording workflow works inline. Director never leaves the Live view.

---

## Phase 5: User Story 3 — Simplified Navigation (Priority: P1)

**Goal**: 2 tabs (Live, Standings) + hamburger menu with History, Club, End/Reset Tournament

**Independent Test**: Verify header shows 2 tabs + ☰ during tournament, only ☰ when no tournament. Verify menu contains correct items. Verify End Tournament works from menu.

### Tests for US3 ⚠️ WRITE FIRST (TDD)

- [X] T013 [US3] Write Playwright e2e tests in `tests/e2e/us3-navigation.test.js`: AC1 — with tournament active, verify 2 tabs + ☰ visible in header. AC2 — tap ☰, verify menu shows History, Club, divider, End Tournament, Reset Tournament. AC3 — without tournament, verify no tabs, only ☰ with History + Club. AC4 — tap End Tournament in menu, accept confirmation, verify return to Start Tournament state. Test edge case: navigate to `#/match`, verify redirect to `#/live`. Test edge case: navigate to `#/players`, verify redirect to `#/live`. Test edge case: menu open + tap nav tab → menu closes. Observe tests FAIL

### Implementation for US3

- [X] T014 [US3] Implement hamburger menu behavior in `src/router.js`: toggle menu visibility on ☰ click, close on outside click (document listener), close on nav link click, close on menu item click. End Tournament and Reset Tournament menu items trigger `window.confirm()` then call `endTournament()` / `resetTournament()` and navigate to `#/start`
- [X] T015 [US3] Implement conditional tab visibility in `src/router.js`: after `loadFromStorage()` and on `state:reset` events, show/hide Live + Standings tabs based on whether a tournament exists. When no tournament: hide tabs, show only ☰ (with History + Club in menu, no End/Reset). When tournament active: show Live + Standings tabs + full menu. Run US3 e2e tests via Playwright MCP — all PASS

**Checkpoint**: Navigation restructuring complete. 2 tabs during play, menu for secondary actions.

---

## Phase 6: User Story 4 — Sport-Broadcast Visual Refresh (Priority: P2)

**Goal**: Entire app restyled with dark scoreboard aesthetic — consistent across all views

**Independent Test**: Visit every view (Start Tournament, Live, Standings, History, Club) and verify consistent palette, typography, card styles, touch targets

### Tests for US4 ⚠️ WRITE FIRST (TDD)

- [X] T016 [US4] Write Playwright e2e tests in `tests/e2e/us4-visual-refresh.test.js`: AC1 — verify background color is near-black on Live view. AC2 — verify match card score uses monospace font and is visually large. AC3 — verify active cards have amber left-edge bar and completed cards have green left-edge bar. AC4 — verify all buttons meet 44px minimum touch height. Observe tests FAIL

### Implementation for US4

- [ ] T017 [P] [US4] Restyle `src/views/namePrompt.js` to match new design system: update class names/HTML if needed to use new card surfaces, button styles, input styles from `styles.css`. Dark background, amber accents, system font
- [ ] T018 [P] [US4] Restyle `src/views/gameHistory.js` to match new design system: update class names/HTML to use new palette and typography. Match groups, game items, badges — all using new tokens. No structural/logic changes
- [ ] T019 [P] [US4] Restyle `src/views/club.js` to match new design system: update class names/HTML for all-time table, archive list, tournament detail. Dark surface, amber accents. No structural/logic changes
- [ ] T020 [US4] Run US4 e2e tests via Playwright MCP — all PASS. Verify visual consistency across all views

**Checkpoint**: Every screen uses the new scoreboard aesthetic. Consistent palette, typography, and spacing throughout.

---

## Phase 7: User Story 5 — Standings with Live Match Indicators (Priority: P2)

**Goal**: Leaderboard table includes a "Live" column showing active match scores for in-play players

**Independent Test**: Start matches, view Standings, verify Live column shows "vs [opponent] [score]" for active players, clears when match completes

### Tests for US5 ⚠️ WRITE FIRST (TDD)

- [X] T021 [P] [US5] Write unit tests for Live column data in `tests/views/leaderboard.test.js`: test that leaderboard render includes a "Live" column. Test that a player in an active match shows "vs [name] [score]". Test that a player with no active match shows "—". Observe tests FAIL
- [X] T022 [P] [US5] Write Playwright e2e tests in `tests/e2e/us5-standings-live.test.js`: AC1 — start match Alice vs Bob, go to Standings, verify Alice row shows "vs Bob" with score. AC2 — verify Charlie (no match) shows "—". AC3 — complete match, verify Live column clears for both players. Observe tests FAIL

### Implementation for US5

- [X] T023 [US5] Update `src/views/leaderboard.js`: add "Live" column to table header. In row rendering, look up active matches from `getState().matches` to find if the player is in an active match. If yes, show "vs [opponent] [score]". If no, show "—". Subscribe to `state:matches:changed` to refresh the Live column when scores update. Also apply new design tokens to the leaderboard container and table: dark surface, amber column headers, updated row hover state. Make T021 + T022 tests PASS

**Checkpoint**: Standings page shows live match data. No more "all zeros" during early play.

---

## Phase 8: User Story 6 — Collapsible Player Management (Priority: P2)

**Goal**: Player roster and add-player form are collapsed by default, expandable inline, saving screen space

**Independent Test**: Verify roster collapsed on load, ＋ expands add form, "N players" expands roster, both collapse

### Tests for US6 ⚠️ WRITE FIRST (TDD)

- [X] T024 [P] [US6] Write unit tests in `tests/views/liveView.test.js`: test tournament header renders with player count and ＋ button, no visible roster or input. Test that expanded roster HTML includes player items with Remove buttons. Observe tests FAIL
- [X] T025 [P] [US6] Write Playwright e2e tests in `tests/e2e/us6-player-management.test.js`: AC1 — verify header shows "N players" + ＋, no roster visible. AC2 — tap ＋, verify input appears, add player, verify input collapses and count increments. AC3 — tap player count, verify roster expands with Remove buttons. AC4 — tap player count again, verify roster collapses. Observe tests FAIL

### Implementation for US6

- [X] T026 [US6] Implement collapsible tournament header in `src/views/liveView.js`: render compact header line with tournament name, "N players" clickable text, ＋ button. Track `_rosterExpanded` and `_addPlayerExpanded` booleans. On ＋ click: toggle add-player input inline (expand/collapse with CSS transition). On "N players" click: toggle roster list (show/hide player items with Remove buttons). On player added: collapse input, increment count. On player removed: update count, keep roster open. Subscribe to `state:players:changed` for reactive updates. Make T024 + T025 tests PASS

**Checkpoint**: Player management is accessible but doesn't dominate the screen. Setup tasks stay out of the way during active play.

---

## Phase 9: User Story 7 — Collapsible New Match Form (Priority: P3)

**Goal**: "＋ New Match" button expands inline form for starting a match, collapses after

**Independent Test**: Tap ＋ New Match, select players and target, submit, verify form collapses and new card appears

### Tests for US7 ⚠️ WRITE FIRST (TDD)

- [X] T027 [P] [US7] Write unit tests in `tests/views/liveView.test.js`: test that "＋ New Match" button renders. Test that expanded form includes P1, P2, Target selectors. Test button is disabled when <2 players. Observe tests FAIL
- [X] T028 [P] [US7] Write Playwright e2e tests in `tests/e2e/us7-new-match-form.test.js`: AC1 — tap ＋ New Match, verify inline form appears. AC2 — select 2 players and target, submit, verify form collapses and new active card appears. AC3 — verify button disabled with <2 players. Observe tests FAIL

### Implementation for US7

- [X] T029 [US7] Implement collapsible new match form in `src/views/liveView.js`: render "＋ New Match" ghost-style button. Track `_newMatchExpanded` boolean. On click: toggle inline form (Player 1 select, Player 2 select, Target input, Start button). On submit: call `startMatch(p1Id, p2Id, target)`, collapse form, new card appears via `state:matches:changed` handler. Disable button when <2 players. Make T027 + T028 tests PASS

**Checkpoint**: All 7 user stories complete. Full tournament workflow operational through the new UI.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, legacy cleanup, final validation

- [X] T030a Write failing tests for overflow menu in `tests/views/liveView.test.js` and `tests/e2e/us8-overflow-menu.test.js`: unit — verify `renderMatchCard()` includes a ⋯ button; e2e — (a) verify ⋯ button visible on active card, (b) click ⋯, verify "Abandon Match" option appears, (c) click Abandon, accept confirm, verify card removed from active section. Observe tests FAIL
- [X] T030 Implement overflow "⋯" menu on active match cards in `src/views/liveView.js`: small positioned dropdown with "Abandon Match" option. On click: `window.confirm()` then `abandonMatch(matchId)`. Close on outside click (FR-009). Make T030a tests PASS
- [X] T031 Handle edge cases in `src/views/liveView.js`: long player names truncate with ellipsis (CSS `text-overflow: ellipsis`), scores never clipped. Test at 320px viewport width
- [X] T032 [P] Update `tests/e2e/smoke.spec.js` for new routes and selectors: update all references from `#/players` to `#/live`, remove `#/match` references, update nav selectors for 2-tab + menu layout
- [X] T033 [P] Remove deprecated files: delete `src/views/matchHub.js`, `src/views/matchDetail.js`, and their test files if not already removed. Clean up any dead imports in `src/router.js`
- [X] T034 [P] Update legacy e2e tests (`tests/e2e/us1-*.test.js` through `us5-*.test.js` from 003-match-mode): rewrite for new selectors and routes, or remove if fully superseded by new US1–US7 tests
- [X] T035 Run full Vitest suite (`npm test`) — verify all existing model/store unit tests pass unchanged (SC-005). Run full Playwright e2e suite via Playwright MCP — verify all tests pass. Confirm failure artifacts configuration works (screenshots + console logs to `./artifacts/`)
- [X] T036 Mobile responsiveness sweep: serve app, test all views at 320px, 375px, 768px, 1280px via Playwright MCP `browser_resize`. Verify no horizontal scroll, touch targets ≥44px, scores readable. Capture screenshots at each breakpoint

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phases 3–5 (US1–US3, P1)**: Depend on Phase 2 — execute sequentially (US1 → US2 → US3) as they build on the same `liveView.js` file
- **Phases 6–8 (US4–US6, P2)**: Depend on Phase 5 completion — US4 can run in parallel with US5/US6 (different files). US5 and US6 build on `leaderboard.js` and `liveView.js` respectively
- **Phase 9 (US7, P3)**: Depends on Phase 8 (builds on liveView.js)
- **Phase 10 (Polish)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (Live Monitoring)**: Depends on Phase 2 (foundational liveView)
- **US2 (Inline Recording)**: Depends on US1 (needs rendered match cards to expand)
- **US3 (Navigation)**: Depends on Phase 1 (route/header changes) — can overlap with US1/US2 but touches `router.js` and `index.html`
- **US4 (Visual Refresh)**: Independent of US1–3 for the restyle-only views (namePrompt, gameHistory, club). Depends on Phase 1 for design tokens
- **US5 (Standings Live)**: Independent — only touches `leaderboard.js`
- **US6 (Player Management)**: Depends on US1 (liveView foundation)
- **US7 (New Match Form)**: Depends on US6 (liveView with collapsible sections pattern)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Implementation makes tests PASS
- E2e tests run via Playwright MCP after implementation
- Commit after each task or logical group

### Parallel Opportunities

- T009 + T010 (US2 tests) can run in parallel
- T017 + T018 + T019 (US4 restyling) can run in parallel (different view files)
- T021 + T022 (US5 tests) can run in parallel
- T024 + T025 (US6 tests) can run in parallel
- T027 + T028 (US7 tests) can run in parallel
- T032 + T033 + T034 (Polish cleanup) can run in parallel

---

## Parallel Example: User Story 4 (Visual Refresh)

```bash
# Launch restyle tasks in parallel (different files):
Task: "T017 [P] [US4] Restyle namePrompt.js"
Task: "T018 [P] [US4] Restyle gameHistory.js"
Task: "T019 [P] [US4] Restyle club.js"

# Then run e2e validation:
Task: "T020 [US4] Run US4 e2e tests"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (design system + routes)
2. Complete Phase 2: Foundational (liveView card rendering)
3. Complete Phase 3: US1 (live match monitoring)
4. **STOP and VALIDATE**: Tournament director can see all active match scores at a glance
5. Deploy/demo if ready — this alone is a usable improvement

### Incremental Delivery

1. Setup + Foundational → New design system and liveView shell
2. US1 → Match cards visible (MVP!)
3. US2 → Inline game recording (core workflow complete)
4. US3 → Navigation simplified (full UX restructure done)
5. US4 → Visual refresh across all views (polished look)
6. US5 → Standings Live column (nice-to-have enhancement)
7. US6 → Collapsible player management (space optimization)
8. US7 → Collapsible new match form (final refinement)
9. Polish → Edge cases, cleanup, mobile sweep

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All model and store files are UNCHANGED — do not modify anything in `src/models/` or `src/store/`
- Design reference: `docs/plans/2026-03-06-ux-redesign-design.md` has exact colors, fonts, spacing

# Tasks: Roster Visibility

**Input**: Design documents from `specs/005-roster-visibility/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**Tests**: MANDATORY per project constitution (TDD non-negotiable). Test tasks appear before and block their corresponding implementation tasks.

**E2E Tests**: Playwright via Playwright MCP. All acceptance scenarios must have coverage. On failure, artifacts MUST be saved:
- Screenshot: `browser_take_screenshot` (fullPage) → `./artifacts/screenshots/<timestamp>-failure.png`
- Console: `browser_console_messages` → `./artifacts/console/<timestamp>.log`

**Organization**: 2 user stories. US1 (P1) is MVP — deliver and validate independently before US2.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

**Purpose**: No new infrastructure needed — pure CSS + HTML fix to existing view.

- [ ] T001 Read `src/views/liveView.js` lines 153–175 and `styles.css` roster section to confirm root cause (missing `.live-roster__row` CSS + missing `.live-roster-inner` wrapper in `rosterListHtml`)

---

## Phase 2: Foundational

No foundational changes required. Player data already flows correctly from store → `getState().players` → `rosterListHtml()`. Proceed directly to user stories.

---

## Phase 3: User Story 1 — See Added Player Names in Roster (Priority: P1) 🎯 MVP

**Goal**: When the roster is expanded, all registered player names are visible and legible.

**Independent Test**: Add 3 players, expand roster, verify all 3 names appear as text in the expanded panel.

### Tests for User Story 1 ⚠️ WRITE FIRST (TDD)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T002 [US1] Read `tests/e2e/us6-player-management.test.js` to understand existing AC3 test and what it currently asserts about player names
- [ ] T003 [US1] Add failing e2e test to `tests/e2e/us6-player-management.test.js`: expand roster after adding 2 players, assert both player name texts are visible inside `.live-roster`

  ```javascript
  test('AC3b — expanded roster shows each player name as text', async ({ page }) => {
    await createTournament(page);
    await addPlayer(page, 'Alice');
    await addPlayer(page, 'Bob');

    await page.locator('[data-action="toggle-roster"]').click();
    const roster = page.locator('.live-roster');
    await expect(roster.locator('.live-roster__name').filter({ hasText: 'Alice' })).toBeVisible();
    await expect(roster.locator('.live-roster__name').filter({ hasText: 'Bob' })).toBeVisible();
  });
  ```

- [ ] T004 [US1] Run test to confirm it FAILS: `npx playwright test tests/e2e/us6-player-management.test.js --grep "AC3b" 2>&1 | tail -15`

### Implementation for User Story 1

- [ ] T005 [P] [US1] Wrap roster content in `.live-roster-inner` in `rosterListHtml()` in `src/views/liveView.js`:

  Change:
  ```javascript
  function rosterListHtml(players) {
    if (!players.length) return '<p class="live-roster__empty">No players yet.</p>';
    return players.map((p) => `
      <div class="live-roster__row">
        <span class="live-roster__name">${escapeHtml(p.name)}</span>
        <button ...>Remove</button>
      </div>`).join('');
  }
  ```
  To:
  ```javascript
  function rosterListHtml(players) {
    if (!players.length) return `
      <div class="live-roster-inner">
        <p class="live-roster__empty">No players yet.</p>
      </div>`;
    return `<div class="live-roster-inner">${players.map((p) => `
      <div class="live-roster__row">
        <span class="live-roster__name">${escapeHtml(p.name)}</span>
        <button class="btn-danger btn-sm" type="button" data-action="remove-player" data-player-id="${escapeHtml(p.id)}">Remove</button>
      </div>`).join('')}</div>`;
  }
  ```

- [ ] T006 [P] [US1] Add CSS rules for roster row elements to `styles.css`, after the `.live-roster-inner` block:

  ```css
  .live-roster__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-xs) 0;
    border-bottom: 1px solid var(--color-border);
  }

  .live-roster__row:last-child {
    border-bottom: none;
  }

  .live-roster__name {
    font-size: 0.9375rem;
    color: var(--color-text);
  }

  .live-roster__empty {
    color: var(--color-text-muted);
    font-size: 0.875rem;
    margin: 0;
  }
  ```

- [ ] T007 [US1] Run e2e test to confirm it now PASSES: `npx playwright test tests/e2e/us6-player-management.test.js --grep "AC3b" 2>&1 | tail -10`
- [ ] T008 [US1] Run full us6 test file to confirm no regressions: `npx playwright test tests/e2e/us6-player-management.test.js 2>&1 | tail -10`
- [ ] T009 [US1] Commit: `git add src/views/liveView.js styles.css tests/e2e/us6-player-management.test.js && git commit -m "feat: show player names in expanded roster"`

**Checkpoint**: Roster expands to show all player names with card styling. Independently testable and complete as MVP.

---

## Phase 4: User Story 2 — Player Count Always Visible (Priority: P2)

**Goal**: The player count is always visible on the roster toggle button, even when collapsed.

**Independent Test**: Add 3 players, collapse roster, verify "3 players" text is on the toggle button.

### Tests for User Story 2 ⚠️ WRITE FIRST (TDD)

- [ ] T010 [US2] Read existing AC1 and AC2 tests in `tests/e2e/us6-player-management.test.js` to verify count visibility is already tested — if so, note which assertions cover it
- [ ] T011 [US2] If count-in-collapsed-state is NOT explicitly tested, add a failing test; if it IS covered, document and skip to T012

  ```javascript
  test('AC1b — player count updates immediately after adding player', async ({ page }) => {
    await createTournament(page);
    await expect(page.locator('[data-action="toggle-roster"]')).toContainText('0 players');
    await addPlayer(page, 'Alice');
    await expect(page.locator('[data-action="toggle-roster"]')).toContainText('1 player');
    await addPlayer(page, 'Bob');
    await expect(page.locator('[data-action="toggle-roster"]')).toContainText('2 players');
  });
  ```

- [ ] T012 [US2] Run test to confirm pass/fail status: `npx playwright test tests/e2e/us6-player-management.test.js --grep "AC1b" 2>&1 | tail -10`

### Implementation for User Story 2

- [ ] T013 [US2] If test passes: count already works correctly — no implementation changes needed. If test fails: update `headerHtml()` count display in `src/views/liveView.js` to ensure it re-renders on `state:players:changed`
- [ ] T014 [US2] Commit any changes (or note "no changes required — US2 already implemented")

**Checkpoint**: Player count visible at all times, updates immediately on add/remove.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T015 Run full Playwright e2e suite: `npx playwright test 2>&1 | tail -10` — confirm all tests pass
- [ ] T016 Run Vitest unit suite: `npm test 2>&1 | tail -5` — confirm all tests pass
- [ ] T017 [P] Visually verify in browser via Playwright MCP: navigate to `http://localhost:3456`, start tournament, add 3 players, expand roster — screenshot confirms names visible with card styling
- [ ] T018 Commit any remaining changes and update `speckit/project-memory.md` test counts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Foundational)**: N/A — skipped
- **Phase 3 (US1)**: Depends on Phase 1 — T002 → T003 → T004 (confirm fail) → T005+T006 (parallel) → T007 → T008 → T009
- **Phase 4 (US2)**: Independent of US1 — can start any time after Phase 1
- **Phase 5 (Polish)**: Depends on US1 + US2 complete

### User Story Dependencies

- **US1 (P1)**: Independent — no dependencies on US2
- **US2 (P2)**: Independent — no dependencies on US1

### Within Each User Story

- Tests MUST be written and FAIL before implementation (T003→T004 before T005)
- T005 and T006 can run in parallel (different files: liveView.js vs styles.css)
- Confirm pass (T007) before committing (T009)

### Parallel Opportunities

- T005 (`src/views/liveView.js`) and T006 (`styles.css`) modify different files — parallelisable
- US1 and US2 are fully independent — can be worked in parallel

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1 (T001)
2. Complete Phase 3: US1 (T002–T009)
3. **STOP and VALIDATE**: names visible in browser
4. Ship if roster visibility is the only requirement

### Full Delivery

1. Complete Phase 1 → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (Polish)
2. Each phase independently testable

---

## Notes

- [P] tasks modify different files and can run in parallel
- T005 and T006 are the core fix — everything else is testing and validation
- US2 may already be implemented (count display works) — T010–T011 confirm this
- Constitution requires Playwright MCP for e2e execution and artifact capture on failure

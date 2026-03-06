# Tasks: Tap-to-Select

**Input**: Design documents from `specs/006-tap-to-select/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**Tests**: MANDATORY per project constitution (TDD non-negotiable). Test tasks appear before and block their corresponding implementation tasks.

**E2E Tests**: Playwright via Playwright MCP. All acceptance scenarios must have coverage. On failure, artifacts MUST be saved:
- Screenshot: `browser_take_screenshot` (fullPage) → `./artifacts/screenshots/<timestamp>-failure.png`
- Console: `browser_console_messages` → `./artifacts/console/<timestamp>.log`

**Organization**: 2 user stories. US1 (P1) is MVP — deliver and validate independently before US2.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

**Purpose**: Read current code to understand exact change points before touching anything.

- [x] T001 Read `src/views/liveView.js` lines 1–20 (ephemeral state block) and lines 200–234 (`newMatchFormHtml`) and lines 471–475 (`toggle-new-match` handler) and lines 518–533 (submit handler) to understand the full current shape of the new-match flow
- [x] T002 Read `tests/e2e/us7-new-match-form.test.js` to understand all current ACs and what selectors they use

---

## Phase 2: Foundational

**Purpose**: Add the 3 new ephemeral state variables that both user stories depend on. Must be complete before US1 or US2.

- [x] T003 Add `let _pickStep = null;`, `let _selectedP1 = null;`, `let _selectedP2 = null;` to the ephemeral state block in `src/views/liveView.js` (after `let _newMatchExpanded = false;` at line 15)
- [x] T004 Add reset of `_pickStep`, `_selectedP1`, `_selectedP2` inside `render()` in `src/views/liveView.js` (after `_newMatchExpanded = false;` at line 297)

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 — Pick Two Players via Tap Grid (Priority: P1) 🎯 MVP

**Goal**: Replace dropdown selects with a 2-column tap grid. 3-step flow: pick P1 → pick P2 → confirm & start.

**Independent Test**: Add 2+ players, tap "+ New Match", tap two name buttons, tap Start — match card appears.

### Tests for User Story 1 ⚠️ WRITE FIRST (TDD)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T005 [US1] Rewrite `tests/e2e/us7-new-match-form.test.js` replacing AC1 (assert `.pick-grid` visible + `.pick-prompt` contains "Pick Player 1" + count of `[data-action="pick-player"]` buttons) and AC2 (tap Alice → prompt changes to "Pick Player 2", tap Bob → `.pick-confirm` visible with both names, submit → active card appears). Keep AC3 (disabled button) unchanged. New file content:

  ```javascript
  /**
   * US7 — New Match Form: Tap-to-Select Players
   * AC1: + New Match → player pick grid with "Pick Player 1:" prompt
   * AC2: Pick two players → confirmation row → Start → active card
   * AC3: + New Match disabled with fewer than 2 players
   */
  import { test, expect } from './fixtures.js';

  async function createTournament(page, name = 'Club Night') {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await page.locator('.name-prompt input[type="text"]').fill(name);
    await page.locator('.name-prompt button[type="submit"]').click();
    await expect(page.locator('.view--live')).toBeVisible();
  }

  async function addPlayer(page, name) {
    await page.locator('[data-action="toggle-add-player"]').click();
    await page.locator('#player-name-input').fill(name);
    await page.locator('#add-player-form button[type="submit"]').click();
    await page.waitForTimeout(50);
  }

  test('AC1 — tapping + New Match shows player pick grid', async ({ page }) => {
    await createTournament(page);
    await addPlayer(page, 'Alice');
    await addPlayer(page, 'Bob');

    await expect(page.locator('.pick-grid')).not.toBeVisible();
    await page.locator('[data-action="toggle-new-match"]').click();

    await expect(page.locator('.pick-grid')).toBeVisible();
    await expect(page.locator('.pick-prompt')).toContainText('Pick Player 1');
    await expect(page.locator('[data-action="pick-player"]')).toHaveCount(2);

    // Pick Alice — her button should become disabled (can't pick same player twice)
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
    await expect(page.locator('.pick-prompt')).toContainText('Pick Player 2');
    await expect(page.locator('[data-player-id]').filter({ hasText: 'Alice' })).toBeDisabled();
  });

  test('AC2 — picking two players and submitting creates active card', async ({ page }) => {
    await createTournament(page);
    await addPlayer(page, 'Alice');
    await addPlayer(page, 'Bob');

    await page.locator('[data-action="toggle-new-match"]').click();
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
    await expect(page.locator('.pick-prompt')).toContainText('Pick Player 2');

    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Bob' }).click();
    await expect(page.locator('.pick-confirm')).toBeVisible();
    await expect(page.locator('.pick-confirm')).toContainText('Alice');
    await expect(page.locator('.pick-confirm')).toContainText('Bob');

    await page.locator('#start-match-form button[type="submit"]').click();
    await page.waitForTimeout(100);

    await expect(page.locator('#start-match-form')).not.toBeVisible();
    await expect(page.locator('.live-card--active')).toHaveCount(1);
    await expect(page.locator('.live-card--active')).toContainText('Alice');
    await expect(page.locator('.live-card--active')).toContainText('Bob');
  });

  test('AC3 — + New Match button is disabled with fewer than 2 players', async ({ page }) => {
    await createTournament(page);
    await addPlayer(page, 'Alice');
    await expect(page.locator('[data-action="toggle-new-match"]')).toBeDisabled();
  });
  ```

- [x] T006 [US1] Run test to confirm AC1 and AC2 FAIL: `npx playwright test tests/e2e/us7-new-match-form.test.js --grep "AC1|AC2" 2>&1 | tail -15`

### Implementation for User Story 1

- [x] T007 [US1] Rewrite `newMatchFormHtml()` in `src/views/liveView.js` (lines 200–234) to render a 3-step flow:

  ```javascript
  function newMatchFormHtml(players) {
    const canStart = players.length >= 2;

    if (!_newMatchExpanded) {
      return `
        <div class="live-new-match">
          <button class="live-new-match__toggle btn-secondary" type="button" data-action="toggle-new-match" ${canStart ? '' : 'disabled'}>
            ＋ New Match
          </button>
        </div>`;
    }

    if (_pickStep === 'confirm') {
      const p1Name = escapeHtml(playerName(players, _selectedP1));
      const p2Name = escapeHtml(playerName(players, _selectedP2));
      return `
        <div class="live-new-match live-new-match--expanded">
          <button class="live-new-match__toggle btn-secondary" type="button" data-action="toggle-new-match">
            ＋ New Match
          </button>
          <div class="pick-panel">
            <div class="pick-confirm">
              <button class="pick-pill pick-pill--selected" type="button" data-action="deselect-player" data-player-id="${escapeHtml(_selectedP1)}">${p1Name}</button>
              <span class="pick-vs">vs</span>
              <button class="pick-pill pick-pill--selected" type="button" data-action="deselect-player" data-player-id="${escapeHtml(_selectedP2)}">${p2Name}</button>
            </div>
            <form id="start-match-form" class="pick-start-form">
              <label class="live-form__label">Target
                <input class="live-form__input" type="number" data-start-target min="1" value="7">
              </label>
              <button class="btn-primary" type="submit">Start</button>
              <div data-match-error class="live-error" aria-live="polite"></div>
            </form>
          </div>
        </div>`;
    }

    const prompt = _pickStep === 2 ? 'Pick Player 2' : 'Pick Player 1';
    const buttonsHtml = players.map((p) => {
      const isSelected = p.id === _selectedP1;
      const cls = isSelected ? 'pick-btn pick-btn--selected' : 'pick-btn';
      const action = isSelected ? 'deselect-player' : 'pick-player';
      const disabled = isSelected && _pickStep === 2 ? ' disabled' : '';
      return `<button class="${cls}" type="button" data-action="${action}" data-player-id="${escapeHtml(p.id)}"${disabled}>${escapeHtml(p.name)}</button>`;
    }).join('');

    return `
      <div class="live-new-match live-new-match--expanded">
        <button class="live-new-match__toggle btn-secondary" type="button" data-action="toggle-new-match">
          ＋ New Match
        </button>
        <div class="pick-panel">
          <p class="pick-prompt">${prompt}</p>
          <div class="pick-grid">${buttonsHtml}</div>
        </div>
      </div>`;
  }
  ```

- [x] T008 [P] [US1] Add CSS for player pick grid to `styles.css` after the `.live-new-match__form { ... }` block (~line 1778):

  ```css
  /* ===== Player pick grid ===== */
  .pick-panel {
    padding: var(--space-md);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-top: none;
    border-radius: 0 0 var(--radius-md) var(--radius-md);
  }

  .pick-prompt {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text-muted);
    margin: 0 0 var(--space-sm) 0;
  }

  .pick-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-sm);
  }

  .pick-btn {
    min-height: var(--touch-target);
    padding: var(--space-sm) var(--space-md);
    font-family: var(--font-body);
    font-size: 0.9375rem;
    font-weight: 600;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background-color: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
    transition: background-color var(--transition), border-color var(--transition);
  }

  .pick-btn:hover:not(:disabled) {
    border-color: var(--color-accent);
    background-color: var(--color-accent-glow);
  }

  .pick-btn--selected {
    background-color: var(--color-accent);
    border-color: var(--color-accent);
    color: #fff;
    cursor: default;
  }

  .pick-btn--selected:hover:not(:disabled) {
    background-color: var(--color-accent);
    border-color: var(--color-accent);
  }

  .pick-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .pick-confirm {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
  }

  .pick-pill {
    font-family: var(--font-body);
    font-size: 0.9375rem;
    font-weight: 600;
    padding: var(--space-sm) var(--space-lg);
    border-radius: var(--radius-md);
    border: none;
    cursor: pointer;
  }

  .pick-pill--selected {
    background-color: var(--color-accent);
    color: #fff;
  }

  .pick-pill--selected:hover {
    opacity: 0.85;
  }

  .pick-vs {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    font-weight: 600;
  }

  .pick-start-form {
    display: flex;
    align-items: flex-end;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  .pick-start-form .live-form__label {
    flex: 0 0 auto;
  }

  .pick-start-form .btn-primary {
    min-height: var(--touch-target);
  }
  ```

- [x] T009 [US1] Add `pick-player` click handler in `src/views/liveView.js` delegated click handler (before the `toggle-new-match` block):

  ```javascript
  if (action === 'pick-player') {
    if (_pickStep === 1) {
      _selectedP1 = playerId;
      _pickStep = 2;
    } else if (_pickStep === 2) {
      _selectedP2 = playerId;
      _pickStep = 'confirm';
    }
    refreshNewMatchForm();
    return;
  }
  ```

- [x] T010 [US1] Update `toggle-new-match` handler in `src/views/liveView.js` to initialise and reset pick state:

  ```javascript
  if (action === 'toggle-new-match') {
    _newMatchExpanded = !_newMatchExpanded;
    if (_newMatchExpanded) {
      _pickStep = 1;
      _selectedP1 = null;
      _selectedP2 = null;
    } else {
      _pickStep = null;
      _selectedP1 = null;
      _selectedP2 = null;
    }
    refreshNewMatchForm();
    return;
  }
  ```

- [x] T011 [US1] Update `start-match-form` submit handler in `src/views/liveView.js` to read from `_selectedP1`/`_selectedP2` instead of `<select>` values:

  ```javascript
  if (e.target.id === 'start-match-form') {
    e.preventDefault();
    const target = parseInt(_container.querySelector('[data-start-target]')?.value ?? '7', 10);
    const errorEl = _container.querySelector('[data-match-error]');
    if (errorEl) errorEl.textContent = '';
    try {
      startMatch(_selectedP1, _selectedP2, target);
      _newMatchExpanded = false;
      _pickStep = null;
      _selectedP1 = null;
      _selectedP2 = null;
      refreshNewMatchForm();
    } catch (err) {
      if (errorEl) errorEl.textContent = err.message;
    }
    return;
  }
  ```

- [x] T012 [US1] Run AC1–AC3 e2e tests to confirm they now PASS: `npx playwright test tests/e2e/us7-new-match-form.test.js 2>&1 | tail -10`
- [x] T013 [US1] Commit: `git add src/views/liveView.js styles.css tests/e2e/us7-new-match-form.test.js && git commit -m "feat: tap-to-select player grid for new match form"`

**Checkpoint**: Player pick grid is live. Users can tap two names and start a match. US1 independently complete.

---

## Phase 4: User Story 2 — Deselect and Change Mind (Priority: P2)

**Goal**: Tapping a selected player (pill or grid button) deselects them and returns to the previous pick step.

**Independent Test**: Pick two players to reach confirm step, tap one pill — selection clears, prompt returns to the appropriate pick step.

### Tests for User Story 2 ⚠️ WRITE FIRST (TDD)

- [x] T014 [US2] Add AC4 test to `tests/e2e/us7-new-match-form.test.js` (append after AC3):

  ```javascript
  test('AC4 — tapping selected pill deselects and returns to previous step', async ({ page }) => {
    await createTournament(page);
    await addPlayer(page, 'Alice');
    await addPlayer(page, 'Bob');
    await addPlayer(page, 'Carol');

    await page.locator('[data-action="toggle-new-match"]').click();
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Bob' }).click();
    await expect(page.locator('.pick-confirm')).toBeVisible();

    // Deselect Bob (P2 pill) → back to Pick Player 2
    await page.locator('[data-action="deselect-player"]').filter({ hasText: 'Bob' }).click();
    await expect(page.locator('.pick-prompt')).toContainText('Pick Player 2');
    await expect(page.locator('.pick-confirm')).not.toBeVisible();

    // Pick Carol as P2 → confirm step with Alice vs Carol
    await page.locator('[data-action="pick-player"]').filter({ hasText: 'Carol' }).click();
    await expect(page.locator('.pick-confirm')).toBeVisible();

    // Deselect Alice (P1 pill at confirm) → Carol becomes P1, back to Pick Player 2
    await page.locator('[data-action="deselect-player"]').filter({ hasText: 'Alice' }).click();
    await expect(page.locator('.pick-prompt')).toContainText('Pick Player 2');
    // At step 2: Carol is now P1, her button is selected and disabled in the grid
    await expect(page.locator('[data-player-id]').filter({ hasText: 'Carol' })).toBeDisabled();
  });
  ```

- [x] T015 [US2] Run AC4 test to confirm it FAILS: `npx playwright test tests/e2e/us7-new-match-form.test.js --grep "AC4" 2>&1 | tail -10`

### Implementation for User Story 2

- [x] T016 [US2] Add `deselect-player` click handler in `src/views/liveView.js` (directly after the `pick-player` handler added in T009):

  ```javascript
  if (action === 'deselect-player') {
    if (_pickStep === 'confirm') {
      if (playerId === _selectedP2) {
        _selectedP2 = null;
        _pickStep = 2;
      } else if (playerId === _selectedP1) {
        _selectedP1 = _selectedP2;
        _selectedP2 = null;
        _pickStep = _selectedP1 ? 2 : 1;
      }
    }
    refreshNewMatchForm();
    return;
  }
  ```

- [x] T017 [US2] Run full us7 test file to confirm all 4 tests pass: `npx playwright test tests/e2e/us7-new-match-form.test.js 2>&1 | tail -10`
- [x] T018 [US2] Commit: `git add src/views/liveView.js tests/e2e/us7-new-match-form.test.js && git commit -m "feat: deselect player by tapping selected pill"`

**Checkpoint**: Both user stories complete and independently testable.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Update all other e2e helpers that start matches, remove dead code, verify full suite.

- [x] T019 Update unit test assertion in `tests/views/liveView.test.js` (~line 367): replace `querySelectorAll('select[data-new-p1], ...')` with `querySelectorAll('[data-action="pick-player"]')` and update `expect(selects.length)` to `expect(pickBtns.length)`
- [x] T020 Update `startMatch`/`recordGame` helper in `tests/e2e/us1-live-monitoring.test.js`: replace `selectOption({ label: p1Name })` on `select[data-start-p1]` and `select[data-start-p2]` with `page.locator('[data-action="pick-player"]').filter({ hasText: p1Name }).click()` and same for p2Name
- [x] T021 Update helper in `tests/e2e/us2-inline-recording.test.js`: same pattern as T020
- [x] T022 Update helper in `tests/e2e/us2-end-archive.test.js`: same pattern as T020
- [x] T023 Update helper and inline calls in `tests/e2e/us3-night-leaderboard.test.js`: same pattern as T020 (has both helper and inline calls at lines 81–82 and 97–98)
- [x] T024 Update helper in `tests/e2e/us3-browse-archive.test.js`: same pattern as T020
- [x] T025 Update helper in `tests/e2e/us4-visual-refresh.test.js`: same pattern as T020
- [x] T026 Update helper in `tests/e2e/us4-all-time-leaderboard.test.js`: same pattern as T020
- [x] T027 Update helper in `tests/e2e/us5-standings-live.test.js`: same pattern as T020
- [x] T028 Update helper in `tests/e2e/us5-roster-suggestions.test.js`: same pattern as T020
- [x] T029 Update helper in `tests/e2e/t034-validation.test.js`: same pattern as T020
- [x] T030 Update `tests/e2e/smoke.spec.js`: update the two startMatch calls (lines ~129 and ~147) with pick-player pattern; for the same-player test (~line 139) replace with assertion that Alice's pick button is disabled after selecting her (same player can't be picked twice by design)
- [x] T031 Remove dead `playerSelectOptions()` function from `src/views/liveView.js` (lines 57–62); verify no remaining callers with `grep -n "playerSelectOptions" src/views/liveView.js`
- [x] T032 Run full Playwright e2e suite: `npx playwright test 2>&1 | tail -15` — confirm all tests pass
- [x] T033 Run Vitest unit suite: `npm test 2>&1 | tail -5` — confirm all tests pass
- [x] T034 [P] Visually verify in browser via Playwright MCP: navigate to `http://localhost:3456`, start tournament, add 3 players, tap "+ New Match" — screenshot confirms grid appears with player name buttons
- [x] T035 Commit remaining changes: `git add tests/ src/views/liveView.js && git commit -m "refactor: update all e2e helpers + remove dead playerSelectOptions()"`
- [x] T036 Update `speckit/project-memory.md` to note 006-tap-to-select complete and new e2e test count

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Foundational)**: Depends on Phase 1 — blocks both user stories
- **Phase 3 (US1)**: Depends on Phase 2 — T005→T006 (confirm fail) → T007+T008 (parallel) → T009→T010→T011→T012→T013
- **Phase 4 (US2)**: Depends on Phase 3 complete — T014→T015 (confirm fail) → T016→T017→T018
- **Phase 5 (Polish)**: Depends on US1 + US2 complete

### User Story Dependencies

- **US1 (P1)**: Independent — no dependency on US2
- **US2 (P2)**: Independent after foundational — can start any time after Phase 2, but logically follows US1

### Within Each User Story

- Tests MUST be written and FAIL before implementation (T005→T006 before T007; T014→T015 before T016)
- T007 (JS) and T008 (CSS) modify different files — parallelisable
- Confirm pass (T012) before committing (T013)

### Parallel Opportunities

- T007 (`src/views/liveView.js: newMatchFormHtml`) and T008 (`styles.css`) — parallelisable
- T019–T030 (test file updates) all modify different files — fully parallelisable after T018

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1 → Phase 2 → Phase 3 (T001–T013)
2. **STOP and VALIDATE**: pick grid works, matches start via taps
3. Ship if deselect is not required

### Full Delivery

1. Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (Polish)
2. Each phase independently testable

---

## Notes

- T007 and T008 are marked [P] — different files, can run in parallel
- T019–T030 are all different test files — can all be dispatched in parallel to subagents
- T031 (dead code removal) should run after T032 (full suite) confirms nothing else uses `playerSelectOptions`
- Same-player match prevention is now structural (button disabled), not a runtime validation — the smoke test covering this case must reflect the new behaviour (T030)

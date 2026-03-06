# Tap-to-Select Players Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace dropdown selects in the new-match form with a tap-to-select player button grid.

**Architecture:** Pure view change in `src/views/liveView.js`. New ephemeral state (`_pickStep`, `_selectedP1`, `_selectedP2`) tracks selection flow. `newMatchFormHtml()` renders a 2-column grid of player buttons instead of `<select>` elements. Click handler routes `pick-player` and `deselect-player` actions. CSS adds grid layout + selected/muted states. All 12 e2e test files with `startMatch` helpers must update to use tap-based selection.

**Tech Stack:** Vanilla JS ES2022+, CSS3, Playwright (e2e), Vitest (unit)

---

### Task 1: Write failing e2e tests for tap-to-select

**Files:**
- Modify: `tests/e2e/us7-new-match-form.test.js`

**Step 1: Write the failing tests**

Replace the AC1 test (which asserts `select[data-start-p1]` exists) and AC2 test (which uses `selectOption`) with tap-to-select versions. Keep AC3 (disabled button) unchanged.

Replace the **entire file** with:

```javascript
/**
 * US7 — New Match Form: Tap-to-Select Players (004-ux-redesign)
 * Tests: + New Match toggle, player pick grid, confirm & start.
 *
 * AC1: Tap + New Match → player pick grid appears with "Pick Player 1:"
 * AC2: Tap two players → confirmation row, submit → new active card
 * AC3: + New Match button is disabled with fewer than 2 players
 * AC4: Tapping a selected pill deselects and goes back a step
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

// ---------------------------------------------------------------------------
// AC1: Tap + New Match → player pick grid with prompt
// ---------------------------------------------------------------------------

test('AC1 — tapping + New Match shows player pick grid', async ({ page }) => {
  await createTournament(page);
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');

  await expect(page.locator('.pick-grid')).not.toBeVisible();

  await page.locator('[data-action="toggle-new-match"]').click();

  // Grid should appear with player buttons
  await expect(page.locator('.pick-grid')).toBeVisible();
  await expect(page.locator('.pick-prompt')).toContainText('Pick Player 1');
  await expect(page.locator('[data-action="pick-player"]')).toHaveCount(2);
});

// ---------------------------------------------------------------------------
// AC2: Tap two players → confirmation, submit → active card
// ---------------------------------------------------------------------------

test('AC2 — picking two players and submitting creates active card', async ({ page }) => {
  await createTournament(page);
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');

  await page.locator('[data-action="toggle-new-match"]').click();

  // Pick Player 1
  await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
  await expect(page.locator('.pick-prompt')).toContainText('Pick Player 2');

  // Pick Player 2
  await page.locator('[data-action="pick-player"]').filter({ hasText: 'Bob' }).click();

  // Confirmation row should show both names
  await expect(page.locator('.pick-confirm')).toBeVisible();
  await expect(page.locator('.pick-confirm')).toContainText('Alice');
  await expect(page.locator('.pick-confirm')).toContainText('Bob');

  // Submit
  await page.locator('#start-match-form button[type="submit"]').click();
  await page.waitForTimeout(100);

  // Form collapsed, active card appears
  await expect(page.locator('#start-match-form')).not.toBeVisible();
  await expect(page.locator('.live-card--active')).toHaveCount(1);
  await expect(page.locator('.live-card--active')).toContainText('Alice');
  await expect(page.locator('.live-card--active')).toContainText('Bob');
});

// ---------------------------------------------------------------------------
// AC3: Button disabled with fewer than 2 players
// ---------------------------------------------------------------------------

test('AC3 — + New Match button is disabled with fewer than 2 players', async ({ page }) => {
  await createTournament(page);
  await addPlayer(page, 'Alice');

  await expect(page.locator('[data-action="toggle-new-match"]')).toBeDisabled();
});

// ---------------------------------------------------------------------------
// AC4: Deselect by tapping selected pill
// ---------------------------------------------------------------------------

test('AC4 — tapping selected pill deselects and returns to previous step', async ({ page }) => {
  await createTournament(page);
  await addPlayer(page, 'Alice');
  await addPlayer(page, 'Bob');
  await addPlayer(page, 'Carol');

  await page.locator('[data-action="toggle-new-match"]').click();

  // Pick Alice as P1
  await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
  await expect(page.locator('.pick-prompt')).toContainText('Pick Player 2');

  // Pick Bob as P2 → confirm step
  await page.locator('[data-action="pick-player"]').filter({ hasText: 'Bob' }).click();
  await expect(page.locator('.pick-confirm')).toBeVisible();

  // Tap Bob pill to deselect → back to Pick Player 2
  await page.locator('[data-action="deselect-player"]').filter({ hasText: 'Bob' }).click();
  await expect(page.locator('.pick-prompt')).toContainText('Pick Player 2');
  await expect(page.locator('.pick-confirm')).not.toBeVisible();

  // Tap Alice pill to deselect → back to Pick Player 1
  await page.locator('[data-action="deselect-player"]').filter({ hasText: 'Alice' }).click();
  await expect(page.locator('.pick-prompt')).toContainText('Pick Player 1');
});
```

**Step 2: Run tests to verify they fail**

Run: `npx playwright test tests/e2e/us7-new-match-form.test.js 2>&1 | tail -15`
Expected: FAIL — `.pick-grid`, `.pick-prompt`, `[data-action="pick-player"]` don't exist yet.

**Step 3: Commit**

```bash
git add tests/e2e/us7-new-match-form.test.js
git commit -m "test: failing e2e tests for tap-to-select player grid"
```

---

### Task 2: Add ephemeral state and rewrite `newMatchFormHtml()`

**Files:**
- Modify: `src/views/liveView.js:12-16` (ephemeral state)
- Modify: `src/views/liveView.js:200-234` (`newMatchFormHtml`)

**Step 1: Add new ephemeral state variables**

At `src/views/liveView.js:15`, after `let _newMatchExpanded = false;`, add:

```javascript
let _pickStep = null;       // null | 1 | 2 | 'confirm'
let _selectedP1 = null;     // player ID
let _selectedP2 = null;     // player ID
```

**Step 2: Reset pick state in `render()`**

At `src/views/liveView.js:297` (inside `render()`), after `_newMatchExpanded = false;`, add:

```javascript
  _pickStep = null;
  _selectedP1 = null;
  _selectedP2 = null;
```

**Step 3: Rewrite `newMatchFormHtml()`**

Replace the entire function at `src/views/liveView.js:200-234` with:

```javascript
function newMatchFormHtml(players) {
  const canStart = players.length >= 2;

  // Collapsed state — just the toggle button
  if (!_newMatchExpanded) {
    return `
      <div class="live-new-match">
        <button class="live-new-match__toggle btn-secondary" type="button" data-action="toggle-new-match" ${canStart ? '' : 'disabled'}>
          ＋ New Match
        </button>
      </div>`;
  }

  // Confirm step — show selected players + target + start
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

  // Pick step 1 or 2 — show player grid
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

**Step 4: Run unit tests — expect some failures but no crashes**

Run: `npm test 2>&1 | tail -10`

---

### Task 3: Add click handlers for `pick-player` and `deselect-player`

**Files:**
- Modify: `src/views/liveView.js:471-475` (`toggle-new-match` handler)
- Modify: `src/views/liveView.js` (add new handlers before `toggle-new-match`)

**Step 1: Update `toggle-new-match` handler to reset pick state**

Replace the `toggle-new-match` block at ~line 471 with:

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

**Step 2: Add `pick-player` handler**

Add this block right before the `toggle-new-match` handler:

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
      } else if (_pickStep === 2 && playerId === _selectedP1) {
        _selectedP1 = null;
        _pickStep = 1;
      }
      refreshNewMatchForm();
      return;
    }
```

**Step 3: Update form submit handler**

Replace the `start-match-form` block at ~line 518 with:

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

**Step 4: Run the us7 tests to see progress**

Run: `npx playwright test tests/e2e/us7-new-match-form.test.js 2>&1 | tail -15`

---

### Task 4: Add CSS for player pick grid

**Files:**
- Modify: `styles.css` (after `.live-new-match__form` block, ~line 1778)

**Step 1: Add the CSS**

Insert after the `.live-new-match__form { ... }` block (before `/* ===== Completed matches */`):

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

**Step 2: Run the us7 e2e tests**

Run: `npx playwright test tests/e2e/us7-new-match-form.test.js 2>&1 | tail -15`
Expected: All 4 tests PASS.

**Step 3: Commit**

```bash
git add src/views/liveView.js styles.css
git commit -m "feat: tap-to-select player grid for new match form"
```

---

### Task 5: Update e2e helper `startMatch` in all other test files

**Files to modify** (each has a local `startMatch` or inline match-start code that uses `selectOption`):
- `tests/e2e/us1-live-monitoring.test.js`
- `tests/e2e/us2-inline-recording.test.js`
- `tests/e2e/us2-end-archive.test.js`
- `tests/e2e/us3-night-leaderboard.test.js`
- `tests/e2e/us3-browse-archive.test.js`
- `tests/e2e/us4-visual-refresh.test.js`
- `tests/e2e/us4-all-time-leaderboard.test.js`
- `tests/e2e/us5-standings-live.test.js`
- `tests/e2e/us5-roster-suggestions.test.js`
- `tests/e2e/t034-validation.test.js`
- `tests/e2e/smoke.spec.js`

**The pattern:** Every file has a helper function (usually `startMatch` or `recordGame`) that does:

```javascript
await page.locator('select[data-start-p1]').selectOption({ label: p1Name });
await page.locator('select[data-start-p2]').selectOption({ label: p2Name });
await page.locator('input[data-start-target]').fill('7');
await page.locator('#start-match-form button[type="submit"]').click();
```

Replace with the tap-to-select equivalent:

```javascript
await page.locator('[data-action="pick-player"]').filter({ hasText: p1Name }).click();
await page.locator('[data-action="pick-player"]').filter({ hasText: p2Name }).click();
await page.locator('input[data-start-target]').fill('7');
await page.locator('#start-match-form button[type="submit"]').click();
```

**Important:** Some files also have inline match-start code (not in a helper). Check the grep results:
- `us3-night-leaderboard.test.js:81,97` — has inline `selectOption` calls
- `smoke.spec.js:129,139,147` — has inline `selectOption` calls

These must ALL be updated to use `pick-player` clicks.

**Special case: `smoke.spec.js:139-140`** — tests same-player validation:
```javascript
await page.locator('select[data-start-p1]').selectOption({ label: 'Alice' });
await page.locator('select[data-start-p2]').selectOption({ label: 'Alice' });
```
This is now impossible by design (same player can't be picked twice — button is disabled after selection). This test should be updated to verify the button is disabled after picking Alice, OR removed if the same-player validation test is no longer meaningful.

**Step 1: Update each file**

Go through each file and replace the dropdown selection pattern with tap-to-select. For each file:
1. Find the `selectOption` calls for `data-start-p1` and `data-start-p2`
2. Replace with `pick-player` clicks using `filter({ hasText: name })`
3. Keep the target fill and submit click unchanged

**Step 2: Handle the same-player smoke test**

In `tests/e2e/smoke.spec.js`, the test at ~line 139 that selects Alice for both P1 and P2 needs updating. Replace with a test that verifies Alice's pick button is disabled after selecting her:

```javascript
// After picking Alice as P1, her button should be disabled
await page.locator('[data-action="toggle-new-match"]').click();
await page.locator('[data-action="pick-player"]').filter({ hasText: 'Alice' }).click();
await expect(page.locator('.pick-btn--selected').filter({ hasText: 'Alice' })).toBeVisible();
// Alice's button should be disabled, preventing same-player match
await expect(page.locator('.pick-btn--selected').filter({ hasText: 'Alice' })).toBeDisabled();
```

**Step 3: Run full e2e suite**

Run: `npx playwright test 2>&1 | tail -15`
Expected: All tests pass (107 total, same count — we replaced tests, didn't add/remove).

**Step 4: Commit**

```bash
git add tests/
git commit -m "test: update all e2e helpers from dropdown to tap-to-select"
```

---

### Task 6: Update unit test

**Files:**
- Modify: `tests/views/liveView.test.js:367-368`

**Step 1: Update the assertion**

Replace:
```javascript
const selects = container.querySelectorAll('select[data-new-p1], select[data-new-p2], select[data-start-p1], select[data-start-p2]');
expect(selects.length).toBeGreaterThanOrEqual(2);
```

With:
```javascript
const pickBtns = container.querySelectorAll('[data-action="pick-player"]');
expect(pickBtns.length).toBeGreaterThanOrEqual(2);
```

**Step 2: Run unit tests**

Run: `npm test 2>&1 | tail -10`
Expected: All 281 tests pass.

**Step 3: Commit**

```bash
git add tests/views/liveView.test.js
git commit -m "test: update unit test for tap-to-select player grid"
```

---

### Task 7: Remove dead code

**Files:**
- Modify: `src/views/liveView.js:57-62`

**Step 1: Remove `playerSelectOptions()` function**

The `playerSelectOptions()` function at line 57-62 is now unused (it only served the old `<select>` elements in `newMatchFormHtml`). Delete it:

```javascript
function playerSelectOptions(players, exclude = []) {
  return players
    .filter((p) => !exclude.includes(p.id))
    .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`)
    .join('');
}
```

**Step 2: Verify no other callers**

Run: `grep -n "playerSelectOptions" src/views/liveView.js`
Expected: No results (0 matches).

**Step 3: Run all tests**

Run: `npm test && npx playwright test 2>&1 | tail -15`
Expected: All pass.

**Step 4: Commit**

```bash
git add src/views/liveView.js
git commit -m "refactor: remove unused playerSelectOptions()"
```

---

### Task 8: Final verification

**Step 1: Run full test suite**

Run: `npm test && npx playwright test 2>&1 | tail -20`
Expected: 281 unit tests pass, ~107 e2e tests pass.

**Step 2: Visual check via Playwright MCP**

Navigate to `http://localhost:3456`, start tournament, add 3 players. Tap "+ New Match", verify grid appears. Tap two names, verify confirm row. Submit, verify active card.

---

## File Summary

| File | Change |
|------|--------|
| `src/views/liveView.js` | Add pick state vars, rewrite `newMatchFormHtml()`, add pick/deselect handlers, update submit handler, remove `playerSelectOptions()` |
| `styles.css` | Add `.pick-panel`, `.pick-prompt`, `.pick-grid`, `.pick-btn`, `.pick-confirm`, `.pick-pill`, `.pick-vs`, `.pick-start-form` |
| `tests/e2e/us7-new-match-form.test.js` | Rewrite all ACs for tap-to-select + add AC4 deselect test |
| `tests/e2e/*.test.js` (11 files) | Update `startMatch` helpers: `selectOption` → `pick-player` clicks |
| `tests/views/liveView.test.js` | Update assertion: `select` → `pick-player` buttons |

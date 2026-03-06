# No-Tournament Empty States Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the broken/invisible "Start a tournament" inline text link with proper empty state UI on the History view (full centred empty state) and a banner on the Club view.

**Architecture:** Both views check `getState().tournament` at render time. History replaces its entire content with an empty-state card when no tournament is active. Club prepends a styled banner above the existing content. CSS adds `.empty-state-card` and `.no-tournament-banner` styles. Tests updated first (TDD).

**Tech Stack:** Vanilla JS ES2022+, HTML5, CSS3. Playwright for e2e tests.

---

### Task 1: History view — write failing e2e tests, then implement

**Files:**
- Modify: `tests/e2e/us3-navigation.test.js`
- Modify: `src/views/gameHistory.js`
- Modify: `styles.css`

---

**Step 1: Update existing test + add new failing tests in `tests/e2e/us3-navigation.test.js`**

Replace the existing `'History view shows a start-tournament CTA when no tournament is active'` test with these two tests:

```javascript
test('History view: no tournament shows full empty state with heading and CTA button', async ({ page }) => {
  await freshStart(page);
  await page.goto('/#/history');

  // Full empty-state card must be present
  await expect(page.locator('.empty-state-card')).toBeVisible();
  // CTA link styled as button must be visible
  await expect(page.locator('.empty-state-card a[href="#/start"]')).toBeVisible();
  // Regular history content must NOT be present
  await expect(page.locator('[data-history-list]')).not.toBeVisible();
});

test('History view: clicking Start a Tournament CTA navigates to start page', async ({ page }) => {
  await freshStart(page);
  await page.goto('/#/history');

  await page.locator('.empty-state-card a[href="#/start"]').click();
  await expect(page.locator('.name-prompt')).toBeVisible();
});
```

**Step 2: Run to confirm they fail**

```bash
npx playwright test tests/e2e/us3-navigation.test.js --grep "History view" 2>&1
```
Expected: 2 FAIL (`.empty-state-card` not found)

**Step 3: Implement in `src/views/gameHistory.js`**

Replace the `render` function:

```javascript
export function render(container) {
  const { matches, players, tournament } = getState();

  if (!tournament) {
    container.innerHTML = `
      <section class="view view--history" aria-label="Game History">
        <div class="empty-state-card">
          <h2>Game History</h2>
          <p>No tournament running. Start one to record matches and games.</p>
          <a href="#/start" class="btn btn-primary">Start a Tournament</a>
        </div>
      </section>`;
    return;
  }

  container.innerHTML = `
    <section class="view view--history" aria-label="Game History">
      <h2>Game History</h2>
      <div data-history-list>
        ${historyHtml(matches, players)}
      </div>
    </section>`;
}
```

**Step 4: Add `.empty-state-card` CSS to `styles.css`**

Add after the existing `.empty-state` rule:

```css
.empty-state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-xl);
  gap: var(--space-md);
  min-height: 40vh;
}

.empty-state-card h2 {
  margin: 0;
}

.empty-state-card p {
  color: var(--color-muted);
  margin: 0;
  max-width: 28ch;
}
```

**Step 5: Run tests to confirm they pass**

```bash
npx playwright test tests/e2e/us3-navigation.test.js --grep "History view" 2>&1
```
Expected: 2 PASS

**Step 6: Commit**

```bash
git add tests/e2e/us3-navigation.test.js src/views/gameHistory.js styles.css
git commit -m "feat: history view full empty state when no tournament active

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Club view — write failing e2e tests, then implement

**Files:**
- Modify: `tests/e2e/us3-navigation.test.js`
- Modify: `src/views/club.js`
- Modify: `styles.css`

---

**Step 1: Update existing test + add new failing tests in `tests/e2e/us3-navigation.test.js`**

Replace the existing `'Club view shows a start-tournament CTA when no tournament is active'` test with these two tests:

```javascript
test('Club view: no tournament shows banner with CTA above existing content', async ({ page }) => {
  await freshStart(page);
  await page.goto('/#/club');

  // Banner must be present
  await expect(page.locator('.no-tournament-banner')).toBeVisible();
  // CTA link inside banner
  await expect(page.locator('.no-tournament-banner a[href="#/start"]')).toBeVisible();
  // Existing content (standings, archive) still visible
  await expect(page.locator('.club-section')).toBeVisible();
});

test('Club view: clicking Start a Tournament banner CTA navigates to start page', async ({ page }) => {
  await freshStart(page);
  await page.goto('/#/club');

  await page.locator('.no-tournament-banner a[href="#/start"]').click();
  await expect(page.locator('.name-prompt')).toBeVisible();
});
```

**Step 2: Run to confirm they fail**

```bash
npx playwright test tests/e2e/us3-navigation.test.js --grep "Club view" 2>&1
```
Expected: 2 FAIL (`.no-tournament-banner` not found)

**Step 3: Implement in `src/views/club.js`**

In the `render` function, replace the existing `ctaHtml` block (the `const ctaHtml = ...` line and `${ctaHtml}` in the template) with:

```javascript
  const bannerHtml = !tournament
    ? `<div class="no-tournament-banner">
        <p>No active tournament.</p>
        <a href="#/start" class="btn btn-primary btn-sm">Start a Tournament</a>
      </div>`
    : '';
```

And in the container template, replace `${ctaHtml}` with `${bannerHtml}`:

```javascript
  container.innerHTML = `
    <section class="view view--club" aria-label="Club">
      ${bannerHtml}
      <div class="club-section">
        ...
```

**Step 4: Add `.no-tournament-banner` CSS to `styles.css`**

Add after `.empty-state-card`:

```css
.no-tournament-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-md);
}

.no-tournament-banner p {
  margin: 0;
  color: var(--color-muted);
  font-size: var(--font-sm);
}
```

**Step 5: Run tests to confirm they pass**

```bash
npx playwright test tests/e2e/us3-navigation.test.js --grep "Club view" 2>&1
```
Expected: 2 PASS

**Step 6: Run full suite**

```bash
npx playwright test 2>&1 | tail -5
```
Expected: all tests pass

**Step 7: Commit**

```bash
git add tests/e2e/us3-navigation.test.js src/views/club.js styles.css
git commit -m "feat: club view banner CTA when no tournament active

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

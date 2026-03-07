# Quickstart: 009 Button Style Consistency

## Prerequisites

```bash
npm install   # installs vitest (dev only)
```

## Run the App

```bash
npx serve .   # serves at http://localhost:3000 (or next available port)
```

Open in a browser. ES modules require a server — do not open `index.html` directly.

## Verify the Changes

1. Start a new tournament (or use an existing one).
2. On the Live view, expand:
   - "Add Player" section → check the "Add" submit button
   - "New Match" section → check the "Start" / "＋ New Match" buttons and player pick grid
   - An active match card → click "Record Game" → check Save/Cancel buttons and pick-winner buttons
3. All interactive buttons should:
   - Be the same height (44px min)
   - Have a pill/rounded shape
   - Fill the full width of their container (action buttons)
   - Use amber for primary actions, red for destructive actions

## Run Tests

```bash
npm test                # Vitest unit tests (no new tests for this feature)
npx playwright test     # Playwright e2e tests
```

## Key Files Changed

| File | What Changed |
|------|-------------|
| `styles.css` | Added `--radius-pill` token; updated `.btn`, `.pick-btn`, `.pick-pill` border-radius |
| `src/views/liveView.js` | Fixed missing `btn` base class + added `btn-full` on action buttons |

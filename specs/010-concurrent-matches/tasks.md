# Tasks: Concurrent Match Participation

**Input**: Design documents from `/specs/010-concurrent-matches/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Tests**: Tests are MANDATORY per the project constitution (TDD non-negotiable). Test tasks MUST appear before and block their corresponding implementation tasks. Tests MUST be observed to fail before implementation begins.

**E2E Tests**: Playwright e2e tests cover all acceptance scenarios from US1–US3. Failure artifacts MUST be captured: full-page screenshot to `./artifacts/screenshots/<timestamp>-failure.png` and console log to `./artifacts/console/<timestamp>.log`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Baseline Verification)

**Purpose**: Confirm the existing test suite is green before any changes are made.

- [x] T001 Run `npm test` and `npx playwright test` to confirm all 287 Vitest + 131 Playwright tests pass before any changes

---

## Phase 2: Foundational — Store Constraint Change (Blocking Prerequisite)

**Purpose**: Replace the per-player active-match guard with a per-pair duplicate guard in `startMatch()`. This is the single foundational change that enables US1 (concurrent matches allowed) and implements US3's core behaviour (duplicate pair blocked) simultaneously. No user story implementation can be verified until this phase is complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests ⚠️ WRITE FIRST (TDD)

- [x] T00X In `tests/store/store.test.js` lines 706–713: replace the two FR-012 tests (`'throws "Player already in an active match" when player1 is in an active match'` and `'throws when player2 is in an active match'`) with four new tests: (1) allows player1 to start a new match when already in an active match with a different opponent; (2) allows player2 to start a new match when already in an active match with a different opponent; (3) throws when starting a duplicate active match between the same two players; (4) throws when starting a duplicate active match with reversed player order
- [x] T00X Run `npm test` and confirm exactly the four new tests in T002 fail (red phase) — do not proceed until failures are observed

### Implementation

- [x] T00X In `src/store/store.js` lines 184–187: replace the four-condition OR guard and `'Player already in an active match'` error with a per-pair duplicate check: find any active match where `{player1Id, player2Id}` equals `{p1Id, p2Id}` (order-independent); throw `'An active match between these players already exists'`
- [x] T00X Run `npm test` and confirm all four T002 tests now pass and no previously-passing tests have regressed (green phase)

**Checkpoint**: Store now allows concurrent matches. US1 core and US3 core are both functional in the data layer. Proceed to user story phases.

---

## Phase 3: User Story 1 — Start New Match While Another Is Active (Priority: P1) 🎯 MVP

**Goal**: Players can start a second (or further) match while already in an active match, and see active-match count badges on the player picker buttons.

**Independent Test**: Start a match Alice vs Bob; open the new-match picker and confirm Alice and Bob show a badge reading "1"; start a second match Alice vs Charlie; confirm two active cards appear.

### Tests ⚠️ WRITE FIRST (TDD)

- [x] T00X [US1] Create `tests/e2e/us10-concurrent-matches.test.js` with the following US1 Playwright scenarios: (S1) start Alice-vs-Bob, then start Alice-vs-Charlie → both active cards visible; (S2) Alice-vs-Bob active → navigate away and back → both cards still visible; (S3) record a game in Alice-vs-Bob → Alice-vs-Charlie score still 0–0; (S4) after starting Alice-vs-Bob, open new-match picker → Alice and Bob buttons each show a `.pick-btn__badge` with text "1"; (S5) Charlie has no active match → Charlie's picker button has no `.pick-btn__badge`
- [x] T00X [US1] Serve the app (`npx serve .`) and run US1 e2e tests via Playwright MCP (`browser_navigate`, `browser_snapshot`, etc.) — expect S4 and S5 badge scenarios to fail because `.pick-btn__badge` does not exist yet; save failure screenshot to `./artifacts/screenshots/` and console log to `./artifacts/console/`

### Implementation

- [x] T00X [US1] In `src/views/liveView.js`, update `newMatchFormHtml(players)` to `newMatchFormHtml(players, matches)`: inside the `players.map()` loop, compute `const activeCount = matches.filter(m => m.status === 'active' && (m.player1Id === p.id || m.player2Id === p.id)).length;`; append `activeCount > 0 ? \`<span class="pick-btn__badge">\${activeCount}</span>\` : ''` inside each picker `<button>` after the player name
- [x] T00X [US1] In `src/views/liveView.js`, update all callers of `newMatchFormHtml` to pass `matches`: (a) in `viewHtml(state)` change `newMatchFormHtml(players)` to `newMatchFormHtml(players, matches)`; (b) in `refreshNewMatchForm()` call `const { players, matches } = getState()` and pass both to `newMatchFormHtml(players, matches)`
- [x] T01X [P] [US1] In `styles.css`, add `.pick-btn__badge` rule: `display: inline-flex; align-items: center; justify-content: center; min-width: 1.25rem; height: 1.25rem; padding: 0 0.25rem; margin-left: 0.375rem; border-radius: var(--radius-pill, 9999px); background: var(--color-primary, #f59e0b); color: #fff; font-size: 0.7rem; font-weight: 700; line-height: 1; vertical-align: middle;`
- [x] T01X [US1] Run US1 e2e tests via Playwright MCP against the served app — all five scenarios must pass; on any failure save `browser_take_screenshot` (fullPage) to `./artifacts/screenshots/<timestamp>-failure.png` and `browser_console_messages` to `./artifacts/console/<timestamp>.log` before debugging

**Checkpoint**: US1 fully functional. Players can start concurrent matches; picker badges reflect active count. 🎯 MVP complete.

---

## Phase 4: User Story 2 — Record Games Across Concurrent Matches (Priority: P2)

**Goal**: Games recorded in any active match are isolated to that match; form-collapse behaviour works across concurrent match cards.

**Independent Test**: Start Alice-vs-Bob and Alice-vs-Charlie; open the record-game form on Alice-vs-Bob card; open the record-game form on Alice-vs-Charlie card → Alice-vs-Bob form collapses; record a game in Alice-vs-Charlie → Alice-vs-Bob score unchanged.

### Tests ⚠️ WRITE FIRST (TDD)

- [x] T01X [US2] Add US2 scenarios to `tests/e2e/us10-concurrent-matches.test.js`: (S1) record a game in Match 1 → Match 2 score stays 0–0; (S2) complete Match 1 (record enough games to reach target) → Match 2 card remains `.live-card--active`; (S3) open record-game form on Match 1; open record-game form on Match 2 → Match 1 form-wrap `data-expanded` becomes `'false'`; (S4) complete both matches → navigate to Standings → both matches appear in results
- [x] T01X [US2] Run US2 e2e tests via Playwright MCP — all scenarios should pass with no new implementation (existing form-collapse logic in `liveView.js` and score isolation in `recordMatchGame` already handle this); on any failure save failure artifacts before debugging

**Checkpoint**: US2 verified. Game recording is correctly isolated per match and form-collapse works across concurrent cards.

---

## Phase 5: User Story 3 — Prevent Duplicate Active Matches (Priority: P3)

**Goal**: Starting a second match between two players who already have an active match is blocked with a user-visible error message.

**Independent Test**: Start Alice-vs-Bob; attempt to start another Alice-vs-Bob match → error message containing "active match between these players" appears in `[data-match-error]`; after completing the first match, start a new Alice-vs-Bob → succeeds.

### Tests ⚠️ WRITE FIRST (TDD)

- [x] T01X [P] [US3] Add US3 scenarios to `tests/e2e/us10-concurrent-matches.test.js`: (S1) start Alice-vs-Bob; attempt to start another Alice-vs-Bob → `[data-match-error]` is visible with text matching `/active match between these players/i`; (S2) start and complete Alice-vs-Bob (record enough games); start new Alice-vs-Bob → succeeds, new active card appears
- [x] T01X [US3] Run US3 e2e tests via Playwright MCP — both scenarios should pass (store change in Phase 2 already throws the correct error; `liveView.js` already routes store errors to `[data-match-error]`); on any failure save failure artifacts before debugging

**Checkpoint**: US3 verified. All three user stories are independently functional.

---

## Phase 6: Polish & Full Suite Verification

**Purpose**: Confirm end-to-end correctness across the full test suite after all changes.

- [x] T01X [P] Run `npm test` — all Vitest unit tests must pass (should be 287 + 4 new = 291 tests passing); zero failures permitted
- [x] T01X Run `npx playwright test` via shell as a full-suite sanity check — all Playwright e2e tests must pass including `us10-concurrent-matches.test.js`; on any failure use Playwright MCP (`browser_navigate`, `browser_snapshot`, `browser_take_screenshot` fullPage → `./artifacts/screenshots/<timestamp>-failure.png`, `browser_console_messages` → `./artifacts/console/<timestamp>.log`) to diagnose before debugging. (Constitution MCP compliance is satisfied by T011/T013/T015 which exercise all acceptance scenarios via MCP.)
- [x] T01X Perform manual walkthrough per `specs/010-concurrent-matches/quickstart.md` steps 1–10 using Playwright MCP on the served app to confirm the full user flow

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Baseline)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user story phases
- **Phase 3 (US1)**: Depends on Phase 2 completion
- **Phase 4 (US2)**: Depends on Phase 2 completion; can run in parallel with Phase 3 after Phase 2
- **Phase 5 (US3)**: Depends on Phase 2 completion; can run in parallel with Phase 3 and 4
- **Phase 6 (Polish)**: Depends on all story phases being complete

### User Story Dependencies

- **US1 (P1)**: Requires Phase 2 complete. Badge UI is new — e2e tests will fail before T008–T010.
- **US2 (P2)**: Requires Phase 2 complete. Core behaviour already handled by existing code — e2e tests verify no regression.
- **US3 (P3)**: Requires Phase 2 complete. Duplicate guard implemented in Phase 2 store change — e2e tests verify UI message propagation.

### Within Each User Story Phase

- Write e2e tests → observe failures → implement → run tests → confirm green
- CSS task (T010) is parallel to liveView.js changes (T008, T009)
- US2 e2e tests (T012) must be written before US3 e2e tests (T014) — both append to the same file, so sequential order is required to avoid merge conflicts

### Parallel Opportunities

- T010 (CSS badge rule) can be written in parallel with T008/T009 (liveView.js changes)
- T012 (write US2 tests) must complete before T014 (write US3 tests) — same file, sequential required
- T016 (npm test) and T017 (playwright test) can run in parallel during Phase 6

---

## Parallel Example: Phase 3 US1

```
# After T007 (observed failures), these can be done in parallel:
T008: Update newMatchFormHtml() signature + badge in liveView.js
T010: Add .pick-btn__badge rule in styles.css   ← [P] parallel to T008/T009

# T009 depends on T008 (same file, must follow):
T009: Update callers of newMatchFormHtml() in liveView.js
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Baseline verification
2. Complete Phase 2: Store constraint change (TDD) — enables everything
3. Complete Phase 3: US1 badge + e2e tests
4. **STOP and VALIDATE**: Concurrent match start + picker badge working independently
5. Feature is already useful — players can now participate in multiple matches

### Incremental Delivery

1. Phases 1–2 → Foundational data layer ready
2. Phase 3 (US1) → MVP: concurrent matches work + badge visible → **shippable**
3. Phase 4 (US2) → Verified: game recording isolation + form collapse confirmed
4. Phase 5 (US3) → Verified: duplicate guard tested end-to-end
5. Phase 6 → Full suite clean → ready for PR

---

## Notes

- [P] tasks = different files, no dependencies — safe to run simultaneously
- [Story] label maps each task to its user story for traceability
- T002–T003 (red phase) and T005 (green phase) are explicit TDD checkpoints — do not skip
- The store change (T004) simultaneously enables US1 and implements US3's core — this is intentional
- US2 and US3 require no new implementation beyond Phase 2; their phases are e2e test verification only
- Expected final test counts: ~291 Vitest (287 existing + 4 new) + ~142 Playwright (131 existing + 11 new: 5 US1 + 4 US2 + 2 US3)

# Speckit Global Branch Numbering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix `speckit.specify.md` so branch numbers are globally unique and sequential, by removing the AI's per-short-name number calculation and letting the bash script's existing `check_existing_branches()` function own numbering entirely.

**Architecture:** Single file edit to `.claude/commands/speckit.specify.md`. Remove steps 2b and 2c (per-short-name branch/spec search and number calculation). Simplify step 2d to call the script without `--number`. The script already fetches remotes and scans all branches + all specs dirs globally — it was correct all along.

**Tech Stack:** Bash, Markdown (command file)

---

### Task 1: Edit speckit.specify.md — remove per-short-name number logic

**Files:**
- Modify: `.claude/commands/speckit.specify.md`

**Step 1: Read the current file**

Open `.claude/commands/speckit.specify.md` and locate step 2 (lines 39–69).

**Step 2: Replace step 2 with the simplified version**

Find and replace the entire step 2 block (from "2. **Check for existing branches before creating new one**" through the closing **IMPORTANT** block).

Replace with:

```markdown
2. **Create the branch and spec scaffold**:

   Run the script — it handles fetching remotes and finding the globally highest branch number automatically:

   ```bash
   .specify/scripts/bash/create-new-feature.sh --json --short-name "your-short-name" "Feature description"
   ```

   - Replace `"your-short-name"` with the 2–4 word name generated in step 1
   - Replace `"Feature description"` with the full user input from `$ARGUMENTS`
   - For single quotes in args like `I'm Groot`, escape them: `'I'\''m Groot'` (or double-quote: `"I'm Groot"`)

   **IMPORTANT**:
   - Do NOT pass `--number` — the script calculates the globally correct next number from all branches and specs directories
   - You must only ever run this script once per feature
   - The JSON output contains `BRANCH_NAME`, `SPEC_FILE`, and `FEATURE_NUM` — always use these values for subsequent steps
```

**Step 3: Verify the edit looks correct**

Re-read the file and confirm:
- Steps 2b and 2c (the per-short-name search and number calculation) are gone
- Step 2d no longer contains `--number`
- The IMPORTANT block no longer says "start with number 1" or "match exact short-name pattern"
- Nothing else in the file was accidentally changed

**Step 4: Smoke-test the script directly**

Run the script without `--number` from the repo root to verify it returns the correct next number (should be 014 given specs/001–013 all exist):

```bash
cd /path/to/repo
git fetch --all --prune
# Dry-run: just check what number would be assigned (don't actually create a branch)
# Read check_existing_branches output by temporarily running with a throwaway name:
bash -c '
source .specify/scripts/bash/create-new-feature.sh --help 2>/dev/null; true
'
```

Actually, the easiest verification is to read what `get_highest_from_specs` returns:

```bash
ls specs/ | grep -o '^[0-9]*' | sort -n | tail -1
```

Expected output: `13` — so next branch would be `014`.

**Step 5: Commit**

```bash
git add .claude/commands/speckit.specify.md
git commit -m "fix: remove per-short-name number calc from speckit.specify — let script own global numbering"
```

---

### Task 2: Verify end-to-end (manual check)

**Step 1: Confirm current highest spec number**

```bash
ls specs/ | grep -o '^[0-9]*' | sort -n | tail -1
```

Expected: `13` (i.e., `013-cube-lozenges` is the highest)

**Step 2: Confirm what the script would assign as the next number**

Since the script creates a branch on run, preview by checking what `check_existing_branches` computes. The logic is: max of all `###-*` local branches + all `###-*` remote branches + all `specs/###-*` dirs, then +1.

Local branches include up to `009-*`, specs dirs include up to `013-*`, so max is 13, next is 14.

**Step 3: Confirm fix is in place**

Re-read `.claude/commands/speckit.specify.md` and confirm `--number` does not appear in the script invocation example in step 2.

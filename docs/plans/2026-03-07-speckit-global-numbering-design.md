# Design: Fix speckit.specify Global Branch Numbering

**Date**: 2026-03-07
**Status**: Approved

## Problem

`/speckit.specify` was generating branch numbers that restart at `001` for new feature names, causing collisions with previously used numbers (e.g., `001-auto-name-tournament` after `001-tournament-tracker` was already merged).

**Root cause**: `speckit.specify.md` step 2b searches only for branches and spec directories matching the *specific short-name* being created. When no match is found, it starts at 1 and passes `--number 1` to the script, bypassing the script's own global numbering logic.

## Solution

Remove the `--number` argument from the AI instruction in `speckit.specify.md`. Let `create-new-feature.sh` own branch number calculation entirely.

The script's `check_existing_branches()` already implements correct global numbering:
- Scans all local branches (`git branch -a`)
- Scans all remote branches (after `git fetch --all --prune`)
- Scans all `specs/` subdirectories
- Returns `max(all numbers found) + 1`

This handles branches deleted after PR merges, fresh clones with sparse remote history, and local-only branches.

## Changes

**One file**: `.claude/commands/speckit.specify.md`

- Remove step 2b (per-short-name number search)
- Remove step 2c (next number calculation)
- Simplify step 2d: run the script with `--short-name` only (no `--number`)
- Read `BRANCH_NAME`, `SPEC_FILE`, `FEATURE_NUM` from the script's JSON output

## What Does Not Change

- `create-new-feature.sh` — no changes
- Branch naming format (`NNN-short-name`)
- All other speckit commands
- The rest of the speckit.specify workflow

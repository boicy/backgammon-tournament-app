# Data Model: Cancel New Match Creation (011)

## Summary

No data model changes. No new localStorage keys. No new model files.

This feature modifies only ephemeral module-level UI state in `src/views/liveView.js`.

---

## Ephemeral State (liveView.js module scope)

These variables already exist. The feature changes their transitions, not their structure.

| Variable | Type | Values | Notes |
|----------|------|--------|-------|
| `_pickStep` | `null \| 1 \| 2 \| 'confirm'` | null = closed, 1 = picking P1, 2 = picking P2, 'confirm' = confirm screen | Cancel resets to `null`; step-back deselect resets to `1` |
| `_selectedP1` | `string \| null` | playerId or null | Cleared by cancel and deselect |
| `_selectedP2` | `string \| null` | playerId or null | Cleared by cancel and confirm-step deselect |
| `_newMatchExpanded` | `boolean` | true/false | Set to `false` by cancel; unchanged by deselect |

No new variables introduced. No localStorage reads or writes.

---

## State Transition Table

| Current State | Action | Next State |
|---------------|--------|------------|
| Any step, form open | `cancel-new-match` | `_pickStep=null`, `_selectedP1=null`, `_selectedP2=null`, `_newMatchExpanded=false` |
| `_pickStep===2` | `deselect-player` (P1) | `_pickStep=1`, `_selectedP1=null` |
| `_pickStep==='confirm'` | `deselect-player` (any) | `_pickStep=1`, `_selectedP1=null`, `_selectedP2=null` |
| Form open, any state | `toggle-new-match` (close) | `_pickStep=null`, `_selectedP1=null`, `_selectedP2=null`, `_newMatchExpanded=false` |

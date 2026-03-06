# Data Model: 004-ux-redesign

**Date**: 2026-03-06

## Overview

No data model changes. All existing entities (Tournament, Player, Match, Game, Standing, Snapshot) are unchanged. The localStorage keys and format are identical to 003-match-mode.

## View-Local State (not persisted)

The Live view introduces ephemeral UI state that is NOT stored in localStorage or the centralized store:

### Expanded Card ID
- **Type**: `string | null`
- **Purpose**: Tracks which match card's inline game form is currently expanded
- **Default**: `null` (all cards collapsed)
- **Behavior**: Setting a new ID collapses the previous card and expands the new one. Setting `null` collapses all.
- **Lifecycle**: Resets to `null` on view mount/unmount. Not persisted across navigation.

### Collapsible Section State
- **Sections**: Player roster, Add player input, New match form
- **Type**: `boolean` per section
- **Default**: All collapsed (`false`)
- **Behavior**: Toggle on user interaction. Independent of each other (multiple can be open).
- **Lifecycle**: Resets to collapsed on view mount. Not persisted.

### Hamburger Menu State
- **Type**: `boolean`
- **Default**: Closed (`false`)
- **Behavior**: Toggle on ☰ click. Closes on: menu item click, outside click, nav tab click.
- **Lifecycle**: Resets to closed on navigation. Not persisted.

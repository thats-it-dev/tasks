# Local-First Sync Infrastructure Design

## Overview

Add local-first sync infrastructure to the frontend template. Every app using this template will work offline and sync to a backend service for backup and multi-device support.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  App (notes, tasks, etc.)                               │
│  ├── Dexie tables with Syncable fields                  │
│  ├── syncConfig: { appId, tables }                      │
│  └── Server-side entity support (model, schema, router) │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Template Infrastructure                                │
│  ├── SyncEngine (push/pull for configured tables)       │
│  ├── SyncProvider (React context, token management)     │
│  ├── Dexie hooks (auto-mark _syncStatus: 'pending')     │
│  ├── AuthPanel (magic link, OTP, signup flow)           │
│  └── CommandPalette (minimal shell with ⌘K)             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Sync Server (sync.thatsit.app)                         │
│  └── Entity-specific models, schemas, routes            │
└─────────────────────────────────────────────────────────┘
```

## What Goes Into frontend-template

### 1. Sync Infrastructure (`src/sync/`)

| File | Purpose |
|------|---------|
| `api.ts` | Auth functions (start, signup, OTP, magic link) + SyncApiClient |
| `engine.ts` | SyncEngine - generalized to iterate configured tables |
| `hooks.ts` | Dexie hooks - auto-mark pending on any syncable table |
| `provider.tsx` | SyncProvider with token refresh, auth error handling |
| `offline.ts` | `useOnlineStatus` hook |
| `index.ts` | Exports |

**Key generalization:** SyncEngine and hooks currently hardcoded to `db.notes`. Need to iterate `syncConfig.tables` instead.

### 2. Auth UI (`src/components/`)

| File | Purpose |
|------|---------|
| `AuthPanel.tsx` | Full login flow: email → signup/OTP → verify |
| `AuthPanel.css` | Styles (cleaned up from SettingsPanel.css) |

### 3. Command Palette (`src/components/`)

| File | Purpose |
|------|---------|
| `CommandPalette.tsx` | Minimal shell with ⌘K shortcut |

**Content:**
- Commands group (empty placeholder for apps)
- Settings group (Login/Logout only)

Apps add their own groups and items.

### 4. Store (`src/store/appStore.ts`)

Minimal store with:
- `commandPaletteOpen` / `setCommandPaletteOpen`
- `authPanelOpen` / `setAuthPanelOpen`

Apps extend with their own state.

### 5. Config (`src/lib/syncConfig.ts`)

```typescript
export const syncConfig = {
  appId: 'my-app',        // Identifies app to sync server
  tables: ['items'],       // Dexie tables to sync
  syncUrl: 'https://sync.thatsit.app',
};
```

### 6. Types (`src/lib/types.ts`)

```typescript
export type SyncStatus = 'synced' | 'pending' | 'conflict';

export interface Syncable {
  _syncStatus: SyncStatus;
  _localUpdatedAt: Date;
  deletedAt?: Date;
}
```

### 7. Database Pattern (`src/lib/db.ts`)

Example Dexie setup showing how to add sync fields to tables.

## Notes App Cleanup

While extracting code, clean up the notes app:

### Remove Dead Code
- `TaskPanel.tsx` + `TaskPanel.css` - not imported anywhere
- `taskOperations.ts` - check if used, remove if not
- Store: `taskPanelOpen`, `taskFilter`, `selectedTags`, and related actions

### Refactor CommandPalette
- Extract `SwipeableNoteItem` to `src/components/SwipeableNoteItem.tsx`
- Extract `MarqueeTitle` to `src/components/MarqueeTitle.tsx`
- Keep CommandPalette focused on palette structure

### Rename for Clarity
- `SettingsPanel.tsx` → `AuthPanel.tsx` (it's really just auth now)
- `settingsPanelOpen` → `authPanelOpen` in store

### Clean Up CSS
Remove unused classes from SettingsPanel.css:
- `.settings-danger-zone`, `.settings-danger-description`
- `.dialog-overlay`, `.dialog`, `.dialog-title`, `.dialog-message`, `.dialog-actions`

## Server Implications

Adding a new entity type requires server-side changes:
1. SQLAlchemy model (`src/models/`)
2. Pydantic schemas (`src/schemas/`)
3. Update `sync.py` router to handle new type
4. Database migration

This is intentional - we get typed schemas, field-level merge, and SQL queryability.

## Future: Node Module

Keep code organized for eventual extraction to a shared npm package:
- Sync infrastructure in `src/sync/` - self-contained
- Types in `src/lib/types.ts` - minimal dependencies
- Components use `@thatsit/ui` - already external

## Implementation Steps

### Phase 1: Template Setup
1. Create `src/sync/` directory structure
2. Copy and generalize `api.ts` (no changes needed)
3. Copy and generalize `engine.ts` (iterate configured tables)
4. Copy and generalize `hooks.ts` (hook all syncable tables)
5. Copy `provider.tsx` and `offline.ts`
6. Create `syncConfig.ts`
7. Create base `types.ts` with Syncable interface
8. Create example `db.ts`

### Phase 2: Auth UI
1. Copy `SettingsPanel.tsx` → `AuthPanel.tsx`
2. Clean CSS, copy as `AuthPanel.css`
3. Update imports

### Phase 3: Command Palette
1. Create minimal `CommandPalette.tsx` shell
2. Add to store

### Phase 4: Notes Cleanup
1. Delete `TaskPanel.tsx`, `TaskPanel.css`
2. Check and delete `taskOperations.ts` if unused
3. Remove task-related store state
4. Extract `SwipeableNoteItem.tsx` and `MarqueeTitle.tsx`
5. Rename `SettingsPanel` → `AuthPanel`
6. Clean up CSS
7. Update store naming

### Phase 5: Verify
1. Run notes app, verify sync still works
2. Run frontend-template, verify it builds

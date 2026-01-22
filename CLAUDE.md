# Tasks App - Development Guide

## Overview

Minimal task tracking app with natural language input. Local-first, offline-capable, optional sync.

## Key Features

- Natural language task creation with #tags and due:dates
- Smart grouping (Due Today / Due Later)
- Inline editing
- Completed tasks sink to bottom
- Optional sync with sync.thatsit.app

## Architecture

- **Data Layer**: Dexie (IndexedDB) for local storage
- **State**: Zustand for reactive state management
- **Parser**: Natural language parsing for tags/dates
- **UI**: React components with Tailwind CSS
- **Sync**: Optional integration with sync backend

## Important Files

- `src/lib/parser.ts` - Natural language parsing
- `src/lib/taskOperations.ts` - CRUD operations
- `src/store/taskStore.ts` - Global state
- `src/components/TaskItem.tsx` - Individual task UI
- `src/components/TaskList.tsx` - Grouped task display

## Development Guidelines

- ALWAYS use @thatsit/ui components when available
- Keep task creation simple (one input field)
- Preserve natural language in task.title for editing
- Completed tasks sort to bottom but stay in same group
- Use date-fns for all date operations
- All operations must update _syncStatus for future sync

## Testing

Run tests before committing:

```bash
pnpm test
```

Key test files:
- `src/lib/parser.test.ts` - Parser correctness
- `src/lib/taskOperations.test.ts` - CRUD operations

## Useful Commands

- `pnpm install` - Install dependencies
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm test` - Run tests

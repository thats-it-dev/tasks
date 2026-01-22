# Tasks, that's it

A minimal, elegant task tracking app. Local-first with optional sync.

## Features

- **Natural language input**: Type "Buy milk #groceries due:tomorrow" and it just works
- **Local-first**: All tasks stored in your browser, works offline
- **Smart grouping**: Due Today and Due Later sections
- **Quick capture**: One input field, press Enter, done
- **Inline editing**: Click any task to edit it
- **Optional sync**: Connect to sync.thatsit.app for multi-device access

## Usage

### Create Tasks

Type in the input field and press Enter:

- `Buy milk #groceries` - Simple task with tag
- `Submit report due:today` - Task due today
- `Call mom due:tomorrow` - Task due tomorrow
- `Meeting #work due:4/15` - Task due on specific date
- `Review PR #urgent due:monday` - Task due next Monday

### Due Date Formats

- `today`, `tomorrow`
- `monday`, `tuesday`, etc. (next occurrence)
- `4/15`, `12/25` (M/D format)
- `2026-04-15` (ISO format)

### Managing Tasks

- **Complete**: Click the circle checkbox
- **Edit**: Click the task text, modify, press Enter
- **Delete**: Hover and click the trash icon

## Development

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## Tech Stack

- React 19 + TypeScript
- Vite
- Dexie (IndexedDB wrapper)
- Zustand (state management)
- date-fns (date parsing)
- Tailwind CSS

## Architecture

Local-first architecture with optional sync:

1. **Local Storage**: Tasks stored in IndexedDB via Dexie
2. **State Management**: Zustand for reactive UI
3. **Natural Language**: Parser extracts tags and due dates
4. **Grouping**: Smart grouping by due date with sorting
5. **Optional Sync**: Connect to sync backend for multi-device

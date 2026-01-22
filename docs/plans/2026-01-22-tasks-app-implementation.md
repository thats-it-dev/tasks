# Tasks App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a minimal, elegant task tracking app with natural language input, local-first storage, and optional sync.

**Architecture:** React + TypeScript + Dexie (IndexedDB) + Zustand + @thatsit/ui components. Natural language parser for tags and due dates. Two-group UI (Due Today / Due Later) with completed tasks at bottom.

**Tech Stack:** React 19, Vite, TypeScript, Dexie, Zustand, date-fns, lucide-react, @thatsit/ui, Vitest

---

## Phase 1: Core Data Layer

### Task 1.1: Define Task Type

**Files:**
- Modify: `src/lib/types.ts`

**Step 1: Add Task interface to types.ts**

Replace the example `Syncable` interface with our Task model:

```typescript
export type SyncStatus = 'synced' | 'pending' | 'conflict';

export interface Task {
  id: string;
  title: string;                 // Raw input: "Buy milk #groceries due:tomorrow"
  displayTitle: string;          // Display text: "Buy milk #groceries"
  tags: string[];                // Extracted tags: ["groceries"]
  dueDate?: Date;                // Parsed from due:xxx
  completed: boolean;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;

  // Sync tracking
  deletedAt?: Date;
  _syncStatus: SyncStatus;
  _localUpdatedAt: Date;

  // Cross-app reference
  noteId?: string;               // If task came from notes app
  appType: 'tasks' | 'notes';    // Which app created it
}

export interface SyncMeta {
  key: string;
  value: string;
}
```

**Step 2: Commit**

```bash
cd /Users/michael/project-52/tasks
git add src/lib/types.ts
git commit -m "feat: define Task interface"
```

### Task 1.2: Setup Database Schema

**Files:**
- Modify: `src/lib/db.ts`

**Step 1: Replace example schema with TasksDatabase**

```typescript
import Dexie, { type Table } from 'dexie';
import type { Task, SyncMeta } from './types';

export class TasksDatabase extends Dexie {
  tasks!: Table<Task, string>;
  syncMeta!: Table<SyncMeta, string>;

  constructor() {
    super('TasksDatabase');

    // Version 1: Initial schema
    this.version(1).stores({
      tasks: 'id, completed, dueDate, _syncStatus, deletedAt, createdAt, updatedAt, *tags',
      syncMeta: 'key',
    });
  }
}

export const db = new TasksDatabase();

/**
 * Serialization for sync backend
 */
export function serializeTask(task: Task): Record<string, unknown> {
  return {
    title: task.title,
    displayTitle: task.displayTitle,
    tags: task.tags,
    dueDate: task.dueDate?.toISOString(),
    completed: task.completed,
    completedAt: task.completedAt?.toISOString(),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    noteId: task.noteId,
    appType: task.appType,
  };
}

/**
 * Deserialization from sync backend
 */
export function deserializeTask(
  data: Record<string, unknown>,
  existing?: Task
): Partial<Task> {
  return {
    title: (data.title as string) || existing?.title || '',
    displayTitle: (data.displayTitle as string) || existing?.displayTitle || '',
    tags: (data.tags as string[]) || existing?.tags || [],
    dueDate: data.dueDate ? new Date(data.dueDate as string) : existing?.dueDate,
    completed: (data.completed as boolean) ?? existing?.completed ?? false,
    completedAt: data.completedAt ? new Date(data.completedAt as string) : existing?.completedAt,
    createdAt: data.createdAt ? new Date(data.createdAt as string) : existing?.createdAt || new Date(),
    updatedAt: data.updatedAt ? new Date(data.updatedAt as string) : new Date(),
    noteId: (data.noteId as string) || existing?.noteId,
    appType: ((data.appType as 'tasks' | 'notes') || existing?.appType || 'tasks'),
  };
}
```

**Step 2: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat: setup TasksDatabase schema with sync serialization"
```

### Task 1.3: Install Date Parsing Library

**Files:**
- Modify: `package.json` (via pnpm)

**Step 1: Install date-fns**

```bash
cd /Users/michael/project-52/tasks
pnpm add date-fns
```

**Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "deps: add date-fns for date parsing"
```

### Task 1.4: Write Parser Tests

**Files:**
- Create: `src/lib/parser.test.ts`

**Step 1: Write failing parser tests**

```typescript
import { describe, test, expect } from 'vitest';
import { parseTaskInput } from './parser';
import { startOfDay, addDays } from 'date-fns';

describe('parseTaskInput', () => {
  test('extracts single tag', () => {
    const result = parseTaskInput('Buy milk #groceries');
    expect(result.displayTitle).toBe('Buy milk #groceries');
    expect(result.tags).toEqual(['groceries']);
    expect(result.dueDate).toBeNull();
  });

  test('extracts multiple tags', () => {
    const result = parseTaskInput('Fix bug #work #urgent');
    expect(result.tags).toEqual(['work', 'urgent']);
  });

  test('parses due:today', () => {
    const result = parseTaskInput('Submit report due:today');
    const today = startOfDay(new Date());
    expect(result.dueDate?.getTime()).toBe(today.getTime());
    expect(result.displayTitle).toBe('Submit report');
  });

  test('parses due:tomorrow', () => {
    const result = parseTaskInput('Call client due:tomorrow');
    const tomorrow = startOfDay(addDays(new Date(), 1));
    expect(result.dueDate?.getTime()).toBe(tomorrow.getTime());
    expect(result.displayTitle).toBe('Call client');
  });

  test('parses due:YYYY-MM-DD', () => {
    const result = parseTaskInput('Project deadline due:2026-04-15');
    expect(result.dueDate?.toISOString().split('T')[0]).toBe('2026-04-15');
  });

  test('parses due:M/D format', () => {
    const result = parseTaskInput('Tax deadline due:4/15');
    const year = new Date().getFullYear();
    expect(result.dueDate?.getMonth()).toBe(3); // April (0-indexed)
    expect(result.dueDate?.getDate()).toBe(15);
  });

  test('handles no due date', () => {
    const result = parseTaskInput('Someday task #personal');
    expect(result.dueDate).toBeNull();
  });

  test('handles tags and due date together', () => {
    const result = parseTaskInput('Buy milk #groceries due:tomorrow');
    expect(result.displayTitle).toBe('Buy milk #groceries');
    expect(result.tags).toEqual(['groceries']);
    expect(result.dueDate).not.toBeNull();
  });

  test('handles empty input', () => {
    const result = parseTaskInput('');
    expect(result.displayTitle).toBe('');
    expect(result.tags).toEqual([]);
    expect(result.dueDate).toBeNull();
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd /Users/michael/project-52/tasks
pnpm test parser.test.ts
```

Expected: FAIL - "Cannot find module './parser'"

**Step 3: Commit**

```bash
git add src/lib/parser.test.ts
git commit -m "test: add parser tests (failing)"
```

### Task 1.5: Implement Parser

**Files:**
- Create: `src/lib/parser.ts`

**Step 1: Implement parseTaskInput function**

```typescript
import { startOfDay, addDays, parse, isValid } from 'date-fns';

export interface ParsedTask {
  displayTitle: string;
  tags: string[];
  dueDate: Date | null;
}

/**
 * Parse task input with natural language:
 * "Buy milk #groceries due:tomorrow"
 * → displayTitle: "Buy milk #groceries"
 * → tags: ["groceries"]
 * → dueDate: tomorrow's date
 */
export function parseTaskInput(input: string): ParsedTask {
  let text = input.trim();
  const tags: string[] = [];
  let dueDate: Date | null = null;

  // Extract due:xxx
  const dueMatch = text.match(/due:(\S+)/i);
  if (dueMatch) {
    dueDate = parseDueDate(dueMatch[1]);
    // Remove due:xxx from display
    text = text.replace(/due:\S+/i, '').trim();
  }

  // Extract #tags (but keep them in displayTitle)
  const tagMatches = text.matchAll(/#(\w+)/g);
  for (const match of tagMatches) {
    tags.push(match[1]);
  }

  return {
    displayTitle: text,
    tags,
    dueDate,
  };
}

/**
 * Parse due date from various formats:
 * - today, tomorrow
 * - monday, tuesday, etc (next occurrence)
 * - 4/15, 12/25 (M/D)
 * - 2026-04-15 (ISO)
 */
function parseDueDate(input: string): Date | null {
  const normalized = input.toLowerCase();
  const today = startOfDay(new Date());

  // Relative dates
  if (normalized === 'today') {
    return today;
  }
  if (normalized === 'tomorrow') {
    return addDays(today, 1);
  }

  // Weekday names (next occurrence)
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = weekdays.indexOf(normalized);
  if (dayIndex !== -1) {
    const currentDay = today.getDay();
    const daysUntil = (dayIndex - currentDay + 7) % 7 || 7; // next occurrence
    return addDays(today, daysUntil);
  }

  // Try ISO format (YYYY-MM-DD)
  let parsed = parse(input, 'yyyy-MM-dd', today);
  if (isValid(parsed)) {
    return startOfDay(parsed);
  }

  // Try M/D format (assume current or next year)
  parsed = parse(input, 'M/d', today);
  if (isValid(parsed)) {
    const result = startOfDay(parsed);
    // If date is in the past, assume next year
    if (result < today) {
      result.setFullYear(result.getFullYear() + 1);
    }
    return result;
  }

  // Couldn't parse
  return null;
}
```

**Step 2: Run tests to verify they pass**

```bash
pnpm test parser.test.ts
```

Expected: PASS (all tests)

**Step 3: Commit**

```bash
git add src/lib/parser.ts
git commit -m "feat: implement task parser with natural language dates"
```

## Phase 2: Task Operations

### Task 2.1: Write Task Operations Tests

**Files:**
- Create: `src/lib/taskOperations.test.ts`

**Step 1: Write failing tests for CRUD operations**

```typescript
import { describe, test, expect, beforeEach } from 'vitest';
import { addTask, updateTask, toggleTask, deleteTask, getAllTasks } from './taskOperations';
import { db } from './db';

describe('taskOperations', () => {
  beforeEach(async () => {
    // Clear database before each test
    await db.tasks.clear();
  });

  test('addTask creates task with parsed data', async () => {
    const task = await addTask('Buy milk #groceries due:tomorrow');

    expect(task.id).toBeDefined();
    expect(task.title).toBe('Buy milk #groceries due:tomorrow');
    expect(task.displayTitle).toBe('Buy milk #groceries');
    expect(task.tags).toEqual(['groceries']);
    expect(task.dueDate).not.toBeNull();
    expect(task.completed).toBe(false);
    expect(task.appType).toBe('tasks');
    expect(task._syncStatus).toBe('pending');
  });

  test('toggleTask completes and uncompletes task', async () => {
    const task = await addTask('Test task');

    // Complete it
    const completed = await toggleTask(task.id);
    expect(completed.completed).toBe(true);
    expect(completed.completedAt).toBeDefined();

    // Uncomplete it
    const uncompleted = await toggleTask(task.id);
    expect(uncompleted.completed).toBe(false);
    expect(uncompleted.completedAt).toBeUndefined();
  });

  test('updateTask modifies task fields', async () => {
    const task = await addTask('Original title');

    const updated = await updateTask(task.id, {
      title: 'Updated title #new',
      displayTitle: 'Updated title #new',
      tags: ['new'],
    });

    expect(updated.title).toBe('Updated title #new');
    expect(updated.tags).toEqual(['new']);
    expect(updated._syncStatus).toBe('pending');
  });

  test('deleteTask soft deletes task', async () => {
    const task = await addTask('Task to delete');

    await deleteTask(task.id);

    const deleted = await db.tasks.get(task.id);
    expect(deleted?.deletedAt).toBeDefined();
    expect(deleted?._syncStatus).toBe('pending');
  });

  test('getAllTasks excludes deleted tasks', async () => {
    await addTask('Task 1');
    const task2 = await addTask('Task 2');
    await addTask('Task 3');

    await deleteTask(task2.id);

    const tasks = await getAllTasks();
    expect(tasks.length).toBe(2);
  });
});
```

**Step 2: Run tests**

```bash
pnpm test taskOperations.test.ts
```

Expected: FAIL - "Cannot find module './taskOperations'"

**Step 3: Commit**

```bash
git add src/lib/taskOperations.test.ts
git commit -m "test: add task operations tests (failing)"
```

### Task 2.2: Implement Task Operations

**Files:**
- Create: `src/lib/taskOperations.ts`

**Step 1: Implement CRUD operations**

```typescript
import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import { parseTaskInput } from './parser';
import type { Task } from './types';

/**
 * Create a new task from natural language input
 */
export async function addTask(input: string): Promise<Task> {
  const parsed = parseTaskInput(input);
  const now = new Date();

  const task: Task = {
    id: uuidv4(),
    title: input,
    displayTitle: parsed.displayTitle,
    tags: parsed.tags,
    dueDate: parsed.dueDate || undefined,
    completed: false,
    createdAt: now,
    updatedAt: now,
    _syncStatus: 'pending',
    _localUpdatedAt: now,
    appType: 'tasks',
  };

  await db.tasks.add(task);
  return task;
}

/**
 * Toggle task completion status
 */
export async function toggleTask(id: string): Promise<Task> {
  const task = await db.tasks.get(id);
  if (!task) {
    throw new Error(`Task not found: ${id}`);
  }

  const now = new Date();
  const updates: Partial<Task> = {
    completed: !task.completed,
    completedAt: !task.completed ? now : undefined,
    updatedAt: now,
    _syncStatus: 'pending',
    _localUpdatedAt: now,
  };

  await db.tasks.update(id, updates);
  return { ...task, ...updates };
}

/**
 * Update task fields
 */
export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const task = await db.tasks.get(id);
  if (!task) {
    throw new Error(`Task not found: ${id}`);
  }

  const now = new Date();
  const fullUpdates: Partial<Task> = {
    ...updates,
    updatedAt: now,
    _syncStatus: 'pending',
    _localUpdatedAt: now,
  };

  await db.tasks.update(id, fullUpdates);
  return { ...task, ...fullUpdates };
}

/**
 * Soft delete a task
 */
export async function deleteTask(id: string): Promise<void> {
  const now = new Date();
  await db.tasks.update(id, {
    deletedAt: now,
    updatedAt: now,
    _syncStatus: 'pending',
    _localUpdatedAt: now,
  });
}

/**
 * Get all non-deleted tasks
 */
export async function getAllTasks(): Promise<Task[]> {
  return db.tasks
    .filter(task => !task.deletedAt)
    .toArray();
}

/**
 * Get tasks grouped by due date
 */
export async function getTasksByDueDate(): Promise<{
  dueToday: Task[];
  dueLater: Task[];
}> {
  const tasks = await getAllTasks();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dueToday = tasks.filter(task => {
    if (!task.dueDate) return true; // No due date = show in "today"
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < tomorrow; // Today or overdue
  });

  const dueLater = tasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate >= tomorrow;
  });

  // Sort: uncompleted first, then by due date, then by created date
  const sortTasks = (a: Task, b: Task) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1; // Uncompleted first
    }
    if (a.completed) {
      // Both completed: sort by completion date (most recent first)
      return (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0);
    }
    // Both uncompleted: sort by due date, then created date
    if (a.dueDate && b.dueDate) {
      const dueDiff = a.dueDate.getTime() - b.dueDate.getTime();
      if (dueDiff !== 0) return dueDiff;
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  };

  return {
    dueToday: dueToday.sort(sortTasks),
    dueLater: dueLater.sort(sortTasks),
  };
}
```

**Step 2: Run tests**

```bash
pnpm test taskOperations.test.ts
```

Expected: PASS (all tests)

**Step 3: Commit**

```bash
git add src/lib/taskOperations.ts
git commit -m "feat: implement task CRUD operations"
```

## Phase 3: State Management

### Task 3.1: Create Task Store

**Files:**
- Create: `src/store/taskStore.ts`

**Step 1: Implement Zustand store**

```typescript
import { create } from 'zustand';
import type { Task } from '../lib/types';
import { addTask as addTaskOp, toggleTask as toggleTaskOp, deleteTask as deleteTaskOp, getTasksByDueDate } from '../lib/taskOperations';

interface TaskStore {
  tasks: Task[];
  dueToday: Task[];
  dueLater: Task[];
  loading: boolean;

  // Actions
  loadTasks: () => Promise<void>;
  addTask: (input: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  dueToday: [],
  dueLater: [],
  loading: false,

  loadTasks: async () => {
    set({ loading: true });
    try {
      const { dueToday, dueLater } = await getTasksByDueDate();
      set({
        tasks: [...dueToday, ...dueLater],
        dueToday,
        dueLater,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to load tasks:', error);
      set({ loading: false });
    }
  },

  addTask: async (input: string) => {
    await addTaskOp(input);
    await get().refreshTasks();
  },

  toggleTask: async (id: string) => {
    await toggleTaskOp(id);
    await get().refreshTasks();
  },

  deleteTask: async (id: string) => {
    await deleteTaskOp(id);
    await get().refreshTasks();
  },

  refreshTasks: async () => {
    const { dueToday, dueLater } = await getTasksByDueDate();
    set({
      tasks: [...dueToday, ...dueLater],
      dueToday,
      dueLater,
    });
  },
}));
```

**Step 2: Commit**

```bash
git add src/store/taskStore.ts
git commit -m "feat: create task store with Zustand"
```

## Phase 4: UI Components

### Task 4.1: Create TaskItem Component

**Files:**
- Create: `src/components/TaskItem.tsx`

**Step 1: Implement TaskItem with inline editing**

```typescript
import { useState, useRef, useEffect } from 'react';
import { Circle, CheckCircle2, Trash2 } from 'lucide-react';
import type { Task } from '../lib/types';
import { format, isToday, isPast, isTomorrow } from 'date-fns';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, title: string) => void;
}

export function TaskItem({ task, onToggle, onDelete, onUpdate }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim() !== task.title) {
      onUpdate(task.id, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(task.title);
      setIsEditing(false);
    }
  };

  const formatDueDate = (date: Date | undefined) => {
    if (!date) return null;

    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isPast(date) && !isToday(date)) {
      return <span className="text-red-500">{format(date, 'MMM d')}</span>;
    }
    return format(date, 'MMM d');
  };

  return (
    <div className={`group flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors ${task.completed ? 'opacity-60' : ''}`}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className="flex-shrink-0 text-gray-400 hover:text-blue-500 transition-colors"
      >
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5 text-blue-500" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </button>

      {/* Title */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-1 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className={`flex-1 text-left ${task.completed ? 'line-through' : ''}`}
        >
          {task.displayTitle}
        </button>
      )}

      {/* Due Date */}
      {task.dueDate && !isEditing && (
        <span className="text-sm text-gray-500">
          {formatDueDate(task.dueDate)}
        </span>
      )}

      {/* Delete Button */}
      {!isEditing && (
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/TaskItem.tsx
git commit -m "feat: create TaskItem component with inline editing"
```

### Task 4.2: Create TaskGroup Component

**Files:**
- Create: `src/components/TaskGroup.tsx`

**Step 1: Implement TaskGroup wrapper**

```typescript
import type { ReactNode } from 'react';

interface TaskGroupProps {
  icon: ReactNode;
  title: string;
  count: number;
  children: ReactNode;
}

export function TaskGroup({ icon, title, count, children }: TaskGroupProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3 px-3">
        <span className="text-gray-600">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-700">
          {title} ({count})
        </h2>
      </div>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/TaskGroup.tsx
git commit -m "feat: create TaskGroup component"
```

### Task 4.3: Create TaskInput Component

**Files:**
- Create: `src/components/TaskInput.tsx`

**Step 1: Implement quick-add input**

```typescript
import { useState, useRef, KeyboardEvent } from 'react';
import { Plus } from 'lucide-react';

interface TaskInputProps {
  onAdd: (input: string) => Promise<void>;
}

export function TaskInput({ onAdd }: TaskInputProps) {
  const [value, setValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    try {
      await onAdd(trimmed);
      setValue('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to add task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="mb-6 px-3">
      <div className="flex items-center gap-2 p-3 bg-white border-2 border-gray-200 rounded-lg focus-within:border-blue-400 transition-colors">
        <Plus className="w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="New task... (try: Buy milk #groceries due:tomorrow)"
          disabled={isLoading}
          className="flex-1 outline-none placeholder:text-gray-400"
        />
      </div>
      <p className="mt-2 text-xs text-gray-500 px-3">
        Pro tip: Use #tags and due:date (e.g., due:tomorrow, due:4/15)
      </p>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/TaskInput.tsx
git commit -m "feat: create TaskInput component with natural language support"
```

### Task 4.4: Create TaskList Component

**Files:**
- Create: `src/components/TaskList.tsx`

**Step 1: Implement grouped task list**

```typescript
import { Calendar, CalendarDays } from 'lucide-react';
import { TaskItem } from './TaskItem';
import { TaskGroup } from './TaskGroup';
import type { Task } from '../lib/types';

interface TaskListProps {
  dueToday: Task[];
  dueLater: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, title: string) => void;
}

export function TaskList({ dueToday, dueLater, onToggle, onDelete, onUpdate }: TaskListProps) {
  if (dueToday.length === 0 && dueLater.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No tasks yet</p>
        <p className="text-sm mt-2">Create your first task above!</p>
      </div>
    );
  }

  return (
    <div>
      {dueToday.length > 0 && (
        <TaskGroup
          icon={<Calendar className="w-4 h-4" />}
          title="Due Today"
          count={dueToday.length}
        >
          {dueToday.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggle}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          ))}
        </TaskGroup>
      )}

      {dueLater.length > 0 && (
        <TaskGroup
          icon={<CalendarDays className="w-4 h-4" />}
          title="Due Later"
          count={dueLater.length}
        >
          {dueLater.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggle}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          ))}
        </TaskGroup>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/TaskList.tsx
git commit -m "feat: create TaskList with grouped display"
```

### Task 4.5: Create Layout Component

**Files:**
- Create: `src/components/Layout.tsx`

**Step 1: Implement header and layout**

```typescript
import { Settings, User } from 'lucide-react';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            Tasks, that's it
          </h1>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <User className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto py-6">
        {children}
      </main>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat: create Layout component with header"
```

### Task 4.6: Wire Up App Component

**Files:**
- Modify: `src/App.tsx`

**Step 1: Replace App.tsx with task app**

```typescript
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { TaskInput } from './components/TaskInput';
import { TaskList } from './components/TaskList';
import { useTaskStore } from './store/taskStore';
import { updateTask as updateTaskOp } from './lib/taskOperations';
import { parseTaskInput } from './lib/parser';

export default function App() {
  const { dueToday, dueLater, loading, loadTasks, addTask, toggleTask, deleteTask, refreshTasks } = useTaskStore();

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleUpdate = async (id: string, newTitle: string) => {
    const parsed = parseTaskInput(newTitle);
    await updateTaskOp(id, {
      title: newTitle,
      displayTitle: parsed.displayTitle,
      tags: parsed.tags,
      dueDate: parsed.dueDate || undefined,
    });
    await refreshTasks();
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12 text-gray-500">
          Loading tasks...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <TaskInput onAdd={addTask} />
      <TaskList
        dueToday={dueToday}
        dueLater={dueLater}
        onToggle={toggleTask}
        onDelete={deleteTask}
        onUpdate={handleUpdate}
      />
    </Layout>
  );
}
```

**Step 2: Test the app**

```bash
pnpm dev
```

Open browser and test:
1. Add task without due date
2. Add task with due:today
3. Add task with due:tomorrow
4. Add task with #tags
5. Toggle completion
6. Edit task inline
7. Delete task

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire up main app with all components"
```

### Task 4.7: Update Global Styles

**Files:**
- Modify: `src/index.css`

**Step 1: Add task-specific styles**

Ensure Tailwind is properly configured and add any custom styles needed:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Add smooth transitions */
* {
  transition-property: color, background-color, border-color, opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
```

**Step 2: Commit**

```bash
git add src/index.css
git commit -m "style: update global styles for smooth transitions"
```

## Phase 5: Testing & Polish

### Task 5.1: Run All Tests

**Step 1: Run full test suite**

```bash
pnpm test
```

Expected: All tests pass

**Step 2: If any tests fail, fix them**

Debug and fix any failing tests.

**Step 3: Commit**

```bash
git add .
git commit -m "test: ensure all tests pass"
```

### Task 5.2: Manual Testing Checklist

**Step 1: Test core functionality**

- [ ] Create task with no due date → appears in "Due Today"
- [ ] Create task with due:today → appears in "Due Today"
- [ ] Create task with due:tomorrow → appears in "Due Later"
- [ ] Create task with #tags → tags visible in title
- [ ] Complete task → moves to bottom of group with strikethrough
- [ ] Uncomplete task → moves back to top
- [ ] Edit task inline → updates displayed correctly
- [ ] Delete task → disappears from list
- [ ] Refresh page → tasks persist

**Step 2: Document any issues**

Create GitHub issues or TODO comments for any bugs found.

**Step 3: Commit any fixes**

```bash
git add .
git commit -m "fix: manual testing issues"
```

### Task 5.3: Update README

**Files:**
- Modify: `README.md`

**Step 1: Write comprehensive README**

```markdown
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
- @thatsit/ui (UI components)
- Tailwind CSS

## Architecture

Local-first architecture with optional sync:

1. **Local Storage**: Tasks stored in IndexedDB via Dexie
2. **State Management**: Zustand for reactive UI
3. **Natural Language**: Parser extracts tags and due dates
4. **Grouping**: Smart grouping by due date with sorting
5. **Optional Sync**: Connect to sync backend for multi-device

```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README with usage instructions"
```

### Task 5.4: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add task-specific guidance**

```markdown
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
- **UI**: React components with @thatsit/ui
- **Sync**: Optional integration with sync backend

## Important Files

- `src/lib/parser.ts` - Natural language parsing
- `src/lib/taskOperations.ts` - CRUD operations
- `src/store/taskStore.ts` - Global state
- `src/components/TaskItem.tsx` - Individual task UI
- `src/components/TaskList.tsx` - Grouped task display

## Development Guidelines

- ALWAYS use @thatsit/ui components
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
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with task app guidance"
```

## Phase 6: Optional - Sync Integration

**Note**: This phase can be skipped for MVP. Sync is optional and can be added later.

### Task 6.1: Copy Sync Infrastructure

**Files:**
- Copy from: `../notes/src/sync/`
- To: `src/sync/`

**Step 1: Copy sync files**

```bash
cd /Users/michael/project-52/tasks
cp -r ../notes/src/sync/* src/sync/
```

**Step 2: Update imports for Task types**

Modify `src/sync/engine.ts` and `src/sync/api.ts` to work with Task type instead of Note type.

**Step 3: Test sync (if backend available)**

**Step 4: Commit**

```bash
git add src/sync/
git commit -m "feat: add sync infrastructure (optional)"
```

## Summary

This plan implements:

1. ✅ Natural language parser (tags + due dates)
2. ✅ Dexie database with Task schema
3. ✅ CRUD operations with sorting logic
4. ✅ Zustand state management
5. ✅ React components (Input, Item, Group, List, Layout)
6. ✅ Smart grouping (Due Today / Due Later)
7. ✅ Completed tasks sink to bottom
8. ✅ Inline editing
9. ✅ Comprehensive tests
10. ✅ Documentation

**MVP is feature-complete and ready for use!**

Optional: Add sync integration in Phase 6 when needed.

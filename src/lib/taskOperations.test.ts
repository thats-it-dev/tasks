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

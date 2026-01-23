import { describe, test, expect } from 'vitest';
import { parseTaskInput } from './parser';
import { startOfDay, addDays, addWeeks, nextMonday } from 'date-fns';

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

  test('parses due:+N (relative days)', () => {
    const result = parseTaskInput('Task due:+3');
    const expected = startOfDay(addDays(new Date(), 3));
    expect(result.dueDate?.getTime()).toBe(expected.getTime());
    expect(result.displayTitle).toBe('Task');
  });

  test('parses due:next-week', () => {
    const result = parseTaskInput('Task due:next-week');
    const expected = nextMonday(startOfDay(new Date()));
    expect(result.dueDate?.getTime()).toBe(expected.getTime());
  });

  test('parses due:"next week" with quotes', () => {
    const result = parseTaskInput('Task due:"next week"');
    const expected = nextMonday(startOfDay(new Date()));
    expect(result.dueDate?.getTime()).toBe(expected.getTime());
    expect(result.displayTitle).toBe('Task');
  });

  test('parses due:in-2-weeks', () => {
    const result = parseTaskInput('Task due:in-2-weeks');
    const expected = startOfDay(addWeeks(new Date(), 2));
    expect(result.dueDate?.getTime()).toBe(expected.getTime());
  });
});

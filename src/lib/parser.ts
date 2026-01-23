import { startOfDay, addDays, addWeeks, parse, isValid, nextMonday } from 'date-fns';

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

  // Extract due:"quoted phrase" or due:single-word (with hyphens, plus, slash)
  const quotedDueMatch = text.match(/due:"([^"]+)"/i);
  const wordDueMatch = text.match(/due:([\w+\-/]+)/i);

  if (quotedDueMatch) {
    dueDate = parseDueDate(quotedDueMatch[1]);
    text = text.replace(/due:"[^"]+"/i, '').trim();
  } else if (wordDueMatch) {
    dueDate = parseDueDate(wordDueMatch[1]);
    text = text.replace(/due:[\w+\-/]+/i, '').trim();
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
 * - +N (N days from now)
 * - monday, tuesday, etc (next occurrence)
 * - next-week, next-month
 * - 4/15, 12/25 (M/D)
 * - 2026-04-15 (ISO)
 */
function parseDueDate(input: string): Date | null {
  const normalized = input.toLowerCase().replace(/\s+/g, '-');
  const today = startOfDay(new Date());

  // Relative dates
  if (normalized === 'today') {
    return today;
  }
  if (normalized === 'tomorrow') {
    return addDays(today, 1);
  }

  // +N format (e.g., +3 for 3 days from now)
  const plusMatch = normalized.match(/^\+(\d+)$/);
  if (plusMatch) {
    return addDays(today, parseInt(plusMatch[1], 10));
  }

  // next-week, next-month
  if (normalized === 'next-week') {
    return nextMonday(today);
  }
  if (normalized === 'next-month') {
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    return startOfDay(nextMonth);
  }

  // in-N-days, in-N-weeks
  const inDaysMatch = normalized.match(/^in-(\d+)-days?$/);
  if (inDaysMatch) {
    return addDays(today, parseInt(inDaysMatch[1], 10));
  }
  const inWeeksMatch = normalized.match(/^in-(\d+)-weeks?$/);
  if (inWeeksMatch) {
    return addWeeks(today, parseInt(inWeeksMatch[1], 10));
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

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

import { RRule, Frequency } from "rrule";
import { RecurrenceRule, Item } from "@/app/_types";

/**
 * Predefined recurrence patterns for common intervals
 */
export const RECURRENCE_PRESETS = {
  NONE: { label: "None", value: "" },
  DAILY: { label: "Daily", value: "FREQ=DAILY;INTERVAL=1" },
  WEEKLY: { label: "Weekly", value: "FREQ=WEEKLY;INTERVAL=1" },
  BIWEEKLY: { label: "Bi-weekly", value: "FREQ=WEEKLY;INTERVAL=2" },
  MONTHLY: { label: "Monthly", value: "FREQ=MONTHLY;INTERVAL=1" },
  YEARLY: { label: "Yearly", value: "FREQ=YEARLY;INTERVAL=1" },
} as const;

/**
 * Parse recurrence metadata from markdown format
 * Format: | rrule:FREQ=WEEKLY;INTERVAL=1 | dtstart:2025-01-27T00:00:00Z | nextDue:2025-02-03T00:00:00Z | lastCompleted:2025-01-20T00:00:00Z
 */
export const parseRecurrenceFromMarkdown = (
  metadata: string[]
): RecurrenceRule | undefined => {
  let rrule: string | undefined;
  let dtstart: string | undefined;
  let nextDue: string | undefined;
  let lastCompleted: string | undefined;

  for (const meta of metadata) {
    if (meta.startsWith("rrule:")) {
      rrule = meta.substring(6);
    } else if (meta.startsWith("dtstart:")) {
      dtstart = meta.substring(8);
    } else if (meta.startsWith("nextDue:")) {
      nextDue = meta.substring(8);
    } else if (meta.startsWith("lastCompleted:")) {
      lastCompleted = meta.substring(14);
    }
  }

  if (!rrule || !dtstart) {
    return undefined;
  }

  return {
    rrule,
    dtstart,
    nextDue,
    lastCompleted,
  };
};

/**
 * Convert recurrence metadata to markdown format
 */
export const recurrenceToMarkdown = (recurrence: RecurrenceRule): string[] => {
  const parts: string[] = [];

  parts.push(`rrule:${recurrence.rrule}`);
  parts.push(`dtstart:${recurrence.dtstart}`);

  if (recurrence.nextDue) {
    parts.push(`nextDue:${recurrence.nextDue}`);
  }

  if (recurrence.lastCompleted) {
    parts.push(`lastCompleted:${recurrence.lastCompleted}`);
  }

  return parts;
};

/**
 * Calculate the next occurrence date based on the RRULE and start date
 * @param rruleString - RFC 5545 RRULE string
 * @param dtstart - Start date as ISO string
 * @param after - Calculate next occurrence after this date (defaults to now)
 * @returns ISO date string of next occurrence, or undefined if no more occurrences
 */
export const calculateNextOccurrence = (
  rruleString: string,
  dtstart: string,
  after?: Date
): string | undefined => {
  try {
    // Parse the dtstart date
    const startDate = new Date(dtstart);

    // Create RRule instance
    const rule = RRule.fromString(`DTSTART:${dtstart}\nRRULE:${rruleString}`);

    // Get next occurrence after the specified date (or now)
    const afterDate = after || new Date();
    const nextDate = rule.after(afterDate, false); // false = don't include afterDate itself

    return nextDate ? nextDate.toISOString() : undefined;
  } catch (error) {
    console.error("Error calculating next occurrence:", error);
    return undefined;
  }
};

/**
 * Check if a recurring item needs to be refreshed (completed and past due date)
 */
export const shouldRefreshRecurringItem = (item: Item): boolean => {
  if (!item.recurrence || !item.completed) {
    return false;
  }

  // If there's no nextDue, we should calculate it
  if (!item.recurrence.nextDue) {
    return true;
  }

  // If nextDue is in the past, we should refresh
  const nextDueDate = new Date(item.recurrence.nextDue);
  const now = new Date();

  return nextDueDate <= now;
};

/**
 * Refresh a recurring item by creating a new instance
 * @param item - The completed recurring item
 * @returns Updated item with new nextDue date and uncompleted status
 */
export const refreshRecurringItem = (item: Item): Item => {
  if (!item.recurrence) {
    return item;
  }

  const now = new Date();

  // Calculate next occurrence after now
  const nextDue = calculateNextOccurrence(
    item.recurrence.rrule,
    item.recurrence.dtstart,
    now
  );

  // Create refreshed item
  return {
    ...item,
    completed: false,
    recurrence: {
      ...item.recurrence,
      nextDue,
      lastCompleted: now.toISOString(),
    },
  };
};

/**
 * Get human-readable description of a recurrence rule
 */
export const getRecurrenceDescription = (recurrence: RecurrenceRule): string => {
  try {
    const rule = RRule.fromString(`DTSTART:${recurrence.dtstart}\nRRULE:${recurrence.rrule}`);
    return rule.toText();
  } catch (error) {
    // Fallback to basic parsing
    const rrule = recurrence.rrule;

    if (rrule.includes("FREQ=DAILY")) {
      const interval = rrule.match(/INTERVAL=(\d+)/)?.[1] || "1";
      return interval === "1" ? "Daily" : `Every ${interval} days`;
    } else if (rrule.includes("FREQ=WEEKLY")) {
      const interval = rrule.match(/INTERVAL=(\d+)/)?.[1] || "1";
      return interval === "1" ? "Weekly" : `Every ${interval} weeks`;
    } else if (rrule.includes("FREQ=MONTHLY")) {
      const interval = rrule.match(/INTERVAL=(\d+)/)?.[1] || "1";
      return interval === "1" ? "Monthly" : `Every ${interval} months`;
    } else if (rrule.includes("FREQ=YEARLY")) {
      const interval = rrule.match(/INTERVAL=(\d+)/)?.[1] || "1";
      return interval === "1" ? "Yearly" : `Every ${interval} years`;
    }

    return "Custom recurrence";
  }
};

/**
 * Create a recurrence rule from a preset
 * @param presetValue - The RRULE string from RECURRENCE_PRESETS
 * @param startDate - Optional start date (defaults to now)
 */
export const createRecurrenceFromPreset = (
  presetValue: string,
  startDate?: Date
): RecurrenceRule | undefined => {
  if (!presetValue) {
    return undefined;
  }

  const dtstart = (startDate || new Date()).toISOString();
  const nextDue = calculateNextOccurrence(presetValue, dtstart);

  return {
    rrule: presetValue,
    dtstart,
    nextDue,
  };
};

/**
 * Validate an RRULE string
 */
export const isValidRRule = (rruleString: string): boolean => {
  try {
    RRule.fromString(`RRULE:${rruleString}`);
    return true;
  } catch (error) {
    return false;
  }
};

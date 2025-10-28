import { RRule } from "rrule";
import { RecurrenceRule, Item } from "@/app/_types";

/**
 * Convert ISO 8601 date string to RFC 5545 compact format
 * @param isoDate - ISO date string (e.g., "2025-01-27T19:42:04.991Z")
 * @returns RFC 5545 format (e.g., "20250127T194204Z")
 */
export const isoToRFC5545 = (isoDate: string): string => {
  const date = new Date(isoDate);

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
};

/**
 * Convert RFC 5545 compact format to ISO 8601 date string
 * @param rfc5545Date - RFC 5545 format (e.g., "20250127T194204Z")
 * @returns ISO date string (e.g., "2025-01-27T19:42:04.000Z")
 */
export const rfc5545ToISO = (rfc5545Date: string): string => {
  // Parse YYYYMMDDTHHMMSSZ format
  const year = rfc5545Date.substring(0, 4);
  const month = rfc5545Date.substring(4, 6);
  const day = rfc5545Date.substring(6, 8);
  const hours = rfc5545Date.substring(9, 11);
  const minutes = rfc5545Date.substring(11, 13);
  const seconds = rfc5545Date.substring(13, 15);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
};

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
 * Format example: | recurrence:{"rrule":"FREQ=WEEKLY;INTERVAL=1","dtstart":"2025-01-27T00:00:00Z","nextDue":"2025-02-03T00:00:00Z"}
 */
export const parseRecurrenceFromMarkdown = (
  metadata: string[]
): RecurrenceRule | undefined => {
  for (const meta of metadata) {
    if (meta.startsWith("recurrence:")) {
      try {
        const recurrenceJson = meta.substring(11);
        const recurrence = JSON.parse(recurrenceJson);

        if (!recurrence.rrule || !recurrence.dtstart) {
          return undefined;
        }

        return recurrence as RecurrenceRule;
      } catch (error) {
        console.error("Error parsing recurrence JSON:", error);
        return undefined;
      }
    }
  }

  return undefined;
};

/**
 * Convert recurrence metadata to markdown format
 * Format: | recurrence:<JSON_STRING>
 */
export const recurrenceToMarkdown = (recurrence: RecurrenceRule): string[] => {
  return [`recurrence:${JSON.stringify(recurrence)}`];
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
    const rfc5545Dtstart = isoToRFC5545(dtstart);

    const rule = RRule.fromString(
      `DTSTART:${rfc5545Dtstart}\nRRULE:${rruleString}`
    );

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

  if (!item.recurrence.nextDue) {
    return true;
  }

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

  const nextDue = calculateNextOccurrence(
    item.recurrence.rrule,
    item.recurrence.dtstart,
    now
  );

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
export const getRecurrenceDescription = (
  recurrence: RecurrenceRule
): string => {
  try {
    // Convert ISO dtstart to RFC 5545 format
    const rfc5545Dtstart = isoToRFC5545(recurrence.dtstart);
    const rule = RRule.fromString(
      `DTSTART:${rfc5545Dtstart}\nRRULE:${recurrence.rrule}`
    );
    return rule.toText();
  } catch (error) {
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

import { ByWeekday, Frequency, Options, RRule, Weekday } from "rrule";
import { RecurrenceRule, Item, KanbanStatus } from "@/app/_types";
import { TaskStatus } from "../_types/enums";
import { firstColumn } from "@/app/_consts/kanban";

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

const MAX_OCCURRENCE_STEPS = 50_000;

interface Occurrence {
  next?: string;
  settled: boolean;
}

const DAY_MS = 86_400_000;

const PERIOD_DAYS: Partial<Record<Frequency, number>> = {
  [Frequency.DAILY]: 1,
  [Frequency.WEEKLY]: 7,
};

const _optionsOf = (rruleString: string) => {
  try {
    return RRule.parseString(rruleString.toUpperCase());
  } catch (error) {
    console.warn(`Unreadable recurrence rule ${rruleString}:`, (error as Error).message);
    return undefined;
  }
};

const SCHEDULABLE_PARTS = new Set<string>([
  "freq",
  "interval",
  "count",
  "until",
  "wkst",
  "byweekday",
] satisfies (keyof Options)[]);

const _plainWeekdays = (byweekday: ByWeekday | ByWeekday[]) =>
  [byweekday].flat().every((day) => !(day instanceof Weekday) || day.n == null);

const _isPositiveUpTo = (value: number | null | undefined, max: number) =>
  value == null || (Number.isInteger(value) && value > 0 && value <= max);

const _schedulableOptions = (rruleString: string): Partial<Options> | undefined => {
  const options = _optionsOf(rruleString);
  if (!options || options.freq === undefined || options.freq > Frequency.DAILY) return undefined;

  const parts = Object.entries(options).filter(([, value]) => value != null);
  if (parts.some(([part]) => !SCHEDULABLE_PARTS.has(part))) return undefined;
  if (options.byweekday != null && (options.freq !== Frequency.WEEKLY || !_plainWeekdays(options.byweekday))) {
    return undefined;
  }

  const fits = _isPositiveUpTo(options.interval, Number.MAX_SAFE_INTEGER) && _isPositiveUpTo(options.count, MAX_OCCURRENCE_STEPS);
  return fits ? options : undefined;
};

export const isSchedulable = (rruleString: string): boolean => Boolean(_schedulableOptions(rruleString));

const _searchStart = (options: Partial<Options>, dtstart: Date, after: Date): Date => {
  const days = options.freq === undefined ? undefined : PERIOD_DAYS[options.freq];
  if (!days || options.count != null) return dtstart;

  const period = days * DAY_MS * (options.interval ?? 1);
  const skipped = Math.floor((after.getTime() - dtstart.getTime()) / period) - 1;
  return skipped > 0 ? new Date(dtstart.getTime() + skipped * period) : dtstart;
};

const _nextOccurrence = (
  rruleString: string,
  dtstart: string,
  after?: Date,
  until?: string
): Occurrence => {
  const options = _schedulableOptions(rruleString);
  if (!options) return { settled: false };

  try {
    const afterDate = after || new Date();
    const searchStart = _searchStart(options, new Date(dtstart), afterDate);

    let finalRruleString = rruleString;
    if (until && !rruleString.includes("UNTIL=")) {
      finalRruleString = `${rruleString};UNTIL=${isoToRFC5545(until)}`;
    }

    const rule = RRule.fromString(
      `DTSTART:${isoToRFC5545(searchStart.toISOString())}\nRRULE:${finalRruleString}`
    );

    let nextDate: Date | undefined;
    let outOfSteps = false;
    rule.all((date, index) => {
      if (date > afterDate) {
        nextDate = date;
        return false;
      }
      outOfSteps = index >= MAX_OCCURRENCE_STEPS;
      return !outOfSteps;
    });

    if (outOfSteps) {
      console.warn(`Recurrence ${rruleString} from ${dtstart} has too many occurrences to roll forward`);
      return { settled: false };
    }

    return { next: nextDate?.toISOString(), settled: true };
  } catch (error) {
    console.error("Error calculating next occurrence:", error);
    return { settled: false };
  }
};

/**
 * Calculate the next occurrence date based on the RRULE and start date
 * @param rruleString - RFC 5545 RRULE string
 * @param dtstart - Start date as ISO string
 * @param after - Calculate next occurrence after this date (defaults to now)
 * @param until - Optional end date as ISO string (stop recurring after this date)
 * @returns ISO date string of next occurrence, or undefined if there are no more or it can't be worked out
 */
export const calculateNextOccurrence = (
  rruleString: string,
  dtstart: string,
  after?: Date,
  until?: string
): string | undefined => _nextOccurrence(rruleString, dtstart, after, until).next;

const _isDone = (item: Item): boolean =>
  Boolean(item.completed) || item.status === TaskStatus.COMPLETED;

/**
 * Check if a recurring item needs to be refreshed (completed and past due date)
 */
export const shouldRefreshRecurringItem = (item: Item): boolean => {
  if (!item.recurrence || !_isDone(item)) {
    return false;
  }

  if (item.recurrence.until) {
    const untilDate = new Date(item.recurrence.until);
    const now = new Date();
    if (now > untilDate) {
      return false;
    }
  }

  if (!item.recurrence.nextDue || new Date(item.recurrence.nextDue) > new Date()) {
    return false;
  }

  return isSchedulable(item.recurrence.rrule);
};

/**
 * Helper function to recursively reset all nested children to uncompleted state
 * @param children - Array of child items to reset
 * @returns Array of reset children, or undefined if no children
 */
const resetChildren = (children: Item[] | undefined, resetStatus: string): Item[] | undefined => {
  if (!children || children.length === 0) return children;

  return children.map(child => ({
    ...child,
    completed: false,
    status: child.status ? resetStatus : undefined,
    children: resetChildren(child.children, resetStatus),
  }));
};

const _isPast = (iso: string | undefined, now: Date): boolean =>
  Boolean(iso) && new Date(iso!) <= now;

/**
 * Refresh a recurring item by creating a new instance
 * @param item - The completed recurring item
 * @returns Updated item with new nextDue date and uncompleted status
 */
export const refreshRecurringItem = (item: Item, resetStatus: string = firstColumn()): Item => {
  if (!item.recurrence) {
    return item;
  }

  const now = new Date();

  const { next: nextDue, settled } = _nextOccurrence(
    item.recurrence.rrule,
    item.recurrence.dtstart,
    now,
    item.recurrence.until
  );
  if (!settled) return item;
  if (!nextDue && !_isPast(item.recurrence.nextDue, now)) {
    return { ...item, recurrence: { ...item.recurrence, nextDue: undefined } };
  }

  const keepsStatus = !item.status || item.status === TaskStatus.PAUSED;

  return {
    ...item,
    completed: false,
    status: keepsStatus ? item.status : resetStatus,
    children: resetChildren(item.children, resetStatus),
    recurrence: {
      ...item.recurrence,
      nextDue,
      lastCompleted: now.toISOString(),
    },
  };
};

export const hasDueRecurringItem = (items: Item[]): boolean =>
  items.some((item) => shouldRefreshRecurringItem(item) || hasDueRecurringItem(item.children ?? []));

const _rollTree = (items: Item[], resetStatus: string): Item[] =>
  items.map((item) => {
    const rolled = shouldRefreshRecurringItem(item) ? refreshRecurringItem(item, resetStatus) : item;
    const original = rolled.children;
    if (!original?.length) return rolled;

    const children = _rollTree(original, resetStatus);
    return children.some((child, index) => child !== original[index]) ? { ...rolled, children } : rolled;
  });

export const rollDueItems = (items: Item[], statuses?: KanbanStatus[]): Item[] =>
  _rollTree(items, firstColumn(statuses));

/**
 * Get human-readable description of a recurrence rule
 */
export const getRecurrenceDescription = (
  recurrence: RecurrenceRule
): string => {
  let description = "";

  try {
    const rfc5545Dtstart = isoToRFC5545(recurrence.dtstart);
    const rule = RRule.fromString(
      `DTSTART:${rfc5545Dtstart}\nRRULE:${recurrence.rrule}`
    );
    description = rule.toText();
  } catch (error) {
    const rrule = recurrence.rrule;

    if (rrule.includes("FREQ=DAILY")) {
      const interval = rrule.match(/INTERVAL=(\d+)/)?.[1] || "1";
      description = interval === "1" ? "Daily" : `Every ${interval} days`;
    } else if (rrule.includes("FREQ=WEEKLY")) {
      const interval = rrule.match(/INTERVAL=(\d+)/)?.[1] || "1";
      description = interval === "1" ? "Weekly" : `Every ${interval} weeks`;
    } else if (rrule.includes("FREQ=MONTHLY")) {
      const interval = rrule.match(/INTERVAL=(\d+)/)?.[1] || "1";
      description = interval === "1" ? "Monthly" : `Every ${interval} months`;
    } else if (rrule.includes("FREQ=YEARLY")) {
      const interval = rrule.match(/INTERVAL=(\d+)/)?.[1] || "1";
      description = interval === "1" ? "Yearly" : `Every ${interval} years`;
    } else {
      description = "Custom recurrence";
    }
  }

  const startDate = new Date(recurrence.dtstart);
  const startStr = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (recurrence.until) {
    const endDate = new Date(recurrence.until);
    const endStr = endDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    description += ` • ${startStr} - ${endStr}`;
  } else {
    description += ` • Starts ${startStr}`;
  }

  return description;
};

/**
 * Create a recurrence rule from a preset
 * @param presetValue - The RRULE string from RECURRENCE_PRESETS
 * @param startDate - Optional start date (defaults to now)
 * @param endDate - Optional end date (no end if not provided)
 */
export const createRecurrenceFromPreset = (
  presetValue: string,
  startDate?: Date,
  endDate?: Date
): RecurrenceRule | undefined => {
  if (!presetValue) {
    return undefined;
  }

  const convertToUTCMidnight = (date: Date): string => {
    const utcDate = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
    );
    return utcDate.toISOString();
  };

  const dtstart = startDate
    ? convertToUTCMidnight(startDate)
    : new Date().toISOString();
  const until = endDate ? convertToUTCMidnight(endDate) : undefined;
  const nextDue = calculateNextOccurrence(
    presetValue,
    dtstart,
    undefined,
    until
  );

  return {
    rrule: presetValue,
    dtstart,
    ...(until && { until }),
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

export type RecurrenceInput = Pick<RecurrenceRule, "rrule" | "dtstart" | "until">;

export const RECURRENCE_REFUSED =
  `Recurrence needs an rrule like FREQ=WEEKLY;INTERVAL=1 using FREQ (DAILY to YEARLY), a positive INTERVAL, a COUNT up to ${MAX_OCCURRENCE_STEPS}, UNTIL, WKST and, for WEEKLY, plain BYDAY weekdays, plus a valid dtstart`;

export const NESTED_RECURRENCE = "Only top-level items can repeat";

export const isRecurrenceRefusal = (error?: string): error is string =>
  error === RECURRENCE_REFUSED || error === NESTED_RECURRENCE;

const RRULE_SHAPE = /^[A-Z0-9=;,:+-]+$/i;

const _isDate = (value?: string) => value === undefined || !Number.isNaN(Date.parse(value));

export const isRecurrenceInput = (input: RecurrenceInput): boolean =>
  typeof input?.rrule === "string" &&
  typeof input.dtstart === "string" &&
  (input.until === undefined || typeof input.until === "string") &&
  RRULE_SHAPE.test(input.rrule) &&
  /(^|;)FREQ=/i.test(input.rrule) &&
  isValidRRule(input.rrule.toUpperCase()) &&
  isSchedulable(input.rrule) &&
  _isDate(input.dtstart) &&
  _isDate(input.until);

export const ruleFrom = (input: RecurrenceInput): RecurrenceRule | undefined => {
  if (!isRecurrenceInput(input)) return undefined;

  const rrule = input.rrule.toUpperCase();
  const dtstart = new Date(input.dtstart).toISOString();
  const until = input.until ? new Date(input.until).toISOString() : undefined;

  const { next: nextDue, settled } = _nextOccurrence(rrule, dtstart, undefined, until);
  if (!settled || !nextDue) return undefined;

  return {
    rrule,
    dtstart,
    ...(until && { until }),
    nextDue,
  };
};

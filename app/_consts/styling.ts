export const BORDER_RADIUS_VAR = "--jotty-radius";
export const ADMIN_BORDER_RADIUS_VAR = "--jotty-radius-admin";
export const USER_BORDER_RADIUS_VAR = "--jotty-radius-user";

export const DEFAULT_BORDER_RADIUS = 0.25;
export const MIN_BORDER_RADIUS = 0;
export const MAX_BORDER_RADIUS = 2;
export const BORDER_RADIUS_STEP = 0.05;

export const clampRadius = (value?: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_BORDER_RADIUS;
  }
  return Math.min(MAX_BORDER_RADIUS, Math.max(MIN_BORDER_RADIUS, value));
};

export const radiusToRem = (value?: number): string =>
  `${clampRadius(value)}rem`;

export const DEFAULT_KANBAN_COLUMN_WIDTH = 280;
export const MIN_KANBAN_COLUMN_WIDTH = 200;
export const MAX_KANBAN_COLUMN_WIDTH = 500;
export const KANBAN_COLUMN_WIDTH_STEP = 10;

export const clampKanbanColumnWidth = (value?: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_KANBAN_COLUMN_WIDTH;
  }
  return Math.min(
    MAX_KANBAN_COLUMN_WIDTH,
    Math.max(MIN_KANBAN_COLUMN_WIDTH, value),
  );
};

export const KANBAN_COLUMN_WIDTH_AUTO = 0;

export const normaliseKanbanColumnWidth = (value?: number): number =>
  !value || !Number.isFinite(value)
    ? KANBAN_COLUMN_WIDTH_AUTO
    : clampKanbanColumnWidth(value);

export const SMALL_RADIUS_CLASS =
  "rounded-[min(calc(var(--jotty-radius-effective)*0.5),4px)]";
export const TICK_RADIUS_CLASS =
  "rounded-[min(calc(var(--jotty-radius-effective)*0.6),3px)]";

export const NOTE_FONT_SIZE_VAR = "--jotty-note-font-size";
export const USER_NOTE_FONT_SIZE_VAR = "--jotty-note-font-size-user";

export const DEFAULT_NOTE_FONT_SIZE = 16;
export const MIN_NOTE_FONT_SIZE = 12;
export const MAX_NOTE_FONT_SIZE = 24;
export const NOTE_FONT_SIZE_STEP = 1;
export const NOTE_FONT_SIZE_AUTO = 0;

export const clampNoteFontSize = (value?: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_NOTE_FONT_SIZE;
  }
  return Math.min(
    MAX_NOTE_FONT_SIZE,
    Math.max(MIN_NOTE_FONT_SIZE, Math.round(value)),
  );
};

export const noteFontSizeToPx = (value?: number): string =>
  `${clampNoteFontSize(value)}px`;

export const normaliseNoteFontSize = (value?: number): number =>
  !value || !Number.isFinite(value)
    ? NOTE_FONT_SIZE_AUTO
    : clampNoteFontSize(value);

export const KICKER_CLASS =
  "font-mono text-[11px] uppercase tracking-widest text-muted-foreground";

export const MENU_CLASS =
  "jotty-menu bg-card border border-border rounded-jotty shadow-xl shadow-black/[0.08]";

export const MENU_ITEM_CLASS =
  "flex w-full items-center gap-2.5 rounded-[calc(var(--jotty-radius-effective)*0.75)] px-2.5 py-1.5 text-left text-md lg:text-sm text-foreground transition-colors duration-150 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none";

export const MENU_ITEM_ACTIVE_CLASS =
  "bg-primary/10 text-primary hover:bg-primary/15 focus-visible:bg-primary/15";

export const MENU_ITEM_DANGER_CLASS =
  "text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10";

export const MENU_DIVIDER_CLASS = "mx-1.5 my-1 border-t border-dashed border-border";

import { z } from "zod";
import { ToggleState, Modes } from "@/app/_types/enums";
import { CHECKLIST_FILTERS, NOTE_FILTERS } from "@/app/_consts/browse";
import { HOME_WIDGET_KEYS, HomeWidgetKey } from "@/app/_consts/home";
import { SearchModes } from "@/app/_consts/search";
import {
  KANBAN_COLUMN_WIDTH_AUTO,
  MAX_BORDER_RADIUS,
  MAX_KANBAN_COLUMN_WIDTH,
  MAX_NOTE_FONT_SIZE,
  MIN_BORDER_RADIUS,
  MIN_KANBAN_COLUMN_WIDTH,
  MIN_NOTE_FONT_SIZE,
  NOTE_FONT_SIZE_AUTO,
} from "@/app/_consts/styling";
import { VIEW_MODES } from "@/app/_consts/view-modes";

export const userSettingsSchema = z.object({
  preferredTheme: z.string().min(1, "Theme is required"),
  tableSyntax: z.enum(["html", "markdown"], {
    message: "Table syntax must be either 'html' or 'markdown'",
  }),
  landingPage: z.enum([Modes.CHECKLISTS, Modes.NOTES, "last-visited"], {
    message: "Landing page must be 'checklists', 'notes', or 'last-visited'",
  }),
});

export const editorSettingsSchema = z.object({
  notesDefaultEditor: z.enum(["wysiwyg", "markdown"], {
    message: "Notes default editor must be either 'wysiwyg' or 'markdown'",
  }),
  tableSyntax: z.enum(["html", "markdown"], {
    message: "Table syntax must be either 'html' or 'markdown'",
  }),
  notesDefaultMode: z.enum(["edit", "view"], {
    message: "Notes default mode must be either 'edit' or 'view'",
  }),
  notesAutoSaveInterval: z
    .number()
    .min(0, "Notes auto save interval must be greater than 0"),
  notesFontSize: z
    .number()
    .int()
    .refine(
      (size) =>
        size === NOTE_FONT_SIZE_AUTO ||
        (size >= MIN_NOTE_FONT_SIZE && size <= MAX_NOTE_FONT_SIZE),
      {
        message: `Notes font size must be between ${MIN_NOTE_FONT_SIZE} and ${MAX_NOTE_FONT_SIZE}`,
      },
    )
    .optional(),
  browseViewMode: z
    .enum(VIEW_MODES, {
      message: "View mode must be 'card', 'list' or 'grid'",
    })
    .optional(),
  notesCardPreview: z
    .enum([ToggleState.ENABLE, ToggleState.DISABLE], {
      message: "Card preview must be either 'enable' or 'disable'",
    })
    .optional(),
  notesCompactMode: z
    .enum([ToggleState.ENABLE, ToggleState.DISABLE], {
      message: "Compact mode must be either 'enable' or 'disable'",
    })
    .optional(),
  notesDetailsPanel: z
    .enum([ToggleState.ENABLE, ToggleState.DISABLE], {
      message: "Details panel must be either 'enable' or 'disable'",
    })
    .optional(),
  disableRichEditor: z.enum(ToggleState, {
    message: "Disable rich editor must be either 'enable' or 'disable'",
  }),
  markdownTheme: z.enum(
    [
      "prism",
      "prism-dark",
      "prism-funky",
      "prism-okaidia",
      "prism-tomorrow",
      "prism-twilight",
      "prism-coy",
      "prism-solarizedlight",
    ],
    {
      message: "Markdown theme must be a valid Prism theme",
    },
  ),
  defaultNoteFilter: z.enum(NOTE_FILTERS, {
    message: "Default note filter must be 'all', 'recent', or 'pinned'",
  }),
  quickCreateNotes: z.enum(ToggleState, {
    message: "Quick create notes must be either 'enable' or 'disable'",
  }),
  quickCreateNotesCategory: z.string().optional(),
  codeBlockStyle: z.enum(["default", "themed"], {
    message: "Code block style must be either 'default' or 'themed'",
  }),
});

export const checklistSettingsSchema = z.object({
  enableRecurrence: z.enum(ToggleState, {
    message: "Enable recurrence must be either 'enable' or 'disable'",
  }),
  showCompletedSuggestions: z.enum(ToggleState, {
    message: "Show completed suggestions must be either 'enable' or 'disable'",
  }),
  showChecklistEmojis: z.enum(ToggleState, {
    message: "Show checklist emojis must be either 'enable' or 'disable'",
  }),
  defaultChecklistFilter: z.enum(
    CHECKLIST_FILTERS,
    {
      message:
        "Default checklist filter must be 'all', 'completed', 'incomplete', 'pinned', 'kanban', or 'simple'",
    },
  ),
  checklistItemClickAction: z.enum(["toggle", "edit"], {
    message: "Checklist item click action must be either 'toggle' or 'edit'",
  }),
  newItemInsertion: z.enum(["top", "bottom"], {
    message: "New item insertion must be either 'top' or 'bottom'",
  }),
});

export const kanbanSettingsSchema = z.object({
  kanbanColumnWidth: z
    .number()
    .refine(
      (width) =>
        width === KANBAN_COLUMN_WIDTH_AUTO ||
        (width >= MIN_KANBAN_COLUMN_WIDTH && width <= MAX_KANBAN_COLUMN_WIDTH),
      {
        message: `Kanban column width must be between ${MIN_KANBAN_COLUMN_WIDTH} and ${MAX_KANBAN_COLUMN_WIDTH}`,
      },
    )
    .optional(),
  hideStatusOnCards: z
    .enum([ToggleState.ENABLE, ToggleState.DISABLE], {
      message: "Hide status on cards must be either 'enable' or 'disable'",
    })
    .optional(),
  hideMobileStatusDropdown: z
    .enum([ToggleState.ENABLE, ToggleState.DISABLE], {
      message:
        "Hide mobile status dropdown must be either 'enable' or 'disable'",
    })
    .optional(),
  hideTimeTrackingOnCards: z
    .enum([ToggleState.ENABLE, ToggleState.DISABLE], {
      message:
        "Hide time tracking on cards must be either 'enable' or 'disable'",
    })
    .optional(),
});

const homeWidgetSchema = z
  .enum(ToggleState, {
    message: "Home widgets must be either 'enable' or 'disable'",
  })
  .optional();

export const homeWidgetsSettingsSchema = z.object(
  Object.fromEntries(
    HOME_WIDGET_KEYS.map((key) => [key, homeWidgetSchema]),
  ) as Record<HomeWidgetKey, typeof homeWidgetSchema>,
);

export const fileSettingsSchema = z.object({
  fileRenameMode: z.enum(["dash-case", "minimal", "none"], {
    message: "File rename mode must be 'dash-case', 'minimal', or 'none'",
  }),
});

export const generalSettingsSchema = z.object({
  preferredLocale: z.string().optional(),
  preferredBorderRadius: z
    .number()
    .min(MIN_BORDER_RADIUS, `Corner rounding must be at least ${MIN_BORDER_RADIUS}`)
    .max(MAX_BORDER_RADIUS, `Corner rounding must be at most ${MAX_BORDER_RADIUS}`)
    .optional(),
  preferredTheme: z.string().min(1, "Theme is required"),
  landingPage: z.enum([Modes.CHECKLISTS, Modes.NOTES, "last-visited"], {
    message: "Landing page must be 'checklists', 'notes', or 'last-visited'",
  }),
  fileRenameMode: z.enum(["dash-case", "minimal", "none"], {
    message: "File rename mode must be 'dash-case', 'minimal', or 'none'",
  }),
  preferredDateFormat: z.enum([
    "dd/mm/yyyy",
    "mm/dd/yyyy",
    "yyyy/mm/dd",
    "system",
  ]),
  preferredTimeFormat: z.enum(["12-hours", "24-hours", "system"]),
  firstDayOfWeek: z
    .enum(["sunday", "monday", "saturday"], {
      message: "First day of week must be 'sunday', 'monday', or 'saturday'",
    })
    .optional(),
  handedness: z
    .enum(["right-handed", "left-handed"], {
      message: "Handedness must be either 'right-handed' or 'left-handed'",
    })
    .optional(),
  hideConnectionIndicator: z
    .enum([ToggleState.ENABLE, ToggleState.DISABLE], {
      message: "Hide connection indicator must be either 'enable' or 'disable'",
    })
    .optional(),
  searchMode: z
    .enum(SearchModes, {
      message: "Search mode must be 'smart', 'ranked' or 'substring'",
    })
    .optional(),
});

export type UserSettingsInput = z.infer<typeof userSettingsSchema>;
export type EditorSettingsInput = z.infer<typeof editorSettingsSchema>;
export type ChecklistSettingsInput = z.infer<typeof checklistSettingsSchema>;
export type KanbanSettingsInput = z.infer<typeof kanbanSettingsSchema>;
export type HomeWidgetsSettingsInput = z.infer<typeof homeWidgetsSettingsSchema>;
export type FileSettingsInput = z.infer<typeof fileSettingsSchema>;
export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;

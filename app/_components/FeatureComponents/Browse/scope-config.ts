import { BrowseScope } from "@/app/_consts/browse";
import { BOARD_CARD_COLUMNS, LIST_CARD_COLUMNS, NOTE_PAGE_COLUMNS } from "@/app/_consts/columns";
import { EmptyIllustrations } from "@/app/_components/GlobalComponents/Cards/Parts/EmptyIllustration";

interface ScopeConfig {
  empty: EmptyIllustrations;
  title: string;
  subtitle: string;
  createLabel: string;
  className: string;
  columns: Record<string, number>;
}

export const SCOPE_CONFIG: Record<BrowseScope, ScopeConfig> = {
  [BrowseScope.NOTES]: {
    empty: EmptyIllustrations.NOTES,
    title: "notes.allNotes",
    subtitle: "notes.browseAndManage",
    createLabel: "notes.newNote",
    className: "jotty-notes-page",
    columns: NOTE_PAGE_COLUMNS,
  },
  [BrowseScope.CHECKLISTS]: {
    empty: EmptyIllustrations.CHECKLISTS,
    title: "checklists.allChecklists",
    subtitle: "checklists.browseAndManage",
    createLabel: "checklists.newChecklist",
    className: "jotty-lists-page",
    columns: LIST_CARD_COLUMNS,
  },
  [BrowseScope.BOARDS]: {
    empty: EmptyIllustrations.BOARDS,
    title: "kanban.boards",
    subtitle: "tasks.browseAndManageTaskLists",
    createLabel: "kanban.newBoard",
    className: "jotty-lists-page",
    columns: BOARD_CARD_COLUMNS,
  },
};

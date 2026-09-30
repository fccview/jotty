import { ToolErrorKind, type ErrorHints } from "./errors.ts";

export interface CatalogEntry {
  id: string;
  defaults?: Record<string, unknown>;
  pick?: string;
  omit?: string[];
  hints?: ErrorHints;
}

const SUMMARY_PAGE = { view: "summary", limit: 25 };

const CARD_NOT_FOUND = "list_boards gives the board uuid and get_board lists its cards with their ids.";

export const CATALOG: CatalogEntry[] = [
  { id: "search", omit: ["id"] },
  { id: "listCategories" },
  { id: "getSummary" },
  { id: "getCurrentUser" },
  { id: "listNotes", defaults: SUMMARY_PAGE },
  { id: "getNote" },
  { id: "getNotes" },
  { id: "createNote" },
  { id: "updateNote" },
  { id: "patchNote" },
  { id: "tagNote" },
  { id: "listTags" },
  { id: "deleteNote" },
  { id: "listChecklists", defaults: SUMMARY_PAGE },
  { id: "getChecklist" },
  { id: "createChecklist" },
  { id: "updateChecklist" },
  { id: "deleteChecklist" },
  { id: "createChecklistItem" },
  { id: "updateChecklistItem" },
  { id: "deleteChecklistItem" },
  { id: "checkChecklistItem" },
  { id: "uncheckChecklistItem" },
  { id: "listBoards", defaults: SUMMARY_PAGE },
  { id: "getBoard" },
  { id: "createBoard" },
  { id: "createBoardItem" },
  { id: "updateBoardItem", pick: "item" },
  { id: "moveBoardItem", pick: "item" },
  {
    id: "assignAgent",
    pick: "item",
    hints: {
      [ToolErrorKind.Input]:
        "The agent id has to be listed in the Agents section of the board's spec note. get_task_context shows the spec status and the agents it lists. Add a missing agent to that section with patch_note, and pin a spec with set_board_spec when the board has none. An empty agent clears the card.",
      [ToolErrorKind.NotFound]: CARD_NOT_FOUND,
    },
  },
  {
    id: "setBoardSpec",
    hints: {
      [ToolErrorKind.Input]:
        "noteId has to be the uuid of a note you can read that isn't encrypted. search or list_notes gives it. An empty noteId unpins the spec.",
    },
  },
  { id: "getTaskContext", hints: { [ToolErrorKind.NotFound]: CARD_NOT_FOUND } },
  {
    id: "listAgentTasks",
    defaults: { limit: 25 },
    hints: {
      [ToolErrorKind.Input]:
        "agent is one exact agent id, boardId a board uuid, and status a comma separated list of status ids that get_board shows.",
    },
  },
  { id: "getRelated" },
  { id: "getBrain" },
  { id: "listOrphans" },
  {
    id: "connectItems",
    hints: {
      [ToolErrorKind.Input]:
        "style=mention only works when the source note already has the target's title as plain text. style=append always works and adds the link at the end.",
    },
  },
  {
    id: "disconnectItems",
    hints: {
      [ToolErrorKind.NotFound]: "get_related on the source lists what it links to. This tool doesn't remove [[wikilinks]].",
    },
  },
  { id: "listShares", defaults: { limit: 25 } },
  { id: "listDocs" },
  { id: "readDoc" },
  { id: "listDuplicateUuids" },
  { id: "repairDuplicateUuid" },
];

export const CURATED_OPERATIONS = CATALOG.map((entry) => entry.id);

export const catalogEntry = (operationId: string): CatalogEntry | undefined =>
  CATALOG.find((entry) => entry.id === operationId);

export const toolNameOf = (operationId: string): string =>
  operationId.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

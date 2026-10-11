import { ToolErrorKind, type ErrorHints } from "./errors.ts";

export interface CatalogEntry {
  id: string;
  defaults?: Record<string, unknown>;
  pick?: string;
  omit?: string[];
  hints?: ErrorHints;
}

const SUMMARY_PAGE = { view: "summary", limit: 25 };

const CARD_NOT_FOUND =
  "list_boards gives the board uuid and get_board lists its cards with their ids. A card id also works without the board uuid in front of it.";

const CARD_NOISE = ["history", "timeEntries", "order", "createdBy", "createdAt"];

const FIND_HINT =
  "find has to appear exactly once. Re-read the note with get_note and copy the text exactly, adding nearby text when it shows up more than once. The end of the note counts as a line end.";

export const CATALOG: CatalogEntry[] = [
  { id: "search", omit: ["id"] },
  { id: "listCategories" },
  { id: "getSummary" },
  { id: "getCurrentUser" },
  { id: "listNotes", defaults: SUMMARY_PAGE },
  { id: "getNote" },
  { id: "getNotes" },
  { id: "createNote", omit: ["content"] },
  { id: "updateNote", omit: ["content"] },
  { id: "patchNote", hints: { [ToolErrorKind.Input]: FIND_HINT } },
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
  { id: "createBoardItem", omit: CARD_NOISE },
  { id: "updateBoardItem", pick: "item", omit: CARD_NOISE },
  {
    id: "moveBoardItem",
    pick: "item",
    omit: CARD_NOISE,
    hints: { [ToolErrorKind.Input]: "Move it to one of the column ids the message lists." },
  },
  {
    id: "assignAgent",
    pick: "item",
    omit: CARD_NOISE,
    hints: {
      [ToolErrorKind.Input]:
        "Agent ids use 1-64 letters, digits, dots, dashes or underscores with no spaces, and Jotty lowercases them. Any id works, and a warning says when the spec's Agents section doesn't list it. An empty agent clears the card.",
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
  { id: "listDuplicateUuids" },
  { id: "repairDuplicateUuid" },
];

export const CURATED_OPERATIONS = CATALOG.map((entry) => entry.id);

export const catalogEntry = (operationId: string): CatalogEntry | undefined =>
  CATALOG.find((entry) => entry.id === operationId);

export const toolNameOf = (operationId: string): string =>
  operationId.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

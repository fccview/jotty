export interface CatalogEntry {
  id: string;
  defaults?: Record<string, unknown>;
  pick?: string;
  omit?: string[];
}

const SUMMARY_PAGE = { view: "summary", limit: 25 };

export const CATALOG: CatalogEntry[] = [
  { id: "search", omit: ["id"] },
  { id: "listCategories" },
  { id: "getSummary" },
  { id: "getCurrentUser" },
  { id: "listNotes", defaults: SUMMARY_PAGE },
  { id: "getNote" },
  { id: "createNote" },
  { id: "updateNote" },
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
];

export const CURATED_OPERATIONS = CATALOG.map((entry) => entry.id);

export const catalogEntry = (operationId: string): CatalogEntry | undefined =>
  CATALOG.find((entry) => entry.id === operationId);

export const toolNameOf = (operationId: string): string =>
  operationId.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

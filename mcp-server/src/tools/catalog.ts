export const CURATED_OPERATIONS = [
  "search",
  "listCategories",
  "getSummary",
  "getCurrentUser",
  "listNotes",
  "getNote",
  "createNote",
  "updateNote",
  "deleteNote",
  "listChecklists",
  "createChecklist",
  "updateChecklist",
  "deleteChecklist",
  "createChecklistItem",
  "updateChecklistItem",
  "deleteChecklistItem",
  "checkChecklistItem",
  "uncheckChecklistItem",
  "listBoards",
  "getBoard",
  "createBoard",
  "createBoardItem",
  "updateBoardItem",
  "moveBoardItem",
] as const;

export const toolNameOf = (operationId: string): string =>
  operationId.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

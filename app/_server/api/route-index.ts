import * as adminRebuildIndex from "@/app/api/admin/rebuild-index/route";
import * as categories from "@/app/api/categories/route";
import * as checklists from "@/app/api/checklists/route";
import * as checklistsListId from "@/app/api/checklists/[listId]/route";
import * as checklistsListIdItems from "@/app/api/checklists/[listId]/items/route";
import * as checklistsListIdItemsItemIndex from "@/app/api/checklists/[listId]/items/[itemIndex]/route";
import * as checklistsListIdItemsItemIndexCheck from "@/app/api/checklists/[listId]/items/[itemIndex]/check/route";
import * as checklistsListIdItemsItemIndexUncheck from "@/app/api/checklists/[listId]/items/[itemIndex]/uncheck/route";
import * as checklistsListIdItemsReorder from "@/app/api/checklists/[listId]/items/reorder/route";
import * as docs from "@/app/api/docs/route";
import * as exports from "@/app/api/exports/route";
import * as exportsFilename from "@/app/api/exports/[filename]/route";
import * as health from "@/app/api/health/route";
import * as kanban from "@/app/api/kanban/route";
import * as kanbanBoardId from "@/app/api/kanban/[boardId]/route";
import * as kanbanBoardIdCalendar from "@/app/api/kanban/[boardId]/calendar/route";
import * as kanbanBoardIdItems from "@/app/api/kanban/[boardId]/items/route";
import * as kanbanBoardIdItemsItemId from "@/app/api/kanban/[boardId]/items/[itemId]/route";
import * as kanbanBoardIdItemsItemIdAssign from "@/app/api/kanban/[boardId]/items/[itemId]/assign/route";
import * as kanbanBoardIdItemsItemIdReminder from "@/app/api/kanban/[boardId]/items/[itemId]/reminder/route";
import * as kanbanBoardIdItemsItemIdStatus from "@/app/api/kanban/[boardId]/items/[itemId]/status/route";
import * as kanbanBoardIdStatuses from "@/app/api/kanban/[boardId]/statuses/route";
import * as logs from "@/app/api/logs/route";
import * as logsCleanup from "@/app/api/logs/cleanup/route";
import * as logsExport from "@/app/api/logs/export/route";
import * as logsStats from "@/app/api/logs/stats/route";
import * as notes from "@/app/api/notes/route";
import * as notesNoteId from "@/app/api/notes/[noteId]/route";
import * as openapiJson from "@/app/api/openapi.json/route";
import * as search from "@/app/api/search/route";
import * as summary from "@/app/api/summary/route";
import * as tasks from "@/app/api/tasks/route";
import * as tasksTaskId from "@/app/api/tasks/[taskId]/route";
import * as tasksTaskIdItems from "@/app/api/tasks/[taskId]/items/route";
import * as tasksTaskIdItemsItemIndex from "@/app/api/tasks/[taskId]/items/[itemIndex]/route";
import * as tasksTaskIdItemsItemIndexStatus from "@/app/api/tasks/[taskId]/items/[itemIndex]/status/route";
import * as tasksTaskIdStatuses from "@/app/api/tasks/[taskId]/statuses/route";
import * as tasksTaskIdStatusesStatusId from "@/app/api/tasks/[taskId]/statuses/[statusId]/route";
import * as user from "@/app/api/user/route";
import * as userUsername from "@/app/api/user/[username]/route";

export const ROUTE_MODULES: object[] = [
  adminRebuildIndex,
  categories,
  checklists,
  checklistsListId,
  checklistsListIdItems,
  checklistsListIdItemsItemIndex,
  checklistsListIdItemsItemIndexCheck,
  checklistsListIdItemsItemIndexUncheck,
  checklistsListIdItemsReorder,
  docs,
  exports,
  exportsFilename,
  health,
  kanban,
  kanbanBoardId,
  kanbanBoardIdCalendar,
  kanbanBoardIdItems,
  kanbanBoardIdItemsItemId,
  kanbanBoardIdItemsItemIdAssign,
  kanbanBoardIdItemsItemIdReminder,
  kanbanBoardIdItemsItemIdStatus,
  kanbanBoardIdStatuses,
  logs,
  logsCleanup,
  logsExport,
  logsStats,
  notes,
  notesNoteId,
  openapiJson,
  search,
  summary,
  tasks,
  tasksTaskId,
  tasksTaskIdItems,
  tasksTaskIdItemsItemIndex,
  tasksTaskIdItemsItemIndexStatus,
  tasksTaskIdStatuses,
  tasksTaskIdStatusesStatusId,
  user,
  userUsername,
];

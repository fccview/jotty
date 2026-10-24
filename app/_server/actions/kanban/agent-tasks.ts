import { Checklist, KanbanStatus, Result } from "@/app/_types";
import { AgentTask, AgentTaskFilter } from "@/app/_types/agents";
import { isKanbanType } from "@/app/_types/enums";
import { DEFAULT_KANBAN_STATUSES } from "@/app/_consts/kanban";
import { ARCHIVED_DIR_NAME } from "@/app/_consts/files";
import { isUuid } from "@/app/_consts/identity";
import { getListById, getUserChecklists } from "@/app/_server/actions/checklist/queries";
import {
  CardSpot,
  cardStatus,
  flatCards,
  isCardDone,
  statusLabel,
} from "@/app/_utils/kanban/card-tree";

const _wanted = ({ item }: CardSpot, filter: AgentTaskFilter): boolean => {
  if (!item.agent || item.isArchived) return false;
  if (filter.agent && item.agent !== filter.agent) return false;
  if (!filter.includeCompleted && isCardDone(item)) return false;
  return !filter.statuses?.length || filter.statuses.includes(cardStatus(item));
};

const _taskOf = (board: Checklist, statuses: KanbanStatus[], { item, parentId }: CardSpot): AgentTask => {
  const status = cardStatus(item);

  return {
    boardId: board.uuid,
    boardTitle: board.title,
    specNote: board.specNote ?? null,
    itemId: item.id,
    ...(parentId && { parentId }),
    text: item.text,
    status,
    statusLabel: statusLabel(statuses, status),
    completed: isCardDone(item),
    agent: item.agent ?? "",
    ...(item.assignee && { assignee: item.assignee }),
    ...(item.priority && { priority: item.priority }),
    ...(item.lastModifiedAt && { lastModifiedAt: item.lastModifiedAt }),
  };
};

const _boardTasks = (board: Checklist, filter: AgentTaskFilter): AgentTask[] => {
  const statuses = board.statuses || DEFAULT_KANBAN_STATUSES;

  return flatCards(board.items)
    .filter((spot) => _wanted(spot, filter))
    .map((spot) => _taskOf(board, statuses, spot));
};

const _isArchived = (list: Checklist): boolean =>
  (list.category || "").split("/").includes(ARCHIVED_DIR_NAME);

const _oneBoard = async (username: string, boardId: string): Promise<Checklist[]> => {
  if (!isUuid(boardId)) return [];
  const board = await getListById(boardId, username);
  return board && !_isArchived(board) ? [board] : [];
};

const _lists = async (username: string, boardId?: string): Promise<Result<Checklist[]>> =>
  boardId
    ? { success: true, data: await _oneBoard(username, boardId) }
    : ((await getUserChecklists({ username })) as Result<Checklist[]>);

export const agentTasks = async (
  username: string,
  filter: AgentTaskFilter,
): Promise<Result<AgentTask[]>> => {
  const lists = await _lists(username, filter.boardId);
  if (!lists.success || !lists.data) {
    return { success: false, error: lists.error || "Failed to fetch boards" };
  }

  const boards = lists.data.filter(
    (list) => isKanbanType(list.type) && (!filter.boardId || list.uuid === filter.boardId),
  );

  return { success: true, data: boards.flatMap((board) => _boardTasks(board, filter)) };
};

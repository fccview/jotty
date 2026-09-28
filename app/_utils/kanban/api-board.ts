import { NextRequest, NextResponse } from "next/server";
import { listUuid } from "@/app/_utils/api-utils";
import { guard } from "@/app/_utils/api-list-utils";
import { getListById } from "@/app/_server/actions/checklist/queries";
import { refuse } from "@/app/_server/api/define-route";
import { PermissionTypes, isKanbanType } from "@/app/_types/enums";
import { Checklist, Item } from "@/app/_types";

export const BOARD_NOT_FOUND = "Board not found";
export const NOT_A_BOARD = "Not a kanban board";
export const CARD_NOT_FOUND = "Item not found";

interface BoardNeeds {
  permission?: PermissionTypes;
  itemId?: string;
}

type BoardLookup =
  | { board: Checklist; card?: Item; refused?: undefined }
  | { board?: undefined; card?: undefined; refused: Response };

const _cardIn = (items: Item[], id: string): Item | undefined => {
  for (const item of items) {
    if (item.id === id) return item;
    const nested = item.children ? _cardIn(item.children, id) : undefined;
    if (nested) return nested;
  }
  return undefined;
};

export const boardFor = async (
  request: NextRequest,
  boardId: string,
  username: string,
  { permission, itemId }: BoardNeeds = {},
): Promise<BoardLookup> => {
  const uuid = await listUuid(request, boardId, username);
  const board = uuid ? await getListById(uuid, username) : undefined;
  if (!board) return { refused: refuse(BOARD_NOT_FOUND, 404) };
  if (!isKanbanType(board.type)) return { refused: refuse(NOT_A_BOARD, 400) };

  const denied = await guard(username, board, permission);
  if (denied) return { refused: denied };

  if (!itemId) return { board };
  const card = _cardIn(board.items, itemId);
  return card ? { board, card } : { refused: refuse(CARD_NOT_FOUND, 404) };
};

export const cardChanged = (board: Checklist | undefined, itemId: string) =>
  NextResponse.json({
    success: true,
    data: board,
    item: board ? _cardIn(board.items, itemId) : undefined,
  });

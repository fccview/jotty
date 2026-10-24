import { NextRequest, NextResponse } from "next/server";
import { listUuid } from "@/app/_utils/api-utils";
import { guard } from "@/app/_utils/api-list-utils";
import { getListById } from "@/app/_server/actions/checklist/queries";
import { refuse } from "@/app/_server/api/define-route";
import { PermissionTypes, isKanbanType } from "@/app/_types/enums";
import { Checklist, Item } from "@/app/_types";
import { isCardRef } from "./card-keys";

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

const _cardIn = (items: Item[], matches: (id: string) => boolean): Item | undefined => {
  for (const item of items) {
    if (matches(item.id)) return item;
    const nested = item.children ? _cardIn(item.children, matches) : undefined;
    if (nested) return nested;
  }
  return undefined;
};

export const cardOn = (board: Checklist, ref: string): Item | undefined =>
  _cardIn(board.items, (id) => isCardRef(board.uuid, id, ref));

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
  const card = cardOn(board, itemId);
  return card ? { board, card } : { refused: refuse(CARD_NOT_FOUND, 404) };
};

type CardLookup =
  | { board: Checklist; card: Item; refused?: undefined }
  | { board?: undefined; card?: undefined; refused: Response };

export const cardFor = async (
  request: NextRequest,
  boardId: string,
  username: string,
  itemId: string,
  permission?: PermissionTypes,
): Promise<CardLookup> => {
  const found = await boardFor(request, boardId, username, { permission, itemId });
  if (found.refused) return { refused: found.refused };
  return found.card ? { board: found.board, card: found.card } : { refused: refuse(CARD_NOT_FOUND, 404) };
};

export const cardChanged = (board: Checklist | undefined, itemId: string, warning?: string) =>
  NextResponse.json({
    success: true,
    data: board,
    item: board ? _cardIn(board.items, (id) => id === itemId) : undefined,
    ...(warning && { warning }),
  });

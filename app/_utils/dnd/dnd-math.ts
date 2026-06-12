import { DragPoint, DragRect, ListItemRect } from "@/app/_types/dnd";
import { CARD_GAP_PX } from "@/app/_consts/dnd";

const _contains = (rect: DragRect, point: DragPoint): boolean =>
  point.x >= rect.left &&
  point.x <= rect.left + rect.width &&
  point.y >= rect.top &&
  point.y <= rect.top + rect.height;

export const findDropList = (
  point: DragPoint,
  lists: Map<string, DragRect>,
): string | null => {
  let nearest: string | null = null;
  let nearestDist = Infinity;
  let contained: string | null = null;

  lists.forEach((rect, id) => {
    if (contained) return;
    if (_contains(rect, point)) {
      contained = id;
      return;
    }
    const overlapsY = point.y >= rect.top && point.y <= rect.top + rect.height;
    if (!overlapsY) return;
    const dist = Math.abs(point.x - (rect.left + rect.width / 2));
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = id;
    }
  });

  return contained || nearest;
};

export const projectIndex = (
  pointerY: number,
  items: ListItemRect[],
  activeId: string,
): number => {
  let index = 0;
  for (const entry of items) {
    if (entry.id === activeId) continue;
    const midY = entry.rect.top + entry.rect.height / 2;
    if (pointerY > midY) index += 1;
  }
  return index;
};

export const displaceFor = (
  effIndex: number,
  activeEff: number | null,
  targetIndex: number | null,
  dragHeight: number,
): number => {
  if (targetIndex === null) return 0;
  const delta = dragHeight + CARD_GAP_PX;

  if (activeEff === null) {
    return effIndex >= targetIndex ? delta : 0;
  }
  if (targetIndex <= effIndex && effIndex < activeEff) return delta;
  if (activeEff <= effIndex && effIndex < targetIndex) return -delta;
  return 0;
};

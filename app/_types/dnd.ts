export enum DragPhase {
  IDLE = "idle",
  DRAGGING = "dragging",
}

export interface DragPoint {
  x: number;
  y: number;
}

export interface DragRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface DragSize {
  width: number;
  height: number;
}

export interface DropResult {
  itemId: string;
  sourceListId: string;
  sourceIndex: number;
  targetListId: string;
  targetIndex: number;
}

export interface ListItemRect {
  id: string;
  index: number;
  rect: DragRect;
}

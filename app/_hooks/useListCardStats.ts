"use client";

import { useMemo } from "react";
import { Checklist } from "@/app/_types";
import { isKanbanType } from "@/app/_types/enums";
import { countItems } from "@/app/_utils/checklist-count-utils";
import { boardAssignees, boardTrackedSeconds } from "@/app/_utils/kanban/board-utils";

export const useListCardStats = (list: Checklist) => {
  const isBoard = isKanbanType(list.type);
  const { total, completed } = useMemo(
    () => countItems(list.items, list.type),
    [list.items, list.type],
  );
  const assignees = useMemo(
    () => (isBoard ? boardAssignees(list.items) : []),
    [isBoard, list.items],
  );
  const seconds = useMemo(
    () => (isBoard ? boardTrackedSeconds(list.items) : 0),
    [isBoard, list.items],
  );

  return { isBoard, total, completed, assignees, seconds };
};

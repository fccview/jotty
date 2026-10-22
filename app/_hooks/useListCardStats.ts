"use client";

import { useMemo } from "react";
import { Checklist } from "@/app/_types";
import { isKanbanType } from "@/app/_types/enums";
import { listSummaryOf } from "@/app/_utils/browse/list-summary-utils";

export const useListSummary = (list: Checklist) => useMemo(() => listSummaryOf(list), [list]);

export const useListCardStats = (list: Checklist) => {
  const summary = useListSummary(list);
  const { total, completed, assignees, seconds } = summary;

  return { isBoard: isKanbanType(list.type), total, completed, assignees, seconds, summary };
};

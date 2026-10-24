"use client";

import { useEffect, useState } from "react";
import type { AdjacentNotes } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { fetchAdjacentNotes } from "@/app/_utils/ui-lookups";

const NONE: AdjacentNotes = { prev: null, next: null, currentIndex: -1, total: 0 };

export const useAdjacentNotes = (currentUuid: string): AdjacentNotes => {
  const { selectedFilter, sidebar } = useAppMode();
  const [adjacent, setAdjacent] = useState<AdjacentNotes>(NONE);
  const stamp = sidebar.notes?.stamp;

  useEffect(() => {
    let live = true;
    fetchAdjacentNotes(currentUuid, selectedFilter)
      .then((result) => {
        if (!live) return;
        if (result.success && result.data) setAdjacent(result.data);
        else console.error("Could not find neighbouring notes:", result.error);
      })
      .catch((error) => console.error("Could not find neighbouring notes:", error));
    return () => {
      live = false;
    };
  }, [currentUuid, selectedFilter, stamp]);

  return adjacent;
};

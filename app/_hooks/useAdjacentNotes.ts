"use client";

import { useMemo } from "react";
import { Note } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";

interface AdjacentNotesResult {
  prev: Partial<Note> | null;
  next: Partial<Note> | null;
  currentIndex: number;
  total: number;
}

export const useAdjacentNotes = (currentId: string): AdjacentNotesResult => {
  const { notes, selectedFilter } = useAppMode();

  return useMemo(() => {
    let filteredNotes = notes;

    if (selectedFilter?.type === "category" && selectedFilter.value) {
      filteredNotes = notes.filter(
        (n) => n.category === selectedFilter.value,
      );
    } else if (selectedFilter?.type === "tag" && selectedFilter.value) {
      filteredNotes = notes.filter((n) =>
        n.tags?.includes(selectedFilter.value),
      );
    }

    const currentIndex = filteredNotes.findIndex((n) => n.id === currentId);

    if (currentIndex === -1) {
      return { prev: null, next: null, currentIndex: -1, total: filteredNotes.length };
    }

    return {
      prev: currentIndex > 0 ? filteredNotes[currentIndex - 1] : null,
      next: currentIndex < filteredNotes.length - 1 ? filteredNotes[currentIndex + 1] : null,
      currentIndex,
      total: filteredNotes.length,
    };
  }, [notes, selectedFilter, currentId]);
};

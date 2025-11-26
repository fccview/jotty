"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DragEndEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Note, Category, User } from "@/app/_types";
import { togglePin, updatePinnedOrder } from "@/app/_server/actions/dashboard";
import { ItemTypes } from "../_types/enums";

interface UseNotesHomeProps {
  notes: Note[];
  categories: Category[];
  user: User | null;
}

export const useNotesHome = ({
  notes,
  categories,
  user,
}: UseNotesHomeProps) => {
  const router = useRouter();
  const [isTogglingPin, setIsTogglingPin] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedItemWidth, setDraggedItemWidth] = useState<number | null>(null);
  const pinnedNotes = user?.pinnedNotes || [];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);

    const rect = event.active.rect?.current || event.active.data?.current?.sortable?.rect;
    if (rect) {
      setDraggedItemWidth(rect.initial?.width || 0);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDraggedItemWidth(null);

    if (!over || active.id === over.id) return;

    const pinned = getPinnedNotes();
    const oldIndex = pinned.findIndex(
      (note) => (note.uuid || note.id) === active.id
    );
    const newIndex = pinned.findIndex(
      (note) => (note.uuid || note.id) === over.id
    );

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(pinned, oldIndex, newIndex);
    const newPinnedPaths = newOrder.map(
      (note) =>
        `${note.category || "Uncategorized"}/${note.uuid || note.id}`
    );

    try {
      const result = await updatePinnedOrder(newPinnedPaths, "note");
      if (result.success) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to update pinned order:", error);
    }
  };

  const getPinnedNotes = () => {
    return pinnedNotes
      .map((path) => {
        return notes.find((note) => {
          const uuidPath = `${note.category || "Uncategorized"}/${note.uuid || note.id}`;
          const idPath = `${note.category || "Uncategorized"}/${note.id}`;
          return uuidPath === path || idPath === path;
        });
      })
      .filter(Boolean) as Note[];
  };

  const getRecentNotes = () => {
    const pinned = getPinnedNotes();
    const pinnedIds = new Set(pinned.map((note) => note.id));
    return notes
      .filter((note) => !pinnedIds.has(note.id))
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 12);
  };

  const handleTogglePin = async (note: Note) => {
    if (isTogglingPin) return;

    setIsTogglingPin(note.id);
    try {
      const result = await togglePin(
        note.uuid || note.id,
        note.category || "Uncategorized",
        ItemTypes.NOTE
      );
      if (result.success) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    } finally {
      setIsTogglingPin(null);
    }
  };

  const isNotePinned = (note: Note) => {
    const uuidPath = `${note.category || "Uncategorized"}/${note.uuid || note.id}`;
    const idPath = `${note.category || "Uncategorized"}/${note.id}`;
    return pinnedNotes.includes(uuidPath) || pinnedNotes.includes(idPath);
  };

  const stats = useMemo(() => {
    const totalNotes = notes.length;
    const totalCategories = categories.length;
    return { totalNotes, totalCategories };
  }, [notes, categories]);

  const breakpointColumnsObj = {
    default: 3,
    1600: 4,
    1599: 3,
    1280: 2,
    1024: 2,
    768: 1,
    640: 1,
  };

  const pinned = getPinnedNotes();
  const recent = getRecentNotes();

  const activeNote = activeId
    ? pinned.find((note) => (note.uuid || note.id) === activeId)
    : null;

  return {
    sensors,
    handleDragStart,
    handleDragEnd,
    pinned,
    recent,
    stats,
    breakpointColumnsObj,
    handleTogglePin,
    isNotePinned,
    isTogglingPin,
    activeNote,
    draggedItemWidth,
  };
};

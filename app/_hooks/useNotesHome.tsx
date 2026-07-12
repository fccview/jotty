"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DragEndEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Note, Category, SanitisedUser } from "@/app/_types";
import { togglePin, updatePinnedOrder } from "@/app/_server/actions/dashboard";
import { ItemTypes } from "../_types/enums";
import { HOMEPAGE_ITEMS_LIMIT } from "@/app/_consts/files";

interface UseNotesHomeProps {
  notes: Note[];
  categories: Category[];
  user: SanitisedUser | null;
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
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);

    const rect =
      event.active.rect?.current || event.active.data?.current?.sortable?.rect;
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
    const oldIndex = pinned.findIndex((note) => note.uuid === active.id);
    const newIndex = pinned.findIndex((note) => note.uuid === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(pinned, oldIndex, newIndex);
    const newPinnedUuids = newOrder.map((note) => note.uuid || "");

    try {
      const result = await updatePinnedOrder(newPinnedUuids, ItemTypes.NOTE);
      if (result.success) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to update pinned order:", error);
    }
  };

  const getPinnedNotes = () => {
    return pinnedNotes
      .map((entry) =>
        notes.find(
          (note) =>
            entry === note.uuid || entry.split("/").pop() === note.uuid,
        ),
      )
      .filter(Boolean) as Note[];
  };

  const getRecentNotes = () => {
    const pinned = getPinnedNotes();
    const pinnedUuids = new Set(pinned.map((note) => note.uuid));
    return notes
      .filter((note) => !pinnedUuids.has(note.uuid))
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  };

  const handleTogglePin = async (note: Note) => {
    if (isTogglingPin || !note.uuid) return;

    setIsTogglingPin(note.uuid);
    try {
      const result = await togglePin(note.uuid, ItemTypes.NOTE);
      if (result.success) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    } finally {
      setIsTogglingPin(null);
    }
  };

  const isNotePinned = (note: Note) =>
    pinnedNotes.some(
      (entry) => entry === note.uuid || entry.split("/").pop() === note.uuid,
    );

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
    ? pinned.find((note) => note.uuid === activeId)
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

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
import { Checklist, User } from "@/app/_types";
import { isItemCompleted } from "@/app/_utils/checklist-utils";
import { parseChecklistContent } from "@/app/_utils/client-parser-utils";
import { useHomeFilter } from "@/app/_utils/home-filter-store";
import { togglePin, updatePinnedOrder } from "@/app/_server/actions/dashboard";
import { ItemTypes } from "../_types/enums";
import { useTranslations } from 'next-intl';

interface UseChecklistHomeProps {
  lists: Checklist[];
  user: User | null;
}

export const useChecklistHome = ({ lists, user }: UseChecklistHomeProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { checklistFilter, setChecklistFilter } = useHomeFilter();
  const [isTogglingPin, setIsTogglingPin] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedItemWidth, setDraggedItemWidth] = useState<number | null>(null);
  const pinnedLists = user?.pinnedLists || [];

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
    useSensor(KeyboardSensor)
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

    const pinned = getPinnedLists();
    const oldIndex = pinned.findIndex(
      (list) => (list.uuid || list.id) === active.id
    );
    const newIndex = pinned.findIndex(
      (list) => (list.uuid || list.id) === over.id
    );

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(pinned, oldIndex, newIndex);
    const newPinnedPaths = newOrder.map(
      (list) =>
        `${list.category || "Uncategorized"}/${list.uuid || list.id}`
    );

    try {
      const result = await updatePinnedOrder(
        newPinnedPaths,
        ItemTypes.CHECKLIST
      );
      if (result.success) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to update pinned order:", error);
    }
  };

  const getPinnedLists = () => {
    const pinned = pinnedLists
      .map((path) => {
        return lists.find((list) => {
          const uuidPath = `${list.category || "Uncategorized"}/${list.uuid || list.id}`;
          const idPath = `${list.category || "Uncategorized"}/${list.id}`;
          return uuidPath === path || idPath === path;
        });
      })
      .filter(Boolean) as Checklist[];

    if (checklistFilter === "completed") {
      return pinned.filter(
        (list) =>
          list.items.length > 0 &&
          list.items.every((item) => isItemCompleted(item, list.type))
      );
    } else if (checklistFilter === "incomplete") {
      return pinned.filter(
        (list) =>
          list.items.length === 0 ||
          !list.items.every((item) => isItemCompleted(item, list.type))
      );
    }

    return pinned;
  };

  const getFilteredLists = () => {
    let filtered = [...lists];

    if (checklistFilter === "completed") {
      filtered = filtered.filter(
        (list) =>
          list.items.length > 0 &&
          list.items.every((item) => isItemCompleted(item, list.type))
      );
    } else if (checklistFilter === "incomplete") {
      filtered = filtered.filter(
        (list) =>
          list.items.length === 0 ||
          !list.items.every((item) => isItemCompleted(item, list.type))
      );
    }

    return filtered;
  };

  const getRecentLists = () => {
    const filtered = getFilteredLists();
    const pinned = getPinnedLists();
    const pinnedIds = new Set(pinned.map((list) => list.id));

    return filtered
      .filter((list) => !pinnedIds.has(list.id))
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 12);
  };

  const handleTogglePin = async (list: Checklist) => {
    if (isTogglingPin) return;

    setIsTogglingPin(list.id);
    try {
      const result = await togglePin(
        list.uuid || list.id,
        list.category || "Uncategorized",
        ItemTypes.CHECKLIST
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

  const isListPinned = (list: Checklist) => {
    const uuidPath = `${list.category || "Uncategorized"}/${list.uuid || list.id}`;
    const idPath = `${list.category || "Uncategorized"}/${list.id}`;
    return pinnedLists.includes(uuidPath) || pinnedLists.includes(idPath);
  };

  const stats = useMemo(() => {
    const totalLists = lists.length;

    let totalItems = 0;
    let completedItems = 0;

    lists.forEach((list) => {
      let items = list.items;

      if ("rawContent" in list && (list as any).rawContent) {
        const parsedData = parseChecklistContent((list as any).rawContent, list.id);
        items = parsedData.items;
      }

      totalItems += items?.length || 0;
      completedItems += items?.filter((item) => isItemCompleted(item, list.type)).length || 0;
    });

    const taskLists = lists.filter((list) => list.type === "task").length;

    return { totalLists, totalItems, completedItems, taskLists };
  }, [lists]);

  const completionRate =
    stats.totalItems > 0
      ? Math.round((stats.completedItems / stats.totalItems) * 100)
      : 0;

  const pinned = getPinnedLists();
  const recent = getRecentLists();
  const taskLists = recent.filter((list) => list.type === "task");
  const simpleLists = recent.filter((list) => list.type === "simple");

  const filterOptions = [
    { id: "all", name: t("checklists.allChecklists") },
    { id: "completed", name: t("tasks.completed") },
    { id: "incomplete", name: t("checklists.incomplete") },
  ];

  const activeList = activeId
    ? pinned.find((list) => (list.uuid || list.id) === activeId)
    : null;

  return {
    sensors,
    handleDragStart,
    handleDragEnd,
    pinned,
    recent,
    taskLists,
    simpleLists,
    stats,
    completionRate,
    filterOptions,
    checklistFilter,
    setChecklistFilter,
    handleTogglePin,
    isListPinned,
    isTogglingPin,
    activeList,
    draggedItemWidth,
  };
};

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    arrayMove,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Checklist, User } from "@/app/_types";
import { isItemCompleted } from "@/app/_utils/checklist-utils";
import { useHomeFilter } from "@/app/_utils/home-filter-store";
import { togglePin, updatePinnedOrder } from "@/app/_server/actions/users";

interface UseChecklistHomeProps {
    lists: Checklist[];
    user: User | null;
}

export const useChecklistHome = ({ lists, user }: UseChecklistHomeProps) => {
    const router = useRouter();
    const { checklistFilter, setChecklistFilter } = useHomeFilter();
    const [isTogglingPin, setIsTogglingPin] = useState<string | null>(null);
    const pinnedLists = user?.pinnedLists || [];

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor)
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const pinned = getPinnedLists();
        const oldIndex = pinned.findIndex(list => list.id === active.id);
        const newIndex = pinned.findIndex(list => list.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        const newOrder = arrayMove(pinned, oldIndex, newIndex);
        const newPinnedPaths = newOrder.map(list => `${list.category || "Uncategorized"}/${list.id}`);

        try {
            const result = await updatePinnedOrder(newPinnedPaths, "list");
            if (result.success) {
                router.refresh();
            }
        } catch (error) {
            console.error("Failed to update pinned order:", error);
        }
    };

    const getPinnedLists = () => {
        const pinned = pinnedLists.map(path => {
            return lists.find(list => {
                const itemPath = `${list.category || "Uncategorized"}/${list.id}`;
                return itemPath === path;
            });
        }).filter(Boolean) as Checklist[];

        if (checklistFilter === "completed") {
            return pinned.filter(list =>
                list.items.length > 0 &&
                list.items.every(item => isItemCompleted(item, list.type))
            );
        } else if (checklistFilter === "incomplete") {
            return pinned.filter(list =>
                list.items.length === 0 ||
                !list.items.every(item => isItemCompleted(item, list.type))
            );
        }

        return pinned;
    };

    const getFilteredLists = () => {
        let filtered = [...lists];

        if (checklistFilter === "completed") {
            filtered = filtered.filter(list =>
                list.items.length > 0 &&
                list.items.every(item => isItemCompleted(item, list.type))
            );
        } else if (checklistFilter === "incomplete") {
            filtered = filtered.filter(list =>
                list.items.length === 0 ||
                !list.items.every(item => isItemCompleted(item, list.type))
            );
        }

        return filtered;
    };

    const getRecentLists = () => {
        const filtered = getFilteredLists();
        const pinned = getPinnedLists();
        const pinnedIds = new Set(pinned.map(list => list.id));

        return filtered
            .filter(list => !pinnedIds.has(list.id))
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 12);
    };

    const handleTogglePin = async (list: Checklist) => {
        if (isTogglingPin) return;

        setIsTogglingPin(list.id);
        try {
            const result = await togglePin(list.id, list.category || "Uncategorized", "list");
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
        const itemPath = `${list.category || "Uncategorized"}/${list.id}`;
        return pinnedLists.includes(itemPath);
    };

    const stats = useMemo(() => {
        const totalLists = lists.length;
        const totalItems = lists.reduce((sum, list) => sum + (list.items?.length || 0), 0);
        const completedItems = lists.reduce((sum, list) =>
            sum + (list.items?.filter(item => item.completed).length || 0), 0);
        const taskLists = lists.filter(list => list.type === "task").length;

        return { totalLists, totalItems, completedItems, taskLists };
    }, [lists]);

    const completionRate = stats.totalItems > 0 ? Math.round((stats.completedItems / stats.totalItems) * 100) : 0;

    const pinned = getPinnedLists();
    const recent = getRecentLists();
    const taskLists = recent.filter((list) => list.type === "task");
    const simpleLists = recent.filter((list) => list.type === "simple");

    const filterOptions = [
        { id: "all", name: "All Checklists" },
        { id: "completed", name: "Completed" },
        { id: "incomplete", name: "Incomplete" },
    ];

    return {
        sensors,
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
    };
};

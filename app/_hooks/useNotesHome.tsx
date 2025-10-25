"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    arrayMove,
} from "@dnd-kit/sortable";
import { Note, Category, User } from "@/app/_types";
import { togglePin, updatePinnedOrder } from "@/app/_server/actions/users";

interface UseNotesHomeProps {
    notes: Note[];
    categories: Category[];
    user: User | null;
}

export const useNotesHome = ({ notes, categories, user }: UseNotesHomeProps) => {
    const router = useRouter();
    const [isTogglingPin, setIsTogglingPin] = useState<string | null>(null);
    const pinnedNotes = user?.pinnedNotes || [];

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor)
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const pinned = getPinnedNotes();
        const oldIndex = pinned.findIndex(note => note.id === active.id);
        const newIndex = pinned.findIndex(note => note.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        const newOrder = arrayMove(pinned, oldIndex, newIndex);
        const newPinnedPaths = newOrder.map(note => `${note.category || "Uncategorized"}/${note.id}`);

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
        return pinnedNotes.map(path => {
            return notes.find(note => {
                const itemPath = `${note.category || "Uncategorized"}/${note.id}`;
                return itemPath === path;
            });
        }).filter(Boolean) as Note[];
    };

    const getRecentNotes = () => {
        const pinned = getPinnedNotes();
        const pinnedIds = new Set(pinned.map(note => note.id));
        return notes
            .filter(note => !pinnedIds.has(note.id))
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 12);
    };

    const handleTogglePin = async (note: Note) => {
        if (isTogglingPin) return;

        setIsTogglingPin(note.id);
        try {
            const result = await togglePin(note.id, note.category || "Uncategorized", "note");
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
        const itemPath = `${note.category || "Uncategorized"}/${note.id}`;
        return pinnedNotes.includes(itemPath);
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

    return {
        sensors,
        handleDragEnd,
        pinned,
        recent,
        stats,
        breakpointColumnsObj,
        handleTogglePin,
        isNotePinned,
        isTogglingPin,
    };
};

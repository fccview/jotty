"use server";

import { getNotes } from "@/app/_server/actions/note";
import { getLists } from "@/app/_server/actions/checklist";
import { getCurrentUser } from "@/app/_server/actions/users";
import { TaskStatus } from "@/app/_types/enums";
import { Result } from "@/app/_types";

export interface UserStats {
    username: string;
    notes: {
        total: number;
        categories: Record<string, number>;
    };
    checklists: {
        total: number;
        categories: Record<string, number>;
        types: Record<string, number>;
    };
    items: {
        total: number;
        completed: number;
        pending: number;
        completionRate: number;
    };
    tasks: {
        total: number;
        completed: number;
        inProgress: number;
        todo: number;
        completionRate: number;
    };
}

export const getUserStats = async (username?: string): Promise<Result<UserStats>> => {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return { success: false, error: "Not authenticated" };
        }

        const targetUsername = username || currentUser.username;

        const notesResult = await getNotes(targetUsername);
        if (!notesResult.success || !notesResult.data) {
            return { success: false, error: notesResult.error || "Failed to fetch notes" };
        }

        const userNotes = notesResult.data.filter(
            (note) => note.owner === targetUsername
        );

        const listsResult = await getLists(targetUsername);
        if (!listsResult.success || !listsResult.data) {
            return { success: false, error: listsResult.error || "Failed to fetch checklists" };
        }

        const userLists = listsResult.data.filter(
            (list) => list.owner === targetUsername
        );

        let totalItems = 0;
        let completedItems = 0;
        let totalTasks = 0;
        let completedTasks = 0;
        let inProgressTasks = 0;
        let todoTasks = 0;

        userLists.forEach((list) => {
            totalItems += list.items.length;

            list.items.forEach((item) => {
                if (item.completed) {
                    completedItems++;
                }

                if (list.type === "task" && item.status) {
                    totalTasks++;
                    switch (item.status) {
                        case TaskStatus.COMPLETED:
                            completedTasks++;
                            break;
                        case TaskStatus.IN_PROGRESS:
                            inProgressTasks++;
                            break;
                        case TaskStatus.TODO:
                            todoTasks++;
                            break;
                    }
                }
            });
        });

        const stats: UserStats = {
            username: targetUsername,
            notes: {
                total: userNotes.length,
                categories: userNotes.reduce((acc, note) => {
                    const category = note.category || "Uncategorized";
                    acc[category] = (acc[category] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>),
            },
            checklists: {
                total: userLists.length,
                categories: userLists.reduce((acc, list) => {
                    const category = list.category || "Uncategorized";
                    acc[category] = (acc[category] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>),
                types: userLists.reduce((acc, list) => {
                    const type = list.type || "simple";
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>),
            },
            items: {
                total: totalItems,
                completed: completedItems,
                pending: totalItems - completedItems,
                completionRate:
                    totalItems > 0
                        ? Math.round((completedItems / totalItems) * 100)
                        : 0,
            },
            tasks: {
                total: totalTasks,
                completed: completedTasks,
                inProgress: inProgressTasks,
                todo: todoTasks,
                completionRate:
                    totalTasks > 0
                        ? Math.round((completedTasks / totalTasks) * 100)
                        : 0,
            },
        };

        return { success: true, data: stats };
    } catch (error) {
        console.error("Error getting user stats:", error);
        return { success: false, error: "Failed to get user stats" };
    }
};

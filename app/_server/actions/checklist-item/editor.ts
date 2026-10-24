import { revalidatePath } from "next/cache";
import path from "path";
import {
  serverWriteFile,
  ensureDir,
} from "@/app/_server/actions/file";
import { getListById } from "@/app/_server/actions/checklist/queries";
import {
  listToMarkdown,
  areAllItemsCompleted,
} from "@/app/_utils/checklist-utils";
import {
  extractHashtagsFromContent,
  normalizeTag,
} from "@/app/_utils/tag-utils";
import { findUserRecord } from "@/app/_server/actions/users/records";
import {
  Checklist,
  Item,
  KanbanPriority,
  Result,
  SanitisedUser,
} from "@/app/_types";
import {
  ItemTypes,
  Modes,
  NotificationTargets,
  PermissionTypes,
  TaskStatus,
} from "@/app/_types/enums";
import { reachableFile } from "@/app/_server/actions/share/queries";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { updateAllChildren, findItem } from "@/app/_utils/item-tree-utils";
import { isKanbanType } from "@/app/_types/enums";
import { notifyUser } from "@/app/_server/actions/notifications/internal";
import { assigneeRefusal } from "@/app/_server/actions/kanban/assignee";
import { agentRefusal, normalAgent } from "@/app/_consts/agents";
import { boardColumns, unknownStatus } from "@/app/_consts/kanban";
import { failedWith } from "@/app/_server/actions/lib/read-only-message";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";

const _editItem = async (
  actor: SanitisedUser,
  checklist: Checklist,
  formData: FormData,
  skipRevalidation: boolean,
): Promise<Result<Checklist>> => {
  try {
    const itemId = formData.get("itemId") as string;
    const completedRaw = formData.get("completed");
    const text = formData.get("text") as string;
    const description = formData.get("description") as string;

    const currentUser = actor?.username;

    if (!currentUser) {
      throw new Error("Not authenticated");
    }

    const filePath = await reachableFile(
      checklist.uuid,
      ItemTypes.CHECKLIST,
      currentUser,
      PermissionTypes.EDIT,
    );

    if (!filePath) {
      throw new Error("Permission denied");
    }

    const stored = await getListById(checklist.uuid, currentUser);

    if (!stored) {
      throw new Error("List not found");
    }

    const assignee = formData.get("assignee") as string | null;
    const previousAssignee = findItem(stored.items, itemId)?.assignee;
    if (assignee && assignee !== previousAssignee) {
      const refusal = await assigneeRefusal(assignee, stored.uuid!);
      if (refusal) return { success: false, error: refusal };
    }

    const agentRaw = formData.get("agent") as string | null;
    const agent = agentRaw === null ? null : normalAgent(agentRaw);
    const agentRefused = agentRefusal(agent ?? "");
    if (agentRefused) return { success: false, error: agentRefused };

    const _updateParentBasedOnChildren = (parent: Item): Item => {
      if ((parent.children || []).length < 1) return parent;
      return { ...parent, completed: areAllItemsCompleted(parent.children!) };
    };

    const _findAndUpdateItem = (items: Item[], itemId: string, updates: Partial<Item>): Item[] =>
      items.map((item) => {
        if (item.id === itemId) {
          let updatedItem = { ...item, ...updates };
          if (updates.completed && item.children && item.children.length > 0) {
            updatedItem.children = updateAllChildren(item.children, true);
          } else if (updates.completed === false && item.children && item.children.length > 0) {
            updatedItem.children = updateAllChildren(item.children, false);
          }
          return updatedItem;
        }
        if (item.children && item.children.length > 0) {
          return _updateParentBasedOnChildren({
            ...item,
            children: _findAndUpdateItem(item.children, itemId, updates),
          });
        }
        return item;
      });

    const now = new Date().toISOString();

    const textInlineTags = text ? extractHashtagsFromContent(text) : [];
    const existingTags = stored.tags || [];
    const mergedTags = text
      ? Array.from(
        new Set([...existingTags.map(normalizeTag), ...textInlineTags]),
      ).filter(Boolean)
      : existingTags;

    const priority = formData.get("priority") as string | null;
    const score = formData.get("score") as string | null;
    const reminder = formData.get("reminder") as string | null;
    const targetDate = formData.get("targetDate") as string | null;
    const startDate = formData.get("startDate") as string | null;
    const estimatedTime = formData.get("estimatedTime") as string | null;

    const updatedList = {
      ...stored,
      items: _findAndUpdateItem(stored.items, itemId, {
        ...(completedRaw !== null && { completed: completedRaw === "true" }),
        ...(text && { text }),
        ...(description !== null &&
          description !== undefined && { description }),
        ...(priority !== null && { priority: (priority || undefined) as KanbanPriority | undefined }),
        ...(score !== null && { score: score ? parseInt(score) : undefined }),
        ...(assignee !== null && { assignee: assignee || undefined }),
        ...(agent !== null && { agent: agent || undefined }),
        ...(reminder !== null && {
          reminder: reminder ? JSON.parse(reminder) : undefined,
        }),
        ...(targetDate !== null && { targetDate: targetDate || undefined }),
        ...(startDate !== null && { startDate: startDate || undefined }),
        ...(estimatedTime !== null && { estimatedTime: estimatedTime ? parseFloat(estimatedTime) : undefined }),
        lastModifiedBy: currentUser,
        lastModifiedAt: now,
      }),
      tags: mergedTags,
      updatedAt: now,
    };

    await ensureDir(path.dirname(filePath));

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    if (!skipRevalidation) {
      try {
        revalidatePath("/");
        revalidatePath(`/checklist/${stored.uuid}`);
      } catch (error) {
        console.warn(
          "Cache revalidation failed, but data was saved successfully:",
          error,
        );
      }
    }

    if (assignee && assignee !== currentUser) {
      const assignedItem = findItem(updatedList.items, itemId);
      try {
        await notifyUser(assignee, {
          type: "assignment",
          title: assignedItem?.text || "New task assigned",
          message: `${currentUser} assigned you to a task in "${stored.title}"`,
          data: {
            itemId: stored.uuid,
            itemType: NotificationTargets.CHECKLIST,
            taskId: itemId,
          },
        });
      } catch (error) {
        console.warn("[checklist-item] assignment notification failed:", error);
      }
    }

    await broadcast({
      type: "checklist",
      action: "updated",
      entityId: stored.uuid,
      username: currentUser,
    });

    return { success: true, data: updatedList as Checklist };
  } catch (error) {
    console.error(
      "Error updating item:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    console.error(
      "Error updating item:",
      error instanceof Error ? error.message : String(error),
    );
    return { success: false, error: await failedWith(error, "Failed to update item") };
  }
};

const _addItem = async (
  actor: SanitisedUser,
  list: Checklist,
  formData: FormData,
  skipRevalidation: boolean,
) => {
  try {
    const text = formData.get("text") as string;
    const status = formData.get("status") as string;
    const timeStr = formData.get("time") as string;
    const description = formData.get("description") as string;
    const currentUser = actor?.username;
    const recurrenceStr = formData.get("recurrence") as string;

    if (!currentUser) {
      throw new Error("Not authenticated");
    }

    const filePath = await reachableFile(
      list.uuid,
      ItemTypes.CHECKLIST,
      currentUser,
      PermissionTypes.EDIT,
    );

    if (!filePath) {
      throw new Error("Permission denied");
    }

    const stored = await getListById(list.uuid, currentUser);

    if (!stored) {
      throw new Error("List not found");
    }

    if (
      status &&
      isKanbanType(stored.type) &&
      !boardColumns(stored.statuses).some((column) => column.id === status)
    ) {
      return { success: false, error: unknownStatus(stored.statuses) };
    }

    let timeEntries: any[] = [];
    if (timeStr && timeStr !== "0") {
      try {
        timeEntries = JSON.parse(timeStr);
      } catch (e) {
        console.error("Failed to parse time entries:", e);
        timeEntries = [];
      }
    }

    const now = new Date().toISOString();

    let recurrence = undefined;
    if (recurrenceStr) {
      try {
        recurrence = JSON.parse(recurrenceStr);

        if (recurrence && !recurrence.nextDue) {
          const { calculateNextOccurrence } =
            await import("@/app/_utils/recurrence-utils");
          recurrence.nextDue = calculateNextOccurrence(
            recurrence.rrule,
            recurrence.dtstart,
          );
        }
      } catch (e) {
        console.error("Failed to parse recurrence:", e);
        recurrence = undefined;
      }
    }

    const getDefaultStatus = (): TaskStatus => {
      if (status) return status as TaskStatus;

      if (stored.statuses && stored.statuses.length > 0) {
        const sortedStatuses = [...stored.statuses].sort(
          (a, b) => a.order - b.order,
        );
        return sortedStatuses[0].id as TaskStatus;
      }

      return TaskStatus.TODO;
    };

    const defaultStatus = isKanbanType(stored.type)
      ? getDefaultStatus()
      : undefined;

    let isSharedBoard = false;
    if (isKanbanType(stored.type)) {
      const { usersWithAccess } = await import("@/app/_server/actions/share/queries");
      const sharedUsers = await usersWithAccess(stored.uuid);
      isSharedBoard = sharedUsers.length > 0;
    }

    const shiftedItems = stored.items.map((item) => ({
      ...item,
      order: item.order + 1,
    }));

    const userRecord = await findUserRecord(currentUser);
    const insertAtBottom = userRecord?.newItemInsertion === "bottom";

    const newItem = {
      id: `${stored.uuid}-${Date.now()}`,
      text,
      completed: false,
      order: insertAtBottom
        ? stored.items.reduce((max, item) => Math.max(max, item.order ?? 0), -1) + 1
        : 0,
      description: description || undefined,
      createdBy: currentUser,
      createdAt: now,
      lastModifiedBy: currentUser,
      lastModifiedAt: now,
      ...(isKanbanType(stored.type) &&
        defaultStatus && {
        status: defaultStatus,
        timeEntries,
        history: [
          {
            status: defaultStatus,
            timestamp: now,
            user: currentUser,
          },
        ],
      }),
      ...(isSharedBoard && { assignee: currentUser }),
      ...(recurrence && { recurrence }),
    };

    const inlineTags = extractHashtagsFromContent(text);
    const existingTags = stored.tags || [];
    const mergedTags = Array.from(
      new Set([...existingTags.map(normalizeTag), ...inlineTags]),
    ).filter(Boolean);

    const updatedList = {
      ...stored,
      items: insertAtBottom
        ? [...stored.items, newItem]
        : [newItem, ...shiftedItems],
      tags: mergedTags,
      updatedAt: new Date().toISOString(),
    };

    await ensureDir(path.dirname(filePath));

    await serverWriteFile(filePath, listToMarkdown(updatedList as Checklist));

    if (!skipRevalidation) {
      try {
        revalidatePath("/");
        revalidatePath(`/checklist/${stored.uuid}`);
      } catch (error) {
        console.warn(
          "Cache revalidation failed, but data was saved successfully:",
          error,
        );
      }
    }

    await broadcast({
      type: "checklist",
      action: "updated",
      entityId: stored.uuid,
      username: currentUser,
    });

    return { success: true, data: newItem };
  } catch (error) {
    console.error(
      "Error creating item:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    return { success: false, error: await failedWith(error, "Failed to create item") };
  }
};

export const editItem = async (
  actor: SanitisedUser,
  checklist: Checklist,
  formData: FormData,
  skipRevalidation = false,
) =>
  runQueued(itemLane(Modes.CHECKLISTS, checklist.uuid), () =>
    _editItem(actor, checklist, formData, skipRevalidation),
  );

export const addItem = async (
  actor: SanitisedUser,
  list: Checklist,
  formData: FormData,
  skipRevalidation = false,
) =>
  runQueued(itemLane(Modes.CHECKLISTS, list.uuid), () =>
    _addItem(actor, list, formData, skipRevalidation),
  );

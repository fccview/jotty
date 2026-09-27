"use server";

import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { Item } from "@/app/_types";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { ChecklistsTypes, Modes, NotificationTargets } from "@/app/_types/enums";
import { parseMarkdown, listToMarkdown } from "@/app/_utils/checklist-utils";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";
import { serverWriteFile } from "@/app/_server/actions/file";
import { updateItem } from "@/app/_utils/item-tree-utils";
import { notifyUser } from "@/app/_server/actions/notifications/internal";
import { usersWithAccess } from "@/app/_server/actions/share/queries";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";
import { grepExtractField } from "@/app/_utils/grep-utils";

const _execAsync = promisify(exec);

let _isRunning = false;

const _findFilesWithReminders = async (rootDir: string): Promise<string[]> => {
  try {
    const { stdout } = await _execAsync(
      `grep -rl "reminder:" "${rootDir}" --include="*.md" 2>/dev/null || true`,
    );
    return stdout.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
};

const _collectDueItems = (items: Item[], now: number): Item[] => {
  const due: Item[] = [];
  const walk = (list: Item[]) => {
    for (const item of list) {
      if (
        item.reminder &&
        !item.reminder.notified &&
        !item.isArchived &&
        new Date(item.reminder.datetime).getTime() <= now
      ) {
        due.push(item);
      }
      if (item.children) walk(item.children);
    }
  };
  walk(items);
  return due;
};

const _remindFile = async (
  filePath: string,
  checklistsRoot: string,
  now: number,
): Promise<void> => {
  const uuid = await grepExtractField(filePath, "uuid");
  if (!uuid) {
    console.warn(`[reminders] skipping list without uuid: ${filePath}`);
    return;
  }

  await runQueued(itemLane(Modes.CHECKLISTS, uuid), async () => {
    const relPath = path.relative(checklistsRoot, filePath);
    const parts = relPath.split(path.sep);
    if (parts.length < 2) return;

    const owner = parts[0];
    const filename = parts[parts.length - 1];
    const listId = filename.replace(/\.md$/, "");
    const category = parts.slice(1, -1).join("/") || "Uncategorized";

    const content = await fs.readFile(filePath, "utf-8");
    if (extractYamlMetadata(content).metadata.uuid !== uuid) return;

    const stats = await fs.stat(filePath);
    const list = parseMarkdown(
      content,
      listId,
      category,
      owner,
      false,
      { birthtime: stats.birthtime, mtime: stats.mtime },
      filePath,
    );

    if (list.type !== ChecklistsTypes.KANBAN) return;

    const dueItems = _collectDueItems(list.items, now);
    if (dueItems.length === 0) return;

    const sharees = await usersWithAccess(uuid);
    const recipients = Array.from(new Set([owner, ...sharees]));

    let updatedItems = list.items;
    for (const item of dueItems) {
      for (const username of recipients) {
        await notifyUser(username, {
          type: "reminder",
          title: "",
          message: "",
          titleKey: "reminderTitle",
          messageKey: "reminderMessage",
          messageVars: {
            task: item.text,
            board: list.title,
          },
          data: {
            itemId: list.uuid,
            itemType: NotificationTargets.CHECKLIST,
            taskId: item.id,
          },
        });
      }

      updatedItems = updateItem(updatedItems, item.id, (it) => ({
        ...it,
        reminder: it.reminder
          ? { ...it.reminder, notified: true }
          : undefined,
      }));
    }

    const updatedList = {
      ...list,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    await broadcast({
      type: "checklist",
      action: "updated",
      entityId: updatedList.uuid,
      username: owner,
    });
  });
};

export const scanReminders = async (): Promise<void> => {
  if (_isRunning) return;
  _isRunning = true;

  try {
    const checklistsRoot = path.join(
      process.cwd(),
      "data",
      CHECKLISTS_FOLDER,
    );

    try {
      await fs.access(checklistsRoot);
    } catch {
      return;
    }

    const files = await _findFilesWithReminders(checklistsRoot);
    if (files.length === 0) return;

    const now = Date.now();

    for (const filePath of files) {
      try {
        await _remindFile(filePath, checklistsRoot, now);
      } catch (err) {
        console.error(`[reminders] failed to process ${filePath}:`, err);
      }
    }
  } catch (err) {
    console.error("[reminders] scan failed:", err);
  } finally {
    _isRunning = false;
  }
};

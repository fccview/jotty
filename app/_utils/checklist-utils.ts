import { Item } from "@/app/_types";
import { Checklist, ChecklistType } from "@/app/_types";
import { ChecklistsTypes, TaskStatus } from "@/app/_types/enums";
import { parseRecurrenceFromMarkdown, recurrenceToMarkdown } from "./recurrence-utils";

export const isItemCompleted = (item: Item, checklistType: string): boolean => {
  if (checklistType === ChecklistsTypes.TASK) {
    return item.status === TaskStatus.COMPLETED;
  }
  return !!item.completed;
};

export const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const getCompletionRate = (
  items: Item[],
  checklistType?: string
): number => {
  const total = items.length;
  if (total === 0) return 0;
  const completed = items.filter((item) =>
    isItemCompleted(item, checklistType || "")
  ).length;
  return Math.round((completed / total) * 100);
};

export const parseMarkdown = (
  content: string,
  id: string,
  category: string,
  owner?: string,
  isShared?: boolean,
  fileStats?: { birthtime: Date; mtime: Date }
): Checklist => {
  const lines = content.split("\n");
  const title = lines[0]?.replace(/^#\s*/, "") || "Untitled";

  let type = ChecklistsTypes.SIMPLE;
  if (content.includes("<!-- type:task -->")) {
    type = ChecklistsTypes.TASK;
  } else if (
    content.includes(" | status:") ||
    content.includes(" | time:") ||
    content.includes(" | estimated:") ||
    content.includes(" | target:")
  ) {
    type = ChecklistsTypes.TASK;
  }

  const items = lines
    .slice(1)
    .filter((line) => line.trim().startsWith("- ["))
    .map((line, index) => {
      const completed = line.includes("- [x]");
      const text = line.replace(/^-\s*\[[x ]\]\s*/, "");

      // Check if item has metadata (either task or recurrence)
      if (text.includes(" | ")) {
        const parts = text.split(" | ");
        const itemText = parts[0].replace(/∣/g, "|");
        const metadata = parts.slice(1);

        let status: TaskStatus = TaskStatus.TODO;
        let timeEntries: any[] = [];
        let estimatedTime: number | undefined;
        let targetDate: string | undefined;
        let recurrence = parseRecurrenceFromMarkdown(metadata);

        // Parse task-specific metadata only if it's a task type checklist
        if (type === "task") {
          metadata.forEach((meta) => {
            if (meta.startsWith("status:")) {
              const statusValue = meta.substring(7) as TaskStatus;
              if (
                [
                  TaskStatus.TODO,
                  TaskStatus.IN_PROGRESS,
                  TaskStatus.COMPLETED,
                  TaskStatus.PAUSED,
                ].includes(statusValue)
              ) {
                status = statusValue;
              }
            } else if (meta.startsWith("time:")) {
              const timeValue = meta.substring(5);
              if (timeValue && timeValue !== "0") {
                try {
                  timeEntries = JSON.parse(timeValue);
                } catch {
                  timeEntries = [];
                }
              }
            } else if (meta.startsWith("estimated:")) {
              estimatedTime = parseInt(meta.substring(10));
            } else if (meta.startsWith("target:")) {
              targetDate = meta.substring(7);
            }
          });
        }

        return {
          id: `${id}-${index}`,
          text: itemText,
          completed,
          order: index,
          ...(type === "task" && {
            status,
            timeEntries,
            estimatedTime,
            targetDate,
          }),
          ...(recurrence && { recurrence }),
        };
      } else {
        return {
          id: `${id}-${index}`,
          text: text.replace(/∣/g, "|"),
          completed,
          order: index,
        };
      }
    });

  return {
    id,
    title,
    type,
    category,
    items,
    createdAt: fileStats
      ? fileStats.birthtime.toISOString()
      : new Date().toISOString(),
    updatedAt: fileStats
      ? fileStats.mtime.toISOString()
      : new Date().toISOString(),
    owner,
    isShared,
  };
};

export const listToMarkdown = (list: Checklist): string => {
  const header =
    list.type === "task"
      ? `# ${list.title}\n<!-- type:task -->\n`
      : `# ${list.title}\n`;
  const items = list.items
    .sort((a, b) => a.order - b.order)
    .map((item) => {
      const escapedText = item.text.replace(/\|/g, "∣");

      if (list.type === "task") {
        const metadata: string[] = [];

        if (item.status && item.status !== TaskStatus.TODO) {
          metadata.push(`status:${item.status}`);
        }

        if (item.timeEntries && item.timeEntries.length > 0) {
          metadata.push(`time:${JSON.stringify(item.timeEntries)}`);
        } else {
          metadata.push("time:0");
        }

        if (item.estimatedTime) {
          metadata.push(`estimated:${item.estimatedTime}`);
        }

        if (item.targetDate) {
          metadata.push(`target:${item.targetDate}`);
        }

        return `- [${
          item.completed ? "x" : " "
        }] ${escapedText} | ${metadata.join(" | ")}`;
      }

      // Handle simple checklist items (with optional recurrence)
      if (item.recurrence) {
        const recurrenceParts = recurrenceToMarkdown(item.recurrence);
        return `- [${item.completed ? "x" : " "}] ${escapedText} | ${recurrenceParts.join(" | ")}`;
      }

      return `- [${item.completed ? "x" : " "}] ${escapedText}`;
    })
    .join("\n");
  return `${header}\n${items}`;
};

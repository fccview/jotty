import { Item } from "@/app/_types";
import { Checklist, ChecklistType } from "@/app/_types";
import { ChecklistsTypes, TaskStatus } from "@/app/_types/enums";

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

  const itemLines = lines
    .slice(1)
    .filter((line) => line.trim().startsWith("- [") || /^\s*- \[/.test(line));

  const generateItemId = (index: number, level: number): string => {
    return `${id}-${level}-${index}`;
  };

  const buildNestedItems = (
    lines: string[],
    startIndex: number = 0,
    parentLevel: number = 0,
    itemIndex: number = 0
  ): { items: Item[]; nextIndex: number } => {
    const items: Item[] = [];
    let currentIndex = startIndex;
    let currentItemIndex = itemIndex;

    while (currentIndex < lines.length) {
      const line = lines[currentIndex];
      if (!line.trim().startsWith("- [") && !/^\s*- \[/.test(line)) {
        break;
      }

      const indentMatch = line.match(/^(\s*)- \[/);
      const indentLevel = indentMatch
        ? Math.floor(indentMatch[1].length / 2)
        : 0;

      if (indentLevel === parentLevel) {
        let cleanLine = line;
        let completed = false;

        const firstCheckboxMatch = line.match(/-\s*\[([x ])\]/);
        if (firstCheckboxMatch) {
          completed = firstCheckboxMatch[1] === "x";
          cleanLine = line.replace(/-\s*\[[x ]\]/g, "").trim();
          cleanLine = cleanLine.replace(/\s*-\s*\[[x ]\]/g, "").trim();
        }

        const text = cleanLine;

        let item: Item;
        if (type === "task" && text.includes(" | ")) {
          const parts = text.split(" | ");
          const itemText = parts[0].replace(/∣/g, "|");
          const metadata = parts.slice(1);

          let status: TaskStatus = TaskStatus.TODO;
          let timeEntries: any[] = [];
          let estimatedTime: number | undefined;
          let targetDate: string | undefined;

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

          item = {
            id: generateItemId(currentItemIndex, parentLevel),
            text: itemText,
            completed,
            order: currentItemIndex,
            status,
            timeEntries,
            estimatedTime,
            targetDate,
          };
        } else {
          item = {
            id: generateItemId(currentItemIndex, parentLevel),
            text: text.replace(/∣/g, "|"),
            completed,
            order: currentItemIndex,
          };
        }

        const nestedResult = buildNestedItems(
          lines,
          currentIndex + 1,
          parentLevel + 1,
          0
        );
        if (nestedResult.items.length > 0) {
          item.children = nestedResult.items;
        }

        items.push(item);
        currentIndex = nestedResult.nextIndex;
        currentItemIndex++;
      } else if (indentLevel < parentLevel) {
        break;
      } else if (indentLevel === parentLevel + 1) {
        currentIndex++;
      } else if (indentLevel > parentLevel + 1) {
        currentIndex++;
      } else {
        currentIndex++;
      }
    }

    return { items, nextIndex: currentIndex };
  };

  const { items } = buildNestedItems(itemLines, 0, 0, 0);

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

const generateItemMarkdown = (
  item: Item,
  type: ChecklistType,
  indentLevel: number = 0
): string => {
  const indent = "  ".repeat(indentLevel);
  const escapedText = item.text.replace(/\|/g, "∣");

  let itemLine: string;
  if (type === "task") {
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

    itemLine = `${indent}- [${
      item.completed ? "x" : " "
    }] ${escapedText} | ${metadata.join(" | ")}`;
  } else {
    itemLine = `${indent}- [${item.completed ? "x" : " "}] ${escapedText}`;
  }

  if (item.children && item.children.length > 0) {
    const childrenLines = item.children
      .sort((a, b) => a.order - b.order)
      .map((child) => generateItemMarkdown(child, type, indentLevel + 1))
      .join("\n");
    return `${itemLine}\n${childrenLines}`;
  }

  return itemLine;
};

export const listToMarkdown = (list: Checklist): string => {
  const header =
    list.type === "task"
      ? `# ${list.title}\n<!-- type:task -->\n`
      : `# ${list.title}\n`;

  if (list.items.length === 0) {
    return header.trim();
  }

  const items = list.items
    .sort((a, b) => a.order - b.order)
    .map((item) => generateItemMarkdown(item, list.type))
    .join("\n");

  return `${header}\n${items}`;
};

import path from "path";
import { Item } from "@/app/_types";
import { Checklist, ChecklistType } from "@/app/_types";
import { ChecklistsTypes, TaskStatus } from "@/app/_types/enums";
import {
  parseRecurrenceFromMarkdown,
  recurrenceToMarkdown,
} from "./recurrence-utils";
import {
  extractYamlMetadata,
  extractTitle,
  extractChecklistType,
  generateYamlFrontmatter,
  generateUuid,
} from "./yaml-metadata-utils";

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
  fileStats?: { birthtime: Date; mtime: Date },
  fileName?: string
): Checklist => {
  const { metadata, contentWithoutMetadata } = extractYamlMetadata(content);

  let title = extractTitle(
    content,
    fileName ? path.basename(fileName, ".md") : undefined
  );

  const type = extractChecklistType(content);

  const checklistType =
    type === "task" ? ChecklistsTypes.TASK : ChecklistsTypes.SIMPLE;

  const lines = contentWithoutMetadata.split("\n");
  const itemLines = lines.filter(
    (line) => line.trim().startsWith("- [") || /^\s*- \[/.test(line)
  );

  let globalItemCounter = 0;
  const generateItemId = (level: number): string => {
    return `${id}-${level}-${globalItemCounter++}`;
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

      if (!line.trim()) {
        currentIndex++;
        continue;
      }

      let metadata: Record<string, any> = {};
      if (line.trim().startsWith("<!--")) {
        try {
          const metadataMatch = line.match(/<!--\s*(.*?)\s*-->/);
          if (metadataMatch) {
            metadata = JSON.parse(metadataMatch[1]);
            currentIndex++;
            if (currentIndex >= lines.length) break;
          }
        } catch (e) {
          console.warn("Failed to parse metadata comment:", e);
        }
      }

      const itemLine = lines[currentIndex];
      if (!itemLine.trim().startsWith("- [") && !/^\s*- \[/.test(itemLine)) {
        break;
      }

      const indentMatch = itemLine.match(/^(\s*)- \[/);
      const indentLevel = indentMatch
        ? Math.floor(indentMatch[1].length / 2)
        : 0;

      if (indentLevel === parentLevel) {
        let cleanLine = itemLine;
        let completed = false;

        const firstCheckboxMatch = itemLine.match(/-\s*\[([x ])\]/);
        if (firstCheckboxMatch) {
          completed = firstCheckboxMatch[1] === "x";
          cleanLine = itemLine.replace(/-\s*\[[x ]\]/g, "").trim();
          cleanLine = cleanLine.replace(/\s*-\s*\[[x ]\]/g, "").trim();
        }

        let text = cleanLine;

        let item: Item;
        let recurrence = undefined;

        if (type === "task" && text.includes(" | ")) {
          const parts = text.split(" | ");
          const itemText = parts[0].replace(/∣/g, "|");
          const metadata = parts.slice(1);

          let status: TaskStatus = TaskStatus.TODO;
          let timeEntries: any[] = [];
          let estimatedTime: number | undefined;
          let targetDate: string | undefined;
          let description: string | undefined;
          let itemMetadata: Record<string, any> = {};

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
            } else if (meta.startsWith("description:")) {
              description = meta.substring(12).replace(/∣/g, "|");
            } else if (meta.startsWith("metadata:")) {
              try {
                itemMetadata = JSON.parse(meta.substring(9));
              } catch (e) {
                console.warn("Failed to parse item metadata:", e);
              }
            } else if (meta.startsWith("recurrence:")) {
              recurrence = parseRecurrenceFromMarkdown([meta]);
            }
          });

          item = {
            id: itemMetadata.id || generateItemId(parentLevel),
            text: itemText,
            completed,
            order: currentItemIndex,
            status,
            timeEntries,
            estimatedTime,
            targetDate,
            description,
            ...itemMetadata,
            ...(recurrence ? { recurrence } : {}),
          };
        } else {
          let itemText = text.replace(/∣/g, "|");
          let itemMetadata: Record<string, any> = {};
          let description: string | undefined;

          if (itemText.includes(" | ")) {
            const parts = itemText.split(" | ");
            itemText = parts[0];

            parts.slice(1).forEach((part) => {
              if (part.startsWith("description:")) {
                description = part.substring(12).replace(/∣/g, "|");
              } else if (part.startsWith("metadata:")) {
                try {
                  const parsedMetadata = JSON.parse(part.substring(9));
                  Object.assign(itemMetadata, parsedMetadata);
                } catch (e) {
                  console.warn("Failed to parse simple item metadata:", e);
                }
              }
            });

            recurrence = parseRecurrenceFromMarkdown(parts.slice(1));
          }

          item = {
            id: itemMetadata.id || generateItemId(parentLevel),
            text: itemText,
            completed,
            order: currentItemIndex,
            description,
            ...metadata,
            ...itemMetadata,
            ...(recurrence && { recurrence }),
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
    uuid: metadata.uuid || generateUuid(),
    title,
    type: checklistType,
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

    const itemMetadata: Record<string, any> = {};
    if (item.id) {
      itemMetadata.id = item.id;
    }
    if (item.createdBy) {
      itemMetadata.createdBy = item.createdBy;
      itemMetadata.createdAt = item.createdAt;
    }
    if (item.lastModifiedBy) {
      itemMetadata.lastModifiedBy = item.lastModifiedBy;
      itemMetadata.lastModifiedAt = item.lastModifiedAt;
    }
    if (item.history?.length) {
      itemMetadata.history = item.history;
    }

    const timeEntries = item.timeEntries;

    if (timeEntries && timeEntries.length > 0) {
      metadata.push(`time:${JSON.stringify(timeEntries)}`);
    } else {
      metadata.push("time:0");
    }

    if (item.estimatedTime) {
      metadata.push(`estimated:${item.estimatedTime}`);
    }

    if (item.targetDate) {
      metadata.push(`target:${item.targetDate}`);
    }

    if (item.description) {
      metadata.push(`description:${item.description.replace(/\|/g, "∣")}`);
    }

    if (item.recurrence) {
      const recurrenceParts = recurrenceToMarkdown(item.recurrence);
      metadata.push(...recurrenceParts);
    }

    if (Object.keys(itemMetadata).length > 0) {
      metadata.push(`metadata:${JSON.stringify(itemMetadata)}`);
    }

    itemLine = `${indent}- [${item.completed ? "x" : " "
      }] ${escapedText} | ${metadata.join(" | ")}`;
  } else {
    const itemMetadata: Record<string, any> = {};
    if (item.id) {
      itemMetadata.id = item.id;
    }
    if (item.createdBy) {
      itemMetadata.createdBy = item.createdBy;
      itemMetadata.createdAt = item.createdAt;
    }
    if (item.lastModifiedBy) {
      itemMetadata.lastModifiedBy = item.lastModifiedBy;
      itemMetadata.lastModifiedAt = item.lastModifiedAt;
    }
    if (item.history?.length) {
      itemMetadata.history = item.history;
    }

    const metadata: string[] = [];

    if (item.description) {
      metadata.push(`description:${item.description.replace(/\|/g, "∣")}`);
    }

    if (Object.keys(itemMetadata).length > 0) {
      metadata.push(`metadata:${JSON.stringify(itemMetadata)}`);
    }

    if (item.recurrence) {
      const recurrenceParts = recurrenceToMarkdown(item.recurrence);
      metadata.push(...recurrenceParts);
    }

    itemLine = `${indent}- [${item.completed ? "x" : " "}] ${escapedText}${metadata.length ? ` | ${metadata.join(" | ")}` : ""
      }`;
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
  const metadata: any = {};
  metadata.uuid = list.uuid || generateUuid();
  metadata.title = list.title || "Untitled Checklist";
  if (list.type === ChecklistsTypes.TASK) metadata.checklistType = "task";
  else if (list.type === ChecklistsTypes.SIMPLE)
    metadata.checklistType = "simple";

  const frontmatter = generateYamlFrontmatter(metadata);

  if (list.items.length === 0) {
    return frontmatter.trim();
  }

  const items = list.items
    .sort((a, b) => a.order - b.order)
    .map((item) => generateItemMarkdown(item, list.type))
    .join("\n");

  return `${frontmatter}${items}`;
};

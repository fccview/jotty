import { Checklist, Note, Item, ChecklistType } from "@/app/_types";

import { TaskStatus } from "@/app/_types/enums";
import { parseRecurrenceFromMarkdown } from "@/app/_utils/recurrence-utils";

export const parseChecklistContent = (rawContent: string, id: string): { title: string; items: Item[] } => {
    const lines = rawContent.split("\n");
    const title = lines[0]?.replace(/^#\s*/, "") || id;

    const itemLines = lines
        .slice(1)
        .filter((line) => line.trim().startsWith("- [") || /^\s*- \[/.test(line));

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

                const isTask = rawContent.includes("<!-- type:task -->") ||
                    rawContent.includes(" | status:") ||
                    rawContent.includes(" | time:") ||
                    rawContent.includes(" | estimated:") ||
                    rawContent.includes(" | target:");

                if (isTask && text.includes(" | ")) {
                    const parts = text.split(" | ");
                    const itemText = parts[0].replace(/∣/g, "|");
                    const metadataParts = parts.slice(1);

                    let status: TaskStatus = TaskStatus.TODO;
                    let timeEntries: any[] = [];
                    let estimatedTime: number | undefined;
                    let targetDate: string | undefined;
                    let description: string | undefined;
                    let itemMetadata: Record<string, any> = {};


                    metadataParts.forEach((meta) => {
                        if (meta.startsWith("status:")) {
                            const statusValue = meta.substring(7) as TaskStatus;
                            if ([
                                TaskStatus.TODO,
                                TaskStatus.IN_PROGRESS,
                                TaskStatus.COMPLETED,
                                TaskStatus.PAUSED,
                            ].includes(statusValue)) {
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
                        id: itemMetadata.id || `${id}-${currentItemIndex}`,
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
                        id: itemMetadata.id || `${id}-${currentItemIndex}`,
                        text: itemText,
                        completed,
                        order: currentItemIndex,
                        description,
                        ...metadata,
                        ...itemMetadata,
                        ...(recurrence ? { recurrence } : {}),
                    };
                }

                const nestedResult = buildNestedItems(
                    lines,
                    currentIndex + 1,
                    parentLevel + 1,
                    0
                );
                if (nestedResult.items.length > 0) {
                    (item as any).children = nestedResult.items;
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

    return { title, items };
};

export const parseNoteContent = (rawContent: string, id: string): { title: string; content: string } => {
    const lines = rawContent.split("\n");
    const titleLine = lines.find((line) => line.startsWith("# "));
    const title = titleLine?.replace(/^#\s*/, "") || "Untitled Note";

    const content = lines
        .filter((line) => !line.startsWith("# ") || line !== titleLine)
        .join("\n")
        .trim();

    return { title, content };
};
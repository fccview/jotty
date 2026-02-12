import path from "path";
import { Checklist, ChecklistType } from "@/app/_types";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { serverWriteFile } from "@/app/_server/actions/file";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import {
  shouldRefreshRecurringItem,
  refreshRecurringItem,
} from "@/app/_utils/recurrence-utils";

export const getChecklistType = (content: string): ChecklistType => {
  if (content.includes("checklistType: task")) {
    return "task";
  }

  return "simple";
};

export const checkAndRefreshRecurringItems = async (
  checklist: Checklist,
): Promise<{ checklist: Checklist; hasChanges: boolean }> => {
  let hasChanges = false;
  const updatedItems = checklist.items.map((item) => {
    if (shouldRefreshRecurringItem(item)) {
      hasChanges = true;
      return refreshRecurringItem(item);
    }
    return item;
  });

  if (!hasChanges) {
    return { checklist, hasChanges: false };
  }

  const updatedChecklist: Checklist = {
    ...checklist,
    items: updatedItems,
    updatedAt: new Date().toISOString(),
  };

  try {
    const ownerDir = path.join(
      process.cwd(),
      "data",
      CHECKLISTS_FOLDER,
      checklist.owner!,
    );
    const categoryDir = path.join(
      ownerDir,
      checklist.category || "Uncategorized",
    );
    const filePath = path.join(categoryDir, `${checklist.id}.md`);

    await serverWriteFile(filePath, listToMarkdown(updatedChecklist));
  } catch (error) {
    console.error("Error saving refreshed recurring items:", error);
    return { checklist, hasChanges: false };
  }

  return { checklist: updatedChecklist, hasChanges: true };
};

import { Checklist, ChecklistType } from "@/app/_types";
import { serverWriteFile } from "@/app/_server/actions/file";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { rollDueItems } from "@/app/_utils/recurrence-utils";

export const getChecklistType = (content: string): ChecklistType => {
  if (content.includes("checklistType: task") || content.includes("checklistType: kanban")) {
    return "kanban";
  }

  return "simple";
};

export const checkAndRefreshRecurringItems = async (
  checklist: Checklist,
  filePath: string,
): Promise<{ checklist: Checklist; hasChanges: boolean }> => {
  const updatedItems = rollDueItems(checklist.items, checklist.statuses);
  const hasChanges = updatedItems.some((item, index) => item !== checklist.items[index]);

  if (!hasChanges) {
    return { checklist, hasChanges: false };
  }

  const updatedChecklist: Checklist = {
    ...checklist,
    items: updatedItems,
    updatedAt: new Date().toISOString(),
  };

  try {
    await serverWriteFile(filePath, listToMarkdown(updatedChecklist));
  } catch (error) {
    console.error("Error saving refreshed recurring items:", error);
    return { checklist, hasChanges: false };
  }

  return { checklist: updatedChecklist, hasChanges: true };
};

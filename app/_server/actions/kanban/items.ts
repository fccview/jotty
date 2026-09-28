"use server";

import { KanbanPriority } from "@/app/_types";
import { getFormData } from "@/app/_utils/global-utils";
import { sessionActor } from "@/app/_server/actions/lib/actor";
import { assignItem, remindItem, tweakItem } from "./tweaker";

export const updateKanbanItemPriority = async (formData: FormData) => {
  try {
    const { uuid, itemId, priority } = getFormData(formData, [
      "uuid", "itemId", "priority",
    ]);

    const actor = await sessionActor();
    if ("error" in actor) return { error: actor.error };

    return await tweakItem(actor, uuid, itemId, {
      priority: priority as KanbanPriority,
    });
  } catch (error) {
    console.error("Error updating priority:", error);
    return { error: "Failed to update priority" };
  }
};

export const updateKanbanItemScore = async (formData: FormData) => {
  try {
    const { uuid, itemId, score } = getFormData(formData, [
      "uuid", "itemId", "score",
    ]);

    const actor = await sessionActor();
    if ("error" in actor) return { error: actor.error };

    return await tweakItem(actor, uuid, itemId, { score: parseInt(score) });
  } catch (error) {
    console.error("Error updating score:", error);
    return { error: "Failed to update score" };
  }
};

export const assignKanbanItem = async (formData: FormData) => {
  const { uuid, itemId, assignee } = getFormData(formData, [
    "uuid", "itemId", "assignee",
  ]);

  const actor = await sessionActor();
  if ("error" in actor) return { error: actor.error };

  return assignItem(actor, uuid, itemId, assignee);
};

export const setKanbanItemReminder = async (formData: FormData) => {
  const { uuid, itemId, reminder } = getFormData(formData, [
    "uuid", "itemId", "reminder",
  ]);

  const actor = await sessionActor();
  if ("error" in actor) return { error: actor.error };

  return remindItem(actor, uuid, itemId, reminder);
};

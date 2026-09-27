"use server";

import { Checklist, Item, Result } from "@/app/_types";
import { sessionActor } from "@/app/_server/actions/lib/actor";
import { addItem, editItem } from "./editor";
import { removeItem } from "./remover";

export const updateItem = async (
  checklist: Checklist,
  formData: FormData,
  username?: string,
  skipRevalidation = false,
): Promise<Result<Checklist>> => {
  const actor = await sessionActor(username);

  if ("error" in actor) {
    return { success: false, error: actor.error };
  }

  return editItem(actor, checklist, formData, skipRevalidation);
};

export const createItem = async (
  list: Checklist,
  formData: FormData,
  username?: string,
  skipRevalidation = false,
): Promise<Result<Item>> => {
  const actor = await sessionActor(username);

  if ("error" in actor) {
    return { success: false, error: actor.error };
  }

  return addItem(actor, list, formData, skipRevalidation);
};

export const deleteItem = async (
  formData: FormData,
): Promise<Result<Checklist>> => {
  const actor = await sessionActor();

  if ("error" in actor) {
    return { success: false, error: actor.error };
  }

  return removeItem(
    actor,
    formData.get("uuid") as string,
    formData.get("itemId") as string,
  );
};

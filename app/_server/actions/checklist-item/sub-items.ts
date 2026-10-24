"use server";

import { Checklist, Result } from "@/app/_types";
import { sessionActor } from "@/app/_server/actions/lib/actor";
import { graftItem } from "./grafter";

export const createSubItem = async (
  formData: FormData,
): Promise<Result<Checklist>> => {
  const actor = await sessionActor();

  if ("error" in actor) {
    return { success: false, error: actor.error };
  }

  return graftItem(actor, formData);
};

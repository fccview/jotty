"use server";

import { Checklist, Result } from "@/app/_types";
import { sessionActor } from "@/app/_server/actions/lib/actor";
import { stampStatus } from "./stamper";

export const updateItemStatus = async (
  formData: FormData,
): Promise<Result<Checklist>> => {
  const actor = await sessionActor(formData.get("username") as string | null);

  if ("error" in actor) {
    return { success: false, error: actor.error };
  }

  return stampStatus(actor, formData);
};

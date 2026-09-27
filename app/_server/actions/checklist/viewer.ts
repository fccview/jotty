"use server";

import { Checklist } from "@/app/_types";
import { ItemTypes, PermissionTypes } from "@/app/_types/enums";
import { isUuid } from "@/app/_consts/identity";
import { sessionActor } from "@/app/_server/actions/lib/actor";
import { canReach } from "@/app/_server/actions/share/queries";
import { getListById, getUserChecklists } from "./queries";

export const viewList = async (
  uuid: string,
): Promise<Checklist | undefined> => {
  if (!isUuid(uuid)) return undefined;

  const actor = await sessionActor();
  if ("error" in actor) return undefined;

  const seen = await getListById(uuid, actor.username);
  if (seen) return seen;

  const allowed = await canReach(
    uuid,
    ItemTypes.CHECKLIST,
    actor.username,
    PermissionTypes.READ,
  );

  return allowed ? getListById(uuid) : undefined;
};

export const getChecklistsForDisplay = async (
  filter?: { type: "category" | "tag"; value: string } | null,
  limit: number = 20,
  offset: number = 0,
) => {
  return getUserChecklists({
    filter: filter || undefined,
    limit,
    offset: filter ? offset : undefined,
  });
};

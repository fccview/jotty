"use server";

import { Note } from "@/app/_types";
import { ItemTypes, PermissionTypes } from "@/app/_types/enums";
import { isUuid } from "@/app/_consts/identity";
import { sessionActor } from "@/app/_server/actions/lib/actor";
import { canReach } from "@/app/_server/actions/share/queries";
import { getNoteById, getUserNotes } from "./queries";

export const viewNote = async (uuid: string): Promise<Note | undefined> => {
  if (!isUuid(uuid)) return undefined;

  const actor = await sessionActor();
  if ("error" in actor) return undefined;

  const seen = await getNoteById(uuid, actor.username);
  if (seen) return seen;

  const allowed = await canReach(
    uuid,
    ItemTypes.NOTE,
    actor.username,
    PermissionTypes.READ,
  );

  return allowed ? getNoteById(uuid) : undefined;
};

export const getNotesForDisplay = async (
  filter?: { type: "category" | "tag"; value: string } | null,
  limit: number = 20,
  offset: number = 0,
) => {
  return getUserNotes({
    filter: filter || undefined,
    limit,
    offset: filter ? offset : undefined,
  });
};

import { Modes } from "@/app/_types/enums";
import type { Checklist, Note } from "@/app/_types";
import { getUserNotes } from "@/app/_server/actions/note/queries";
import { getUserChecklists } from "@/app/_server/actions/checklist/queries";

export type ItemMode = Modes.NOTES | Modes.CHECKLISTS;

export const isItemMode = (mode: unknown): mode is ItemMode =>
  mode === Modes.NOTES || mode === Modes.CHECKLISTS;

export const itemListing = async (mode: ItemMode, username: string): Promise<(Note | Checklist)[]> => {
  const options = { username, metadataOnly: true, preserveOrder: true };
  const result =
    mode === Modes.NOTES ? await getUserNotes(options) : await getUserChecklists(options);
  if (!result.success) {
    console.error(`Could not list ${mode} for ${username}:`, result.error);
    return [];
  }
  return (result.data || []) as (Note | Checklist)[];
};

export const bothListings = async (username: string) => {
  const [notes, checklists] = await Promise.all([
    itemListing(Modes.NOTES, username) as Promise<Note[]>,
    itemListing(Modes.CHECKLISTS, username) as Promise<Checklist[]>,
  ]);
  return { notes, checklists };
};

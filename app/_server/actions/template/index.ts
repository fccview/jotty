"use server";

import { getTranslations } from "next-intl/server";
import { Note, Result } from "@/app/_types";
import { TEMPLATES_DIR_NAME } from "@/app/_consts/files";
import { getCurrentUser } from "@/app/_server/actions/users";
import { getNoteById } from "@/app/_server/actions/note/queries";
import { makeNote } from "@/app/_server/actions/note/creator";
import { copyNote } from "@/app/_server/actions/note/cloner";
import { listTemplates } from "./reader";

type NoteOutcome = { success?: boolean; data?: Note; error?: string };

export const getTemplates = async (): Promise<Result<Note[]>> => {
  const user = await getCurrentUser();
  if (!user?.username) return { success: false, error: "Not authenticated" };

  try {
    return { success: true, data: await listTemplates(user.username) };
  } catch (error) {
    console.error("Error listing templates:", error);
    return { success: false, error: "Failed to load templates" };
  }
};

export const saveAsTemplate = async (uuid: string): Promise<NoteOutcome> => {
  const user = await getCurrentUser();
  if (!user?.username) return { error: "Not authenticated" };

  try {
    const note = await getNoteById(uuid, user.username);
    if (!note) return { error: "Note not found" };

    if (note.encrypted) {
      console.warn("Refusing to turn an encrypted note into a template:", uuid);
      const t = await getTranslations("errors");
      return { error: t("templateEncrypted") };
    }

    return await copyNote(user, note, TEMPLATES_DIR_NAME, note.title);
  } catch (error) {
    console.error("Error saving note as template:", error);
    return { error: "Failed to save template" };
  }
};

export const createTemplate = async (title: string): Promise<NoteOutcome> => {
  const user = await getCurrentUser();
  if (!user?.username) return { error: "Not authenticated" };

  const formData = new FormData();
  formData.append("title", title.trim());
  formData.append("category", TEMPLATES_DIR_NAME);
  formData.append("rawContent", "");

  return makeNote(user, formData);
};

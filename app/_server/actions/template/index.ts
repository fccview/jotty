"use server";

import { getTranslations } from "next-intl/server";
import { Note, Result, TemplateSummary } from "@/app/_types";
import { TEMPLATES_DIR_NAME } from "@/app/_consts/files";
import { getCurrentUser } from "@/app/_server/actions/users";
import { getNoteById } from "@/app/_server/actions/note/queries";
import { makeNote } from "@/app/_server/actions/note/creator";
import { copyNote } from "@/app/_server/actions/note/cloner";
import { carriedMeta } from "@/app/_utils/template-utils";
import { isEncrypted } from "@/app/_utils/encryption-utils";
import { listTemplates } from "./reader";

type NoteOutcome = { success?: boolean; data?: Note; error?: string };

export const getTemplates = async (): Promise<Result<TemplateSummary[]>> => {
  const t = await getTranslations();
  const user = await getCurrentUser();
  if (!user?.username) return { success: false, error: t("errors.unauthorized") };

  try {
    return { success: true, data: await listTemplates(user.username) };
  } catch (error) {
    console.error("Error listing templates:", error);
    return { success: false, error: t("templates.loadFailed") };
  }
};

export const saveAsTemplate = async (uuid: string): Promise<NoteOutcome> => {
  const t = await getTranslations();
  const user = await getCurrentUser();
  if (!user?.username) return { error: t("errors.unauthorized") };

  try {
    const note = await getNoteById(uuid, user.username);
    if (!note) return { error: t("errors.noteNotFound") };

    if (note.encrypted || isEncrypted(note.content || "")) {
      console.warn("Refusing to turn an encrypted note into a template:", uuid);
      return { error: t("errors.templateEncrypted") };
    }

    return await copyNote(
      user,
      { ...note, extraMetadata: carriedMeta(note.extraMetadata) },
      TEMPLATES_DIR_NAME,
      note.title,
    );
  } catch (error) {
    console.error("Error saving note as template:", error);
    return { error: t("templates.saveFailed") };
  }
};

export const createTemplate = async (title: string): Promise<NoteOutcome> => {
  const t = await getTranslations();
  const user = await getCurrentUser();
  if (!user?.username) return { error: t("errors.unauthorized") };

  if (typeof title !== "string" || !title.trim()) {
    return { error: t("errors.requiredField") };
  }

  const formData = new FormData();
  formData.append("title", title.trim());
  formData.append("category", TEMPLATES_DIR_NAME);
  formData.append("rawContent", "");

  return makeNote(user, formData);
};

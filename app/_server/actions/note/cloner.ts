import path from "path";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { Note, SanitisedUser } from "@/app/_types";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import { generateUniqueFilename } from "@/app/_utils/filename-utils";
import { ensureDir, serverWriteFile } from "@/app/_server/actions/file";
import { canReach } from "@/app/_server/actions/share/queries";
import {
  extractYamlMetadata as stripYaml,
  generateUuid,
  updateYamlMetadata,
} from "@/app/_utils/yaml-metadata-utils";
import { targetDir, bouncer } from "@/app/_server/actions/share/target";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { fenceFilename } from "@/app/_server/actions/lib/filename-fence";
import { getNoteById } from "./queries";
import { carryAttachments } from "@/app/_server/actions/attachments/lifecycle";

export const copyNote = async (
  actor: SanitisedUser,
  note: Note,
  category: string,
  title: string,
): Promise<{ success?: boolean; data?: Note; error?: string }> => {
  const canReadSource = await canReach(
    note.uuid!,
    ItemTypes.NOTE,
    actor.username,
    PermissionTypes.READ,
  );

  if (!canReadSource) {
    console.warn("Refusing to copy a note the actor cannot read:", note.uuid);
    const t = await getTranslations("errors");
    return { error: t("permissionDenied") };
  }

  const target = await targetDir(Modes.NOTES, actor.username, category);
  const verdict = await bouncer(target, actor.username, PermissionTypes.CREATE);

  if (!verdict.allowed) {
    return { error: verdict.error };
  }

  const categoryDir = target.dir;
  await ensureDir(categoryDir);

  const filename = await generateUniqueFilename(
    categoryDir,
    title,
    ".md",
    actor.fileRenameMode || "minimal",
  );
  const straying = await fenceFilename(categoryDir, filename);
  if (straying) {
    return { error: straying };
  }

  const copyUuid = generateUuid();
  const { metadata: sourceMeta, contentWithoutMetadata } = stripYaml(
    note.content || "",
  );
  delete (sourceMeta as Record<string, unknown>).sharedWith;

  const updatedContent = updateYamlMetadata(
    contentWithoutMetadata,
    {
      ...(note.extraMetadata || {}),
      ...sourceMeta,
      uuid: copyUuid,
      title,
      owner: target.owner,
      category: target.category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    false,
  );

  await serverWriteFile(
    path.join(categoryDir, filename),
    await carryAttachments(note.uuid!, copyUuid, updatedContent),
  );

  const copied = await getNoteById(copyUuid, actor.username);

  try {
    revalidatePath("/");
  } catch (error) {
    console.warn("Cache revalidation failed, but the note was copied:", error);
  }

  await broadcast({
    type: "note",
    action: "created",
    entityId: copyUuid,
    username: actor.username,
  });

  return { success: true, data: copied };
};

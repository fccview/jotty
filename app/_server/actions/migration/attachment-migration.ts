"use server";

import type { AttachmentMigrationReport, Result } from "@/app/_types";
import { ATTACHMENTS_SCHEMA_VERSION } from "@/app/_consts/files";
import { isAdmin } from "@/app/_server/actions/users";
import { pendingMigrations, stampSchema } from "@/app/_server/actions/lib/migration-check";
import { MigrationBusyError, runAttachmentMigration } from "./attachments/run";

const ADMIN_ONLY = "Unauthorized: Admin access required";
const SHARING_FIRST = "Run the sharing migration first";
const BUSY = "The attachments migration is already running";

const _refusal = async (): Promise<string | null> => {
  if (!(await isAdmin())) return ADMIN_ONLY;
  if ((await pendingMigrations()).sharing) return SHARING_FIRST;
  return null;
};

export const planAttachmentMigration = async (): Promise<Result<AttachmentMigrationReport>> => {
  try {
    const refusal = await _refusal();
    if (refusal) return { success: false, error: refusal };

    return { success: true, data: await runAttachmentMigration(true) };
  } catch (error) {
    console.error("Attachments migration dry run failed:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};

export const migrateAttachments = async (): Promise<Result<AttachmentMigrationReport>> => {
  try {
    const refusal = await _refusal();
    if (refusal) return { success: false, error: refusal };

    const report = await runAttachmentMigration(false);
    await stampSchema(ATTACHMENTS_SCHEMA_VERSION);
    console.info(
      `Attachments migration finished: ${report.rewritten} items rewritten, ${report.linked} linked, ${report.copied} copied, ${report.reused} reused, ${report.avatars} avatars moved.`,
    );

    return { success: true, data: report };
  } catch (error) {
    if (error instanceof MigrationBusyError) return { success: false, error: BUSY };
    console.error("Attachments migration failed:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};

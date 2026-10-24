"use server";

import {
  AuditAction,
  AuditCategory,
  AuditLogLevel,
  AuditMetadata,
} from "@/app/_types";
import { getCurrentUser } from "@/app/_server/actions/users";
import { logAudit } from "./writers";

const CLIENT_ACTIONS: ReadonlySet<AuditAction> = new Set<AuditAction>(["note_saved_encrypted"]);
const CLIENT_CATEGORIES: ReadonlySet<AuditCategory> = new Set<AuditCategory>(["note", "encryption"]);
const CLIENT_LEVELS: ReadonlySet<AuditLogLevel> = new Set<AuditLogLevel>(["DEBUG", "INFO", "WARNING"]);
const TEXT_LIMIT = 500;
const METADATA_LIMIT = 2000;

const _clipped = (text?: string): string | undefined => text?.slice(0, TEXT_LIMIT);

const _smallEnough = (metadata?: AuditMetadata): boolean => {
  try {
    return JSON.stringify(metadata ?? {}).length <= METADATA_LIMIT;
  } catch (error) {
    console.warn("Unserialisable client audit metadata:", error);
    return false;
  }
};

export const logClientAudit = async (params: {
  level: AuditLogLevel;
  action: AuditAction;
  category: AuditCategory;
  success: boolean;
  resourceType?: string;
  resourceId?: string;
  resourceTitle?: string;
  errorMessage?: string;
  metadata?: AuditMetadata;
}): Promise<void> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return;

  if (
    !CLIENT_ACTIONS.has(params.action) ||
    !CLIENT_CATEGORIES.has(params.category) ||
    !CLIENT_LEVELS.has(params.level)
  ) {
    console.warn(
      `Refused a client audit entry from ${currentUser.username}:`,
      params.action,
      params.category,
      params.level,
    );
    return;
  }

  await logAudit({
    level: params.level,
    action: params.action,
    category: params.category,
    success: params.success === true,
    resourceType: _clipped(params.resourceType),
    resourceId: _clipped(params.resourceId),
    resourceTitle: _clipped(params.resourceTitle),
    errorMessage: _clipped(params.errorMessage),
    metadata: _smallEnough(params.metadata) ? params.metadata : undefined,
    username: currentUser.username,
  });
};

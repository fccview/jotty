"use server";

import {
  AuditAction,
  AuditCategory,
  AuditLogLevel,
  AuditMetadata,
} from "@/app/_types";
import { getCurrentUser } from "@/app/_server/actions/users";
import { logAudit } from "./writers";

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

  await logAudit({
    level: params.level,
    action: params.action,
    category: params.category,
    success: params.success,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    resourceTitle: params.resourceTitle,
    errorMessage: params.errorMessage,
    metadata: params.metadata,
    username: currentUser.username,
  });
};

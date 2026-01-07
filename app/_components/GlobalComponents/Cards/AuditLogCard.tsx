"use client";

import { AuditLogEntry } from "@/app/_types";
import {
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  Location05Icon,
  Clock01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
} from "hugeicons-react";
import { formatTimeAgo } from "@/app/_utils/date-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { CodeBlockRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/CodeBlock/CodeBlockRenderer";
import { prism } from "@/app/_utils/prism-utils";

interface AuditLogCardProps {
  log: AuditLogEntry;
  showUsername?: boolean;
}

const getLevelColor = (level: string) => {
  switch (level) {
    case "CRITICAL":
    case "ERROR":
      return "bg-destructive/5 border-destructive/20";
    case "WARNING":
      return "bg-primary/5 border-primary/20";
    case "INFO":
      return "bg-primary/5 border-primary/20";
    case "DEBUG":
      return "bg-background border-border";
    default:
      return "bg-background border-border";
  }
};

const getLevelIconColor = (level: string) => {
  switch (level) {
    case "CRITICAL":
    case "ERROR":
      return "text-red-500";
    case "WARNING":
      return "text-amber-500";
    case "INFO":
      return "text-primary";
    case "DEBUG":
      return "text-gray-500";
    default:
      return "text-gray-500";
  }
};

const getLevelBadgeColor = (level: string) => {
  switch (level) {
    case "CRITICAL":
    case "ERROR":
      return "bg-red-500/10 text-red-600";
    case "WARNING":
      return "bg-amber-500/10 text-amber-600";
    case "INFO":
      return "text-primary";
    case "DEBUG":
      return "bg-gray-500/10 text-gray-600";
    default:
      return "bg-gray-500/10 text-gray-600";
  }
};

export const AuditLogCard = ({ log, showUsername = false }: AuditLogCardProps) => {
  const { isDemoMode, user, appSettings } = useAppMode();
  const t = useTranslations();
  const [showDetails, setShowDetails] = useState(false);

  const isSuperAdmin = user?.isSuperAdmin || false;
  const adminContentAccess = appSettings?.adminContentAccess || "yes";
  const hasContentAccess = isSuperAdmin || adminContentAccess !== "no";
  const isOwnLog = user?.username === log.username;

  const shouldRedactContent = !hasContentAccess && !isOwnLog && (
    log.resourceType === "checklist" ||
    log.resourceType === "note"
  );

  const displayResourceTitle = shouldRedactContent ? t("admin.auditLogContentRedacted") : log.resourceTitle;

  const categoryKey = log.category === "user" ? "userManagement" : log.category;

  const getActionDescription = (): string => {
    if (log.metadata?.action) {
      const metaAction = log.metadata.action as string;
      const method = log.metadata.method as string | undefined;

      if (metaAction === "note_encrypted" || metaAction === "note_decrypted") {
        const baseKey = metaAction.replace(/_/g, "").toLowerCase();
        const baseText = t(`auditLogs.${baseKey}` as any);
        return method ? `${baseText} (${method.toUpperCase()})` : baseText;
      }
    }

    const actionKey = log.action.replace(/_/g, "").toLowerCase();
    return t(`auditLogs.${actionKey}` as any);
  };

  const actionDescription = getActionDescription();

  const jsonData = JSON.stringify(
    {
      uuid: log.uuid,
      timestamp: log.timestamp,
      username: log.username,
      action: log.action,
      category: log.category,
      level: log.level,
      success: log.success,
      ...(log.resourceType && { resourceType: log.resourceType }),
      ...(log.resourceId && { resourceId: log.resourceId }),
      ...(log.resourceTitle && { resourceTitle: shouldRedactContent ? t("admin.auditLogContentRedacted") : log.resourceTitle }),
      ...(log.ipAddress && { ipAddress: isDemoMode ? "Hidden" : log.ipAddress }),
      ...(log.userAgent && { userAgent: isDemoMode ? "Hidden" : log.userAgent }),
      ...(log.metadata && { metadata: shouldRedactContent && log.metadata ? { ...log.metadata, targetUser: log.metadata.targetUser } : log.metadata }),
      ...(log.errorMessage && { errorMessage: log.errorMessage }),
      ...(log.duration && { duration: `${log.duration}ms` }),
    },
    null,
    2
  );

  return (
    <div
      className={`flex flex-col rounded-jotty border ${getLevelColor(
        log.level
      )} cursor-pointer hover:shadow-sm transition-shadow`}
      onClick={() => setShowDetails(!showDetails)}
    >
      <div className="flex items-start justify-between p-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="p-2 bg-primary/5 rounded-jotty flex-shrink-0">
            {log.success ? (
              <CheckmarkCircle02Icon className={`h-5 w-5 ${getLevelIconColor(log.level)}`} />
            ) : (
              <AlertCircleIcon className={`h-5 w-5 ${getLevelIconColor(log.level)}`} />
            )}
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-base">
                {actionDescription}
              </span>
              <span className={`px-2 py-1 text-sm lg:text-xs rounded-full ${getLevelBadgeColor(log.level)}`}>
                {log.level}
              </span>
              <span className="px-2 py-1 text-sm lg:text-xs bg-primary/10 text-primary rounded-full">
                {t(`auditLogs.${categoryKey}` as any) || t(`common.${log.category}` as any) || log.category}
              </span>
            </div>

            {log.resourceType && log.resourceTitle && (
              <div className="text-md lg:text-sm text-muted-foreground">
                <span className="font-medium capitalize">{log.resourceType}:</span>{" "}
                <span className="font-mono text-xs">{displayResourceTitle}</span>
                {log.resourceId && (
                  <span className="text-md lg:text-sm lg:text-xs text-muted-foreground ml-2">
                    (ID: {log.resourceId})
                  </span>
                )}
              </div>
            )}

            {log.metadata && Object.keys(log.metadata).length > 0 && !showDetails && (
              <div className="text-md lg:text-sm lg:text-xs text-muted-foreground">
                {log.metadata.receiver && (
                  <span className="mr-3">→ {log.metadata.receiver as string}</span>
                )}
                {log.metadata.method && (
                  <span className="px-1.5 py-0.5 bg-muted rounded text-sm lg:text-xs font-mono">
                    {(log.metadata.method as string).toUpperCase()}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 text-md lg:text-sm text-muted-foreground">
              {showUsername && (
                <div className="flex items-center gap-2">
                  <UserAvatar username={log.username} size="xs" />
                  <span>{log.username}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock01Icon className="h-3 w-3" />
                {formatTimeAgo(log.timestamp, t)}
              </div>
              <div className="flex items-center gap-1">
                <Location05Icon className="h-3 w-3" />
                <span>{isDemoMode ? "Hidden in demo" : log.ipAddress}</span>
              </div>
            </div>

            {!log.success && log.errorMessage && (
              <p className="text-md lg:text-sm lg:text-xs text-muted-foreground mt-1">
                Error: {log.errorMessage}
              </p>
            )}

            {isDemoMode && (
              <p className="text-md lg:text-sm lg:text-xs text-muted-foreground mt-1">
                Sensitive information is hidden in demo mode
              </p>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 ml-2 p-2">
          {showDetails ? (
            <ArrowUp01Icon className="h-4 w-4" />
          ) : (
            <ArrowDown01Icon className="h-4 w-4" />
          )}
        </div>
      </div>

      {showDetails && (
        <div className="border-t border-border px-4 pb-4 cursor-text" onClick={(e) => e.stopPropagation()}>
          <CodeBlockRenderer language="json" code={jsonData}>
            <code
              className="language-json"
              dangerouslySetInnerHTML={{ __html: prism.highlight("json", jsonData) }}
            />
          </CodeBlockRenderer>
        </div>
      )}
    </div>
  );
};

import { Session } from "@/app/_types";
import { Tv02Icon } from "hugeicons-react";
import { getDeviceInfo } from "@/app/_utils/global-utils";
import { formatTimeAgo } from "@/app/_utils/date-utils";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Orbit01Icon, Delete03Icon } from "hugeicons-react";
import { Location05Icon, Clock01Icon } from "hugeicons-react";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useTranslations } from "next-intl";

interface SessionCardProps {
  session: Session;
  onTerminate: (id: string) => void;
  isTerminating: boolean;
}

export const SessionCard = ({
  session,
  onTerminate,
  isTerminating,
}: SessionCardProps) => {
  const { isDemoMode } = useAppMode();
  const t = useTranslations();
  return (
    <div
      className={`jotty-session-card flex items-start justify-between p-4 rounded-jotty border ${session.isCurrent
          ? "bg-primary/5 border-primary/20"
          : "bg-background border-border"
        }`}
    >
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <div className="p-2 bg-muted rounded-jotty flex-shrink-0">
          <Tv02Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {getDeviceInfo(session.userAgent)}
            </span>
            {session.isCurrent && (
              <span className="px-2 py-1 text-sm lg:text-xs bg-primary/10 text-primary rounded-full">
                Current
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-md lg:text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Location05Icon className="h-3 w-3" />
              <span>{isDemoMode ? "Hidden in demo" : session.ipAddress}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock01Icon className="h-3 w-3" />
              {formatTimeAgo(session.lastActivity, t)}
            </div>
          </div>
          <p className="text-md lg:text-xs text-muted-foreground truncate">
            {isDemoMode
              ? "Browser info hidden in demo mode"
              : session.userAgent}
          </p>
          {isDemoMode && (
            <p className="text-md lg:text-xs text-amber-600 mt-1">
              Sensitive information is hidden in demo mode
            </p>
          )}
        </div>
      </div>
      {!session.isCurrent && !isDemoMode && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onTerminate(session.id)}
          className="flex-shrink-0 ml-2"
          disabled={isTerminating}
        >
          {isTerminating ? (
            <Orbit01Icon className="h-4 w-4 animate-spin" />
          ) : (
            <Delete03Icon className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
};

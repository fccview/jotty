import { Session } from "@/app/_types";
import { Monitor } from "lucide-react";
import { getDeviceInfo } from "@/app/_utils/global-utils";
import { formatTimeAgo } from "@/app/_utils/date-utils";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Loader2, Trash2 } from "lucide-react";
import { MapPin, Clock } from "lucide-react";
import { useAppMode } from "@/app/_providers/AppModeProvider";

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
  return (
    <div
      className={`flex items-start justify-between p-4 rounded-lg border ${session.isCurrent
        ? "bg-primary/5 border-primary/20"
        : "bg-background border-border"
        }`}
    >
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <div className="p-2 bg-muted rounded-lg flex-shrink-0">
          <Monitor className="h-5 w-5" />
        </div>
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {getDeviceInfo(session.userAgent)}
            </span>
            {session.isCurrent && (
              <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                Current
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{isDemoMode ? "Hidden in demo" : session.ipAddress}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimeAgo(session.lastActivity)}
            </div>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {isDemoMode
              ? "Browser info hidden in demo mode"
              : session.userAgent}
          </p>
          {isDemoMode && (
            <p className="text-xs text-amber-600 mt-1">
              Sensitive information is hidden in demo mode
            </p>
          )}
        </div>
      </div>
      {!session.isCurrent && !isDemoMode && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTerminate(session.id)}
          className="text-destructive hover:text-destructive flex-shrink-0 ml-2"
          disabled={isTerminating}
        >
          {isTerminating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
};

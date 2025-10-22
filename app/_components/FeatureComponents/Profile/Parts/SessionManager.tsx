"use client";

import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useSessionManager } from "@/app/_hooks/useSessionManager";
import { SessionCard } from "@/app/_components/GlobalComponents/Cards/SessionCard";
import { FeedbackMessage } from "@/app/_components/GlobalComponents/Feedback/FeedbackMessage";
import { useAppMode } from "@/app/_providers/AppModeProvider";

export const SessionManager = () => {
  const {
    sessions,
    isLoading,
    error,
    success,
    terminating,
    handleTerminateSession,
    handleTerminateAllOtherSessions,
  } = useSessionManager();

  const { isDemoMode } = useAppMode();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FeedbackMessage error={error} success={success} />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Active Sessions</h3>
          <p className="text-sm text-muted-foreground">
            {sessions.length} active session{sessions.length !== 1 && "s"}
          </p>
        </div>
        {sessions.some((s) => !s.isCurrent) && !isDemoMode && (
          <Button
            variant="outline"
            onClick={handleTerminateAllOtherSessions}
            className="text-destructive hover:text-destructive"
            disabled={terminating.all}
          >
            {terminating.all ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Terminate All Others
              </>
            )}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onTerminate={handleTerminateSession}
            isTerminating={terminating.id === session.id}
          />
        ))}
      </div>
    </div>
  );
};

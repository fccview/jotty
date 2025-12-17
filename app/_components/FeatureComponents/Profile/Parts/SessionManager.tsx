"use client";

import { Delete03Icon, Orbit01Icon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useSessionManager } from "@/app/_hooks/useSessionManager";
import { SessionCard } from "@/app/_components/GlobalComponents/Cards/SessionCard";
import { FeedbackMessage } from "@/app/_components/GlobalComponents/Feedback/FeedbackMessage";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { Logo } from "@/app/_components/GlobalComponents/Layout/Logo/Logo";

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
      <Logo className="h-6 w-6 animate-pulse" />
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
              <Logo className="h-4 w-4 bg-background mr-2 animate-pulse" pathClassName="fill-primary" />
            ) : (
              <>
                <Delete03Icon className="h-4 w-4 mr-2" />
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

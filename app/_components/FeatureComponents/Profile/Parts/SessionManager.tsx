"use client";

import { Delete03Icon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useSessionManager } from "@/app/_hooks/useSessionManager";
import { SessionCard } from "@/app/_components/GlobalComponents/Cards/SessionCard";
import { FeedbackMessage } from "@/app/_components/GlobalComponents/Feedback/FeedbackMessage";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { Logo } from "@/app/_components/GlobalComponents/Layout/Logo/Logo";
import { useTranslations } from "next-intl";

export const SessionManager = () => {
  const {
    sessions,
    isLoading,
    error,
    success,
    terminating,
    handleTerminateSession,
    handleTerminateAllOtherSessions,
    TerminateSessionModal,
    TerminateAllSessionsModal,
  } = useSessionManager();

  const { isDemoMode } = useAppMode();
  const t = useTranslations();

  if (isLoading) {
    return <Logo className="h-6 w-6 animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <FeedbackMessage error={error} success={success} />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("profile.activeSessions")}</h3>
          <p className="text-md lg:text-sm text-muted-foreground">
            {t(sessions.length === 1 ? "profile.activeSession" : "profile.activeSession_plural", { count: sessions.length })}
          </p>
        </div>
        {sessions.some((s) => !s.isCurrent) && !isDemoMode && (
          <Button
            variant="destructive"
            onClick={handleTerminateAllOtherSessions}
            disabled={terminating.all}
          >
            {terminating.all ? (
              <Logo
                className="h-4 w-4 bg-background mr-2 animate-pulse"
                pathClassName="fill-primary"
              />
            ) : (
              <>
                <Delete03Icon className="h-4 w-4 mr-2" />
                {t("profile.terminateAllOthers")}
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

      <TerminateSessionModal />
      <TerminateAllSessionsModal />
    </div>
  );
};

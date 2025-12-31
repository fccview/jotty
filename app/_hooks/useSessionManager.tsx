import { useState, useCallback, useEffect } from "react";
import { Session } from "@/app/_types";
import { getCurrentUser } from "@/app/_server/actions/users";
import { useTranslations } from 'next-intl';
import {
  getSessionsForUser,
  SessionData,
  getSessionId,
  terminateSession,
  terminateAllOtherSessions,
} from "@/app/_server/actions/session";

export const useSessionManager = () => {
  const t = useTranslations();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [status, setStatus] = useState({
    isLoading: true,
    error: null as string | null,
    success: null as string | null,
  });
  const [terminating, setTerminating] = useState<{
    id: string | null;
    all: boolean;
  }>({ id: null, all: false });

  const loadSessions = useCallback(async () => {
    setStatus({ isLoading: true, error: null, success: null });
    try {
      const currentUser = await getCurrentUser();
      const sessionId = await getSessionId();
      if (!currentUser) throw new Error("Not authenticated");
      const result = await getSessionsForUser(currentUser.username);
      const updatedSessions = result?.map((session: SessionData) => {
        return {
          ...session,
          isCurrent: session.id === sessionId,
        };
      });

      if (result) setSessions(updatedSessions);
      else throw new Error("Failed to load sessions");
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : t("errors.anErrorOccurred"),
      }));
    } finally {
      setStatus((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleTerminateSession = async (sessionId: string) => {
    if (!window.confirm(t("profile.terminateSessionConfirm")))
      return;
    setTerminating({ id: sessionId, all: false });
    try {
      const formData = new FormData();
      formData.append("sessionId", sessionId);
      const result = await terminateSession(formData);
      if (result.success) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        setStatus((prev) => ({ ...prev, success: "Session terminated!" }));
        setTimeout(
          () => setStatus((prev) => ({ ...prev, success: null })),
          3000
        );
      } else throw new Error(result.error || "Failed to terminate session");
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : t("errors.anErrorOccurred"),
      }));
    } finally {
      setTerminating({ id: null, all: false });
    }
  };

  const handleTerminateAllOtherSessions = async () => {
    if (
      !window.confirm(t("profile.terminateAllSessionsConfirm"))
    )
      return;
    setTerminating({ id: null, all: true });
    try {
      const result = await terminateAllOtherSessions();
      if (result.success) {
        setSessions((prev) => prev.filter((s) => s.isCurrent));
        setStatus((prev) => ({
          ...prev,
          success: "All other sessions terminated!",
        }));
        setTimeout(
          () => setStatus((prev) => ({ ...prev, success: null })),
          3000
        );
      } else throw new Error(result.error || "Failed to terminate sessions");
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : t("errors.anErrorOccurred"),
      }));
    } finally {
      setTerminating({ id: null, all: false });
    }
  };

  return {
    sessions,
    ...status,
    terminating,
    handleTerminateSession,
    handleTerminateAllOtherSessions,
  };
};

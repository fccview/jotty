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
import { ConfirmModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/ConfirmModal";

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
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [showTerminateAllModal, setShowTerminateAllModal] = useState(false);
  const [sessionToTerminate, setSessionToTerminate] = useState<string | null>(null);

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

  const handleTerminateSession = (sessionId: string) => {
    setSessionToTerminate(sessionId);
    setShowTerminateModal(true);
  };

  const confirmTerminateSession = async () => {
    if (!sessionToTerminate) return;

    setTerminating({ id: sessionToTerminate, all: false });
    setShowTerminateModal(false);
    try {
      const formData = new FormData();
      formData.append("sessionId", sessionToTerminate);
      const result = await terminateSession(formData);
      if (result.success) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionToTerminate));
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
      setSessionToTerminate(null);
    }
  };

  const handleTerminateAllOtherSessions = () => {
    setShowTerminateAllModal(true);
  };

  const confirmTerminateAllSessions = async () => {
    setTerminating({ id: null, all: true });
    setShowTerminateAllModal(false);
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
    TerminateSessionModal: () => (
      <ConfirmModal
        isOpen={showTerminateModal}
        onClose={() => {
          setShowTerminateModal(false);
          setSessionToTerminate(null);
        }}
        onConfirm={confirmTerminateSession}
        title={t("common.confirm")}
        message={t("profile.terminateSessionConfirm")}
        confirmText={t("common.confirm")}
        variant="destructive"
      />
    ),
    TerminateAllSessionsModal: () => (
      <ConfirmModal
        isOpen={showTerminateAllModal}
        onClose={() => setShowTerminateAllModal(false)}
        onConfirm={confirmTerminateAllSessions}
        title={t("common.confirm")}
        message={t("profile.terminateAllSessionsConfirm")}
        confirmText={t("common.confirm")}
        variant="destructive"
      />
    ),
  };
};

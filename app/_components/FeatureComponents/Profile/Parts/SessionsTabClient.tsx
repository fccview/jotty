"use client";

import { useState } from "react";
import { Session } from "@/app/_types";
import { SessionCard } from "@/app/_components/GlobalComponents/Cards/SessionCard";
import { FeedbackMessage } from "@/app/_components/GlobalComponents/Feedback/FeedbackMessage";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { Logo } from "@/app/_components/GlobalComponents/Layout/Logo/Logo";
import { useTranslations } from "next-intl";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Delete03Icon } from "hugeicons-react";
import { terminateSession, terminateAllOtherSessions } from "@/app/_server/actions/session";
import { ConfirmModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/ConfirmModal";

interface SessionsTabClientProps {
    initialSessions: Session[];
}

export const SessionsTabClient = ({ initialSessions }: SessionsTabClientProps) => {
    const t = useTranslations();
    const { isDemoMode } = useAppMode();
    const [sessions, setSessions] = useState<Session[]>(initialSessions);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [terminating, setTerminating] = useState<{
        id: string | null;
        all: boolean;
    }>({ id: null, all: false });
    const [showTerminateModal, setShowTerminateModal] = useState(false);
    const [showTerminateAllModal, setShowTerminateAllModal] = useState(false);
    const [sessionToTerminate, setSessionToTerminate] = useState<string | null>(null);

    const handleTerminateSession = (sessionId: string) => {
        setSessionToTerminate(sessionId);
        setShowTerminateModal(true);
    };

    const confirmTerminateSession = async () => {
        if (!sessionToTerminate) return;

        setTerminating({ id: sessionToTerminate, all: false });
        setError(null);
        setSuccess(null);
        setShowTerminateModal(false);

        try {
            const formData = new FormData();
            formData.append("sessionId", sessionToTerminate);
            const result = await terminateSession(formData);

            if (result.success) {
                setSessions((prev) => prev.filter((s) => s.id !== sessionToTerminate));
                setSuccess("Session terminated!");
                setTimeout(() => setSuccess(null), 3000);
            } else {
                throw new Error(result.error || t("errors.anErrorOccurred"));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t("errors.anErrorOccurred"));
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
        setError(null);
        setSuccess(null);
        setShowTerminateAllModal(false);

        try {
            const result = await terminateAllOtherSessions();

            if (result.success) {
                setSessions((prev) => prev.filter((s) => s.isCurrent));
                setSuccess("All other sessions terminated!");
                setTimeout(() => setSuccess(null), 3000);
            } else {
                throw new Error(result.error || t("errors.anErrorOccurred"));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t("errors.anErrorOccurred"));
        } finally {
            setTerminating({ id: null, all: false });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{t("profile.activeSessions")}</h2>
            </div>

            <div className="space-y-4">
                <FeedbackMessage error={error} success={success} />

                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold">{t("profile.activeSessions")}</h3>
                        <p className="text-sm text-muted-foreground">
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
            </div>

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

            <ConfirmModal
                isOpen={showTerminateAllModal}
                onClose={() => setShowTerminateAllModal(false)}
                onConfirm={confirmTerminateAllSessions}
                title={t("common.confirm")}
                message={t("profile.terminateAllSessionsConfirm")}
                confirmText={t("common.confirm")}
                variant="destructive"
            />
        </div>
    );
};

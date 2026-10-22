"use client";

import { useState } from "react";
import { verifyMfaLogin } from "@/app/_server/actions/auth";
import { useTranslations } from "next-intl";
import { AuthShell } from "@/app/_components/GlobalComponents/Auth/AuthShell";
import { CodeInput } from "@/app/_components/GlobalComponents/FormElements/CodeInput";
import { Logo } from "@/app/_components/GlobalComponents/Layout/Logo/Logo";
import { FeedbackMessage } from "@/app/_components/GlobalComponents/Feedback/FeedbackMessage";

export default function VerifyMfaPage() {
    const t = useTranslations();
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleCodeComplete = async (code: string) => {
        setIsLoading(true);
        setError("");

        const formData = new FormData();
        formData.append("code", code);
        formData.append("useBackupCode", "false");

        try {
            const result = await verifyMfaLogin(formData);
            if (result?.error) {
                setError(result.error);
                setIsLoading(false);
            }
        } catch (error: unknown) {
            if (error && typeof error === "object" && "digest" in error) {
                const digest = (error as { digest?: string }).digest;
                if (digest?.startsWith("NEXT_REDIRECT")) {
                    throw error;
                }
            }
            setError(t("auth.errorOccurred"));
            setIsLoading(false);
        }
    };

    return (
        <AuthShell
            kicker={t("auth.loginTitle")}
            title={t("mfa.verifyTitle")}
            description={t("mfa.verifyDescription")}
        >
            <FeedbackMessage error={error || null} success={null} />

            <CodeInput
                length={6}
                onComplete={handleCodeComplete}
                disabled={isLoading}
                autoFocus
            />

            {isLoading && (
                <div className="flex items-center justify-center gap-2 text-md lg:text-sm text-muted-foreground">
                    <Logo className="h-4 w-4 animate-pulse" />
                    {t("mfa.verifying")}
                </div>
            )}
        </AuthShell>
    );
}

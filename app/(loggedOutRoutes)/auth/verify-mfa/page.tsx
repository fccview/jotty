"use client";

import { useState } from "react";
import { verifyMfaLogin } from "@/app/_server/actions/auth";
import { useTranslations } from "next-intl";
import { AuthShell } from "@/app/_components/GlobalComponents/Auth/AuthShell";
import { CodeInput } from "@/app/_components/GlobalComponents/FormElements/CodeInput";
import { Logo } from "@/app/_components/GlobalComponents/Layout/Logo/Logo";

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
        <AuthShell>
            <div className="space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        {t("mfa.verifyTitle")}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {t("mfa.verifyDescription")}
                    </p>
                </div>

                {error && (
                    <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-jotty">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <CodeInput
                        length={6}
                        onComplete={handleCodeComplete}
                        disabled={isLoading}
                        autoFocus
                    />

                    {isLoading && (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Logo className="h-4 w-4 animate-pulse" />
                            {t("mfa.verifying")}
                        </div>
                    )}
                </div>
            </div>
        </AuthShell>
    );
}

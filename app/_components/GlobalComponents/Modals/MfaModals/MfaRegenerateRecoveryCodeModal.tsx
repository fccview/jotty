"use client";

import { useState } from "react";
import { Modal } from "../Modal";
import { Button } from "../../Buttons/Button";
import { Input } from "../../FormElements/Input";
import { InfoBox } from "../../Cards/InfoBox";
import { regenerateRecoveryCode } from "@/app/_server/actions/mfa";
import { useToast } from "@/app/_providers/ToastProvider";
import { useTranslations } from "next-intl";
import { Copy01Icon } from "hugeicons-react";
import { CodeInput } from "../../FormElements/CodeInput";

interface MfaRegenerateRecoveryCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const MfaRegenerateRecoveryCodeModal = ({
    isOpen,
    onClose,
    onSuccess,
}: MfaRegenerateRecoveryCodeModalProps) => {
    const t = useTranslations();
    const { showToast } = useToast();
    const [step, setStep] = useState<1 | 2>(1);
    const [recoveryCode, setRecoveryCode] = useState("");
    const [isRegenerating, setIsRegenerating] = useState(false);

    const handleCodeComplete = async (code: string) => {
        setIsRegenerating(true);
        try {
            const result = await regenerateRecoveryCode(code);

            if (result.success && result.data) {
                setRecoveryCode(result.data.recoveryCode);
                setStep(2);
                showToast({
                    type: "success",
                    title: t("common.success"),
                    message: t("mfa.recoveryCodeRegeneratedSuccess"),
                });
            } else {
                showToast({
                    type: "error",
                    title: t("common.error"),
                    message: result.error || t("mfa.invalidCode"),
                });
            }
        } catch (error) {
            showToast({
                type: "error",
                title: t("common.error"),
                message: t("auth.errorOccurred"),
            });
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleCopyRecoveryCode = async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(recoveryCode);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = recoveryCode;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand("copy");
                document.body.removeChild(textArea);
            }
            showToast({
                type: "success",
                title: t("common.success"),
                message: t("common.copied"),
            });
        } catch (error) {
            showToast({
                type: "error",
                title: t("common.error"),
                message: t("common.copyFailed"),
            });
        }
    };

    const handleClose = () => {
        setStep(1);
        setRecoveryCode("");
        onClose();
    };

    const handleComplete = () => {
        handleClose();
        onSuccess();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={step === 2 ? handleComplete : handleClose}
            title={t("mfa.regenerateRecoveryCodeTitle")}
        >
            {step === 1 && (
                <div className="space-y-6">
                    <InfoBox
                        variant="warning"
                        title={t("mfa.regenerateRecoveryCodeWarning")}
                        items={[t("mfa.regenerateRecoveryCodeDescription")]}
                    />

                    <div className="space-y-2">
                        <label className="text-md lg:text-sm font-medium text-foreground">
                            {t("mfa.enterCode")}
                        </label>
                        <CodeInput
                            length={6}
                            onComplete={handleCodeComplete}
                            disabled={isRegenerating}
                            autoFocus
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isRegenerating}
                        >
                            {t("common.cancel")}
                        </Button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6">
                    <InfoBox
                        variant="success"
                        title={t("mfa.recoveryCodeRegenerated")}
                        items={[t("mfa.recoveryCodeRegeneratedInfo")]}
                    />

                    <div className="space-y-3">
                        <label className="text-md lg:text-sm font-medium text-foreground">
                            {t("mfa.recoveryCodeTitle")}
                        </label>
                        <p className="text-md lg:text-sm text-muted-foreground">
                            {t("mfa.recoveryCodeInfo")}
                        </p>
                        <div className="flex gap-2">
                            <Input
                                id="recovery-code"
                                type="text"
                                value={recoveryCode}
                                onChange={() => {}}
                                className="font-mono"
                                disabled
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleCopyRecoveryCode}
                                className="shrink-0"
                            >
                                <Copy01Icon className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleComplete}>
                            {t("common.done")}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

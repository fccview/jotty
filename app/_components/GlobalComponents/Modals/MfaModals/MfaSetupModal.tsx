"use client";

import { useState, useEffect } from "react";
import { Modal } from "../Modal";
import { Button } from "../../Buttons/Button";
import { Input } from "../../FormElements/Input";
import { InfoBox } from "../../Cards/InfoBox";
import { generateMfaSecret, verifyAndEnableMfa } from "@/app/_server/actions/mfa";
import { useToast } from "@/app/_providers/ToastProvider";
import { useTranslations } from "next-intl";
import { Download01Icon, Copy01Icon } from "hugeicons-react";
import Image from "next/image";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { DynamicLogo } from "@/app/_components/GlobalComponents/Layout/Logo/DynamicLogo";
import { CodeInput } from "@/app/_components/GlobalComponents/FormElements/CodeInput";

interface MfaSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    username: string;
}

export const MfaSetupModal = ({
    isOpen,
    onClose,
    onSuccess,
    username,
}: MfaSetupModalProps) => {
    const t = useTranslations();
    const { showToast } = useToast();
    const { isRwMarkable } = useAppMode();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [secret, setSecret] = useState("");
    const [qrCode, setQrCode] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [recoveryCode, setRecoveryCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        if (isOpen && step === 1) {
            loadQrCode();
        }
    }, [isOpen]);

    const loadQrCode = async () => {
        setIsLoading(true);
        try {
            const result = await generateMfaSecret();
            if (result.success && result.data) {
                setSecret(result.data.secret);
                setQrCode(result.data.qrCode);
            } else {
                showToast({
                    type: "error",
                    title: t("common.error"),
                    message: result.error || t("mfa.invalidCode"),
                });
                onClose();
            }
        } catch (error) {
            showToast({
                type: "error",
                title: t("common.error"),
                message: t("auth.errorOccurred"),
            });
            onClose();
        } finally {
            setIsLoading(false);
        }
    };


    const handleCopySecret = async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(secret);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = secret;
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
        setSecret("");
        setQrCode("");
        setVerificationCode("");
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
            onClose={step === 3 ? handleComplete : handleClose}
            title={t("mfa.setupTitle")}
            className="max-w-lg"
        >
            {step === 1 && (
                <div className="space-y-6">
                    <InfoBox
                        variant="info"
                        title={t("mfa.step1")}
                        items={[t("mfa.setupDescription")]}
                    />

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-muted-foreground">{t("common.loading")}</div>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-center">
                                {qrCode ? (
                                    <div className="relative bg-background p-4 rounded-jotty border border-border">
                                        <Image
                                            src={qrCode}
                                            alt="QR Code"
                                            width={300}
                                            height={300}
                                            className="rounded-jotty"
                                        />
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                            <Image
                                                src="/app-icons/logos/logo.svg"
                                                alt="Logo"
                                                width={60}
                                                height={60}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-muted-foreground">{t("common.loading")}</div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-md lg:text-sm font-medium text-foreground">
                                    {t("mfa.manualEntry")}
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        id="secret"
                                        type="text"
                                        value={secret}
                                        onChange={() => { }}
                                        className="font-mono"
                                        disabled
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCopySecret}
                                        className="shrink-0"
                                    >
                                        <Copy01Icon className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isLoading}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button
                            type="button"
                            onClick={() => setStep(2)}
                            disabled={isLoading}
                        >
                            {t("common.next")}
                        </Button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6">
                    <InfoBox
                        variant="info"
                        title={t("mfa.step2")}
                        items={[t("mfa.verifySetup")]}
                    />

                    <CodeInput
                        length={6}
                        onComplete={async (code) => {
                            setIsVerifying(true);
                            try {
                                const result = await verifyAndEnableMfa(code, secret);

                                if (result.success && result.data) {
                                    setRecoveryCode(result.data.recoveryCode);
                                    setStep(3);
                                    showToast({
                                        type: "success",
                                        title: t("common.success"),
                                        message: t("mfa.mfaEnabledSuccess"),
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
                                setIsVerifying(false);
                            }
                        }}
                        disabled={isVerifying}
                        autoFocus
                    />

                    {isVerifying && (
                        <div className="flex items-center justify-center gap-2 text-md lg:text-sm text-muted-foreground">
                            <DynamicLogo className="h-4 w-4 animate-pulse" size="32x32" />
                            {t("mfa.verifying")}
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setStep(1)}
                            disabled={isVerifying}
                        >
                            {t("common.back")}
                        </Button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6">
                    <InfoBox
                        variant="info"
                        title={t("mfa.setupComplete")}
                        items={[t("mfa.setupCompleteDescription")]}
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
                                onChange={() => { }}
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

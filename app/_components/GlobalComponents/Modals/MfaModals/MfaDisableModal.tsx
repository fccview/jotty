"use client";

import { useState } from "react";
import { Modal } from "../Modal";
import { Button } from "../../Buttons/Button";
import { CodeInput } from "../../FormElements/CodeInput";
import { InfoBox } from "../../Cards/InfoBox";
import { disableMfa } from "@/app/_server/actions/mfa";
import { useToast } from "@/app/_providers/ToastProvider";
import { useTranslations } from "next-intl";

interface MfaDisableModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const MfaDisableModal = ({
    isOpen,
    onClose,
    onSuccess,
}: MfaDisableModalProps) => {
    const t = useTranslations();
    const { showToast } = useToast();
    const [isDisabling, setIsDisabling] = useState(false);

    const handleCodeComplete = async (code: string) => {
        setIsDisabling(true);
        try {
            const result = await disableMfa(code);

            if (result.success) {
                showToast({
                    type: "success",
                    title: t("common.success"),
                    message: t("mfa.mfaDisabledSuccess"),
                });
                onClose();
                onSuccess();
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
            setIsDisabling(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t("mfa.disableTitle")}
        >
            <div className="space-y-6">
                <InfoBox
                    variant="warning"
                    title={t("mfa.disableWarning")}
                    items={[t("mfa.disableDescription")]}
                />

                <div className="space-y-2">
                    <label className="text-md lg:text-sm font-medium text-foreground">
                        {t("mfa.enterCode")}
                    </label>
                    <CodeInput
                        length={6}
                        onComplete={handleCodeComplete}
                        disabled={isDisabling}
                        autoFocus
                    />
                </div>

                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isDisabling}
                    >
                        {t("common.cancel")}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

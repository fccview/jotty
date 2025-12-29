"use client";

import { useState } from "react";
import { Modal } from "../Modal";
import { Button } from "../../Buttons/Button";
import { Input } from "../../FormElements/Input";
import { InfoBox } from "../../Cards/InfoBox";
import { adminDisableUserMfa } from "@/app/_server/actions/mfa";
import { useToast } from "@/app/_providers/ToastProvider";
import { useTranslations } from "next-intl";

interface AdminDisableMfaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    username: string;
}

export const AdminDisableMfaModal = ({
    isOpen,
    onClose,
    onSuccess,
    username,
}: AdminDisableMfaModalProps) => {
    const t = useTranslations();
    const { showToast } = useToast();
    const [recoveryCode, setRecoveryCode] = useState("");
    const [isDisabling, setIsDisabling] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!recoveryCode.trim()) {
            showToast({
                type: "error",
                title: t("common.error"),
                message: t("mfa.recoveryCodeRequired"),
            });
            return;
        }

        setIsDisabling(true);
        try {
            const result = await adminDisableUserMfa(username, recoveryCode);

            if (result.success) {
                showToast({
                    type: "success",
                    title: t("common.success"),
                    message: t("mfa.adminMfaDisabledSuccess"),
                });
                handleClose();
                onSuccess();
            } else {
                showToast({
                    type: "error",
                    title: t("common.error"),
                    message: result.error || t("mfa.invalidRecoveryCode"),
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

    const handleClose = () => {
        setRecoveryCode("");
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={t("mfa.adminDisableMfaTitle")}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <InfoBox
                    variant="warning"
                    title={t("mfa.adminDisableMfaWarning")}
                    items={[t("mfa.adminDisableMfaDescription", { username })]}
                />

                <Input
                    id="recovery-code"
                    type="text"
                    label={t("mfa.recoveryCode")}
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                    autoComplete="off"
                    disabled={isDisabling}
                    autoFocus
                />

                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isDisabling}
                    >
                        {t("common.cancel")}
                    </Button>
                    <Button
                        type="submit"
                        variant="destructive"
                        disabled={isDisabling || !recoveryCode.trim()}
                    >
                        {isDisabling ? t("common.saving") : t("mfa.disable")}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

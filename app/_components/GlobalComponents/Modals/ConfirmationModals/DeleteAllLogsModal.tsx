"use client";

import { useState } from "react";
import { Delete03Icon, AlertCircleIcon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Modal } from "../Modal";
import { useTranslations } from "next-intl";
import { Logo } from "../../Layout/Logo/Logo";

interface DeleteAllLogsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

export const DeleteAllLogsModal = ({
    isOpen,
    onClose,
    onConfirm,
}: DeleteAllLogsModalProps) => {
    const t = useTranslations();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirm = async () => {
        setIsDeleting(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            console.error("Error deleting logs:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={true} onClose={onClose} title={t("auditLogs.deleteAllLogsModalTitle")}>
            <div className="space-y-4">
                <div className="bg-destructive/10 border border-destructive/20 rounded-jotty p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircleIcon className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-md lg:text-sm font-medium text-destructive">
                                {t("auditLogs.deleteAllLogsWarning")}
                            </p>
                            <p className="text-md lg:text-xs text-destructive/80 mt-1">
                                {t("auditLogs.deleteAllLogsWarningDescription")}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                    <Button variant="outline" onClick={onClose} disabled={isDeleting}>
                        {t("common.cancel")}
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isDeleting ? (
                            <>
                                <Logo className="h-4 w-4 mr-2 animate-pulse" />
                                {t("auditLogs.deletingAllLogs")}
                            </>
                        ) : (
                            <>
                                <Delete03Icon className="h-4 w-4 mr-2" />
                                {t("auditLogs.deleteAllLogsButton")}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

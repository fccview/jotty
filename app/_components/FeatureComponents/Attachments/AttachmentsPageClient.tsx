"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { AttachmentFolder, AttachmentPage, FileItem } from "@/app/_types";
import { deleteAttachment } from "@/app/_server/actions/attachments";
import { useAttachmentBrowser } from "@/app/_hooks/useAttachmentBrowser";
import { useAttachmentError } from "@/app/_hooks/useAttachmentError";
import { useToast } from "@/app/_providers/ToastProvider";
import { AttachmentBrowser } from "@/app/_components/GlobalComponents/Attachments/AttachmentBrowser";
import { ConfirmModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/ConfirmModal";

interface AttachmentsPageClientProps {
  initialFolders?: AttachmentPage<AttachmentFolder>;
}

export const AttachmentsPageClient = ({ initialFolders }: AttachmentsPageClientProps) => {
  const t = useTranslations();
  const explain = useAttachmentError();
  const { showToast } = useToast();
  const browser = useAttachmentBrowser(true, initialFolders);
  const [doomed, setDoomed] = useState<FileItem | null>(null);

  const confirmDelete = async () => {
    const file = doomed;
    setDoomed(null);
    if (!file?.itemUuid) return;

    try {
      const result = await deleteAttachment(file.itemUuid, file.fileName);
      if (!result.success) {
        showToast({ type: "error", title: explain(result.error, "common.failedToDeleteFile") });
        return;
      }
      showToast({ type: "success", title: t("attachments.deleted") });
      await browser.refresh();
    } catch (error) {
      console.error("Error deleting attachment:", error);
      showToast({ type: "error", title: t("common.failedToDeleteFile") });
    }
  };

  return (
    <div className="jotty-attachments-page space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{t("attachments.title")}</h2>
        <p className="text-md lg:text-sm text-muted-foreground mt-1">
          {t("attachments.subtitle")}
        </p>
      </div>

      <AttachmentBrowser
        browser={browser}
        onPickFile={(file) => window.open(file.url, "_blank", "noopener")}
        onDeleteFile={setDoomed}
      />

      <ConfirmModal
        isOpen={doomed !== null}
        onClose={() => setDoomed(null)}
        onConfirm={confirmDelete}
        title={t("common.delete")}
        message={t("attachments.confirmDelete", { name: doomed?.name || "" })}
        confirmText={t("common.delete")}
        variant="destructive"
      />
    </div>
  );
};

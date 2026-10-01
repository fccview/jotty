"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LockIcon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { ConfirmModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/ConfirmModal";
import { usePermissions } from "@/app/_providers/PermissionsProvider";
import { useToast } from "@/app/_providers/ToastProvider";
import { fixFrontmatter } from "@/app/_server/actions/frontmatter";
import { StampRefusals } from "@/app/_consts/identity";
import type { ItemType } from "@/app/_types/core";

interface LockedItemNoticeProps {
  uuid: string;
  itemType: ItemType;
  lockReason?: StampRefusals;
}

export const LockedItemNotice = ({ uuid, itemType, lockReason }: LockedItemNoticeProps) => {
  const t = useTranslations("lockedItem");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { showToast } = useToast();
  const { permissions } = usePermissions();
  const [confirming, setConfirming] = useState(false);
  const [fixing, setFixing] = useState(false);

  if (!lockReason) return null;

  const fix = async () => {
    setFixing(true);
    try {
      const result = await fixFrontmatter(uuid, itemType);
      if (!result.success) {
        showToast({ type: "error", title: result.error || tCommon("error") });
        return;
      }
      showToast({ type: "success", title: t("fixed") });
      router.refresh();
    } catch (error) {
      console.error("Could not fix frontmatter:", error);
      showToast({ type: "error", title: tCommon("error") });
    } finally {
      setFixing(false);
    }
  };

  return (
    <div
      role="alert"
      className="jotty-locked-item-notice mx-4 mt-4 flex flex-col gap-3 rounded-jotty border border-destructive/20 bg-destructive/10 p-4 sm:flex-row sm:items-center"
    >
      <LockIcon className="h-5 w-5 shrink-0 text-destructive" />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium text-destructive">{t("title")}</p>
        <p className="text-sm text-muted-foreground">{t(`reasons.${lockReason}`)}</p>
        {!permissions?.canFix && (
          <p className="text-sm text-muted-foreground">{t("askEditor")}</p>
        )}
      </div>
      {permissions?.canFix && (
        <Button
          variant="outline"
          size="sm"
          disabled={fixing}
          onClick={() => setConfirming(true)}
        >
          {t("fix")}
        </Button>
      )}
      <ConfirmModal
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={fix}
        title={t("confirmTitle")}
        message={t("confirmMessage")}
        confirmText={t("confirm")}
        variant="destructive"
      />
    </div>
  );
};

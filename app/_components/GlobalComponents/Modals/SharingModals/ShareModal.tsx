"use client";

import { Modal } from "../Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useSharingTools } from "@/app/_hooks/useSharingTools";
import { FeedbackMessage } from "./Parts/SharingFeedbackMessage";
import { ShareTabs } from "./Parts/ShareTabs";
import { UsersShareTab } from "./Parts/UsersShareTab";
import { PublicShareTab } from "./Parts/PublicShareTabs";
import { ItemType } from "@/app/_types";
import { useMetadata } from "@/app/_providers/MetadataProvider";
import { useTranslations } from "next-intl";
import { ItemTypes } from "@/app/_types/enums";

export const ShareModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const t = useTranslations();
  const metadata = useMetadata();

  const hookResult = useSharingTools({
    isOpen,
    onClose,
    enabled: true,
    itemId: metadata.id,
    itemTitle: metadata.title,
    itemType: metadata.type as ItemType,
    itemCategory: metadata.category,
    itemOwner: metadata.owner || "",
    itemUuid: metadata.uuid,
  });
  const { error, success, activeTab, setActiveTab, resetMessages } = hookResult;

  if (!isOpen) return null;

  const handleTabChange = (tab: "users" | "public") => {
    resetMessages();
    setActiveTab(tab);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t('sharing.shareModalTitle', { type: metadata.type === ItemTypes.CHECKLIST ? t("common.checklist") : t("common.note") })}>
      <div className="space-y-4 py-6">
        <h3 className="font-semibold text-lg">{metadata.title}</h3>
        <FeedbackMessage error={error} success={success} />
        <ShareTabs activeTab={activeTab} setActiveTab={handleTabChange} />
        {activeTab === "users" ? (
          <UsersShareTab {...hookResult} />
        ) : (
          <PublicShareTab
            {...hookResult}
            itemTitle={metadata.title}
            itemType={metadata.type as ItemType}
          />
        )}
      </div>

      <div className="flex items-center justify-between p-6 border-t border-border bg-muted/20">
        <div>
          {activeTab === "users" && hookResult.currentSharing.length > 0 && (
            <Button
              variant="destructive"
              onClick={hookResult.handleRemoveAllSharing}
              disabled={hookResult.isLoading}
            >
              {t('common.removeAll')}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={hookResult.isLoading}
          >{t('common.close')}</Button>
        </div>
      </div>
    </Modal>
  );
};

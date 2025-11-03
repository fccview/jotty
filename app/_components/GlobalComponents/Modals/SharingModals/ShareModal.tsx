"use client";

import { Modal } from "../Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Share2 } from "lucide-react";
import { useSharingTools } from "@/app/_hooks/useSharingTools";
import { FeedbackMessage } from "./Parts/SharingFeedbackMessage";
import { ShareTabs } from "./Parts/ShareTabs";
import { UsersShareTab } from "./Parts/UsersShareTab";
import { PublicShareTab } from "./Parts/PublicShareTabs";
import { ItemType } from "@/app/_types";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
  itemType: ItemType;
  itemCategory?: string;
  itemOwner: string;
}

export const ShareModal = (props: ShareModalProps) => {
  const { isOpen, onClose, itemTitle, itemType } = props;
  const hookResult = useSharingTools({
    ...props,
    enabled: true,
  });
  const { error, success, activeTab, setActiveTab, resetMessages } = hookResult;

  if (!isOpen) return null;

  const handleTabChange = (tab: "users" | "public") => {
    resetMessages();
    setActiveTab(tab);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Share ${itemType}`}
      titleIcon={<Share2 className="h-5 w-5 text-primary" />}
    >
      <div className="space-y-4 py-6">
        <h3 className="font-semibold text-lg">{itemTitle}</h3>
        <FeedbackMessage error={error} success={success} />
        <ShareTabs activeTab={activeTab} setActiveTab={handleTabChange} />
        {activeTab === "users" ? (
          <UsersShareTab {...hookResult} />
        ) : (
          <PublicShareTab
            {...hookResult}
            itemTitle={itemTitle}
            itemType={itemType}
          />
        )}
      </div>

      <div className="flex items-center justify-between p-6 border-t border-border bg-muted/20">
        <div>
          {activeTab === "users" && hookResult.currentSharing.length > 0 && (
            <Button
              variant="outline"
              onClick={hookResult.handleRemoveAllSharing}
              disabled={hookResult.isLoading}
              className="text-destructive hover:text-destructive"
            >
              Remove All
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={hookResult.isLoading}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

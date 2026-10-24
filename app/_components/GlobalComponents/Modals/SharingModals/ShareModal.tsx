"use client";

import { useTranslations } from "next-intl";
import { Modal, ModalVariant } from "../Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { FeedbackMessage } from "@/app/_components/GlobalComponents/Feedback/FeedbackMessage";
import { useSharingTools } from "@/app/_hooks/useSharingTools";
import { useMetadata } from "@/app/_providers/MetadataProvider";
import { ItemType } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";
import { FollowFolder } from "./Parts/FollowFolder";
import { PeopleSection } from "./Parts/PeopleSection";
import { ITEM_CHIPS } from "./Parts/PermissionChips";
import { PublicLinkSection } from "./Parts/PublicLinkSection";

const READ_ONLY = { canRead: true, canEdit: false, canDelete: false };

export const ShareModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const t = useTranslations();
  const metadata = useMetadata();
  const itemType = metadata.type as ItemType;
  const typeLabel = t(itemType === ItemTypes.CHECKLIST ? "common.checklist" : "common.note");

  const sharing = useSharingTools({
    isOpen,
    onClose,
    enabled: true,
    itemTitle: metadata.title,
    itemType,
    itemOwner: metadata.owner || "",
    itemUuid: metadata.uuid || "",
  });
  const hasAnyShare =
    !sharing.isFollowing && (sharing.currentSharing.length > 0 || sharing.isPubliclyShared);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      variant={ModalVariant.PANEL}
      kicker={t("sharing.shareModalTitle", { type: typeLabel })}
      title={<span className="truncate">{metadata.title}</span>}
      description={t("sharing.panelHint")}
      flush
      footer={(close) => (
        <div className="flex items-center justify-between gap-3">
          <div>
            {hasAnyShare && (
              <Button
                variant="destructive"
                size="sm"
                onClick={sharing.handleRemoveAllSharing}
                disabled={sharing.isLoading}
              >
                {t("sharing.stopSharing")}
              </Button>
            )}
          </div>
          <Button size="sm" onClick={close} disabled={sharing.isLoading}>
            {t("common.done")}
          </Button>
        </div>
      )}
    >
      {(sharing.error || sharing.success) && (
        <div className="px-6 pt-4 pb-3">
          <FeedbackMessage error={sharing.error} success={sharing.success} />
        </div>
      )}
      <FollowFolder
        folder={sharing.sharedParent}
        isFollowing={sharing.isFollowing}
        isLoading={sharing.isLoading}
        onToggle={sharing.handleFollow}
      />
      <PeopleSection
        sharees={sharing.users.filter(({ username }) => sharing.currentSharing.includes(username))}
        candidates={sharing.filteredUsers.filter(
          ({ username }) => !sharing.currentSharing.includes(username),
        )}
        chips={ITEM_CHIPS}
        permissionsOf={(username) => sharing.userPermissions[username] || READ_ONLY}
        onPermission={sharing.handlePermissionChange}
        onShare={(username) => sharing.handleShare("share", username)}
        onUnshare={(username) => sharing.handleShare("unshare", username)}
        searchQuery={sharing.searchQuery}
        setSearchQuery={sharing.setSearchQuery}
        isLoading={sharing.isLoading}
        isLocked={sharing.isFollowing}
      />
      <PublicLinkSection
        {...sharing}
        isLocked={sharing.isFollowing}
        itemTitle={metadata.title}
        itemType={itemType}
      />
    </Modal>
  );
};

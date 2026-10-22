"use client";

import { useTranslations } from "next-intl";
import { Alert02Icon, Globe02Icon } from "hugeicons-react";
import { Modal, ModalVariant } from "../Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { FeedbackMessage } from "@/app/_components/GlobalComponents/Feedback/FeedbackMessage";
import { useFolderShare } from "@/app/_hooks/useFolderShare";
import { Modes } from "@/app/_types/enums";
import { PeopleSection } from "./Parts/PeopleSection";
import { FOLDER_CHIPS } from "./Parts/PermissionChips";
import { ShareSection } from "./Parts/ShareSection";
import { ShareToggleRow } from "./Parts/ShareToggleRow";

interface FolderShareModalProps {
  isOpen: boolean;
  mode: Modes;
  categoryPath: string;
  onClose: () => void;
}

const READ_ONLY = { canRead: true, canEdit: false, canDelete: false, canCreate: false };

export const FolderShareModal = ({
  isOpen,
  mode,
  categoryPath,
  onClose,
}: FolderShareModalProps) => {
  const t = useTranslations();
  const {
    isLoading,
    error,
    grants,
    sharees,
    isPublic,
    searchQuery,
    setSearchQuery,
    candidates,
    toggleUser,
    setPerms,
    togglePublic,
  } = useFolderShare({ isOpen, mode, categoryPath });

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      variant={ModalVariant.PANEL}
      kicker={t("sharing.shareFolder")}
      title={<span className="truncate">{categoryPath}</span>}
      description={t("sharing.folderShareHint")}
      flush
      footer={(close) => (
        <div className="flex justify-end">
          <Button size="sm" onClick={close} disabled={isLoading}>
            {t("common.done")}
          </Button>
        </div>
      )}
    >
      {error && (
        <div className="px-6 pt-4 pb-3">
          <FeedbackMessage error={error} success={null} />
        </div>
      )}
      <PeopleSection
        sharees={sharees}
        candidates={candidates}
        chips={FOLDER_CHIPS}
        permissionsOf={(username) => grants[username] || READ_ONLY}
        onPermission={setPerms}
        onShare={toggleUser}
        onUnshare={toggleUser}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isLoading={isLoading}
      />
      <ShareSection id="share-section-public" title={t("sharing.publicLinkTab")}>
        <div className="px-6 py-1">
          <ShareToggleRow
            id="folder-public-toggle"
            icon={Globe02Icon}
            label={t("sharing.publicAccess")}
            hint={
              <span className="inline-flex items-start gap-1.5">
                <Alert02Icon className="mt-px h-3.5 w-3.5 shrink-0 text-destructive" />
                {t("sharing.publicFolderWarning")}
              </span>
            }
            checked={isPublic}
            onChange={togglePublic}
            disabled={isLoading}
          />
        </div>
      </ShareSection>
    </Modal>
  );
};

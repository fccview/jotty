"use client";

import {
  ArrowLeft,
  Trash2,
  Edit3,
  Share2,
  BarChart3,
  CheckSquare,
  Users,
  Globe,
  Hash,
  Check,
  MoreHorizontal,
  Archive,
} from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Checklist } from "@/app/_types";
import { useTranslations } from "next-intl";
import { useChecklist } from "../../../../../_hooks/useChecklist";
import { DropdownMenu } from "@/app/_components/GlobalComponents/Dropdowns/DropdownMenu";
import { encodeCategoryPath } from "@/app/_utils/global-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { sharingInfo } from "@/app/_utils/sharing-utils";
import { ChecklistsTypes } from "@/app/_types/enums";
import { usePermissions } from "@/app/_providers/PermissionsProvider";
import { useState } from "react";
import { SharedWithModal } from "@/app/_components/GlobalComponents/Modals/SharingModals/SharedWithModal";
import { useMetadata } from "@/app/_providers/MetadataProvider";

interface ChecklistHeaderProps {
  checklist: Checklist;
  onBack: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onConvertType?: () => void;
  onArchive?: () => void;
}

export const ChecklistHeader = ({
  checklist,
  onBack,
  onEdit,
  onDelete,
  onShare,
  onConvertType,
  onArchive,
}: ChecklistHeaderProps) => {
  const t = useTranslations();
  const metadata = useMetadata();
  const { handleCopyId, copied } = useChecklist({
    list: checklist,
    onUpdate: () => {},
  });

  const { globalSharing } = useAppMode();
  const { permissions } = usePermissions();
  const [showSharedWithModal, setShowSharedWithModal] = useState(false);

  const encodedCategory = encodeCategoryPath(metadata.category);
  const itemDetails = sharingInfo(globalSharing, metadata.id, encodedCategory);
  const isShared = itemDetails.exists && itemDetails.sharedWith.length > 0;

  const sharedWith = itemDetails.sharedWith;
  const isPubliclyShared = itemDetails.isPublic;

  return (
    <div className="bg-background border-b border-border px-3 py-4 lg:px-6 lg:py-[12px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 lg:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-10 w-10 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5" />
          </Button>

          <div className="flex items-center gap-3 max-w-[70vw] lg:max-w-none">
            <h1 className="text-xl font-bold truncate lg:text-2xl text-foreground tracking-tight">
              {checklist.title}
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyId}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              title={`Copy ID: ${checklist?.uuid || checklist?.id}`}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Hash className="h-3 w-3" />
              )}
            </Button>

            {isPubliclyShared && (
              <span title="Publicly shared">
                <Globe className="h-3 w-3 text-primary" />
              </span>
            )}
            {isShared && (
              <span
                title={`Shared with ${sharedWith.join(", ")}`}
                className="cursor-pointer hover:text-primary"
                onClick={() => setShowSharedWithModal(true)}
              >
                <Users className="h-3 w-3" />
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2">
            {onConvertType && permissions?.canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onConvertType();
                }}
                className="h-10 w-10 p-0"
                title={
                  checklist.type === ChecklistsTypes.TASK
                    ? t("modals.convert_to_simple")
                    : t("modals.convert_to_task")
                }
              >
                {checklist.type === ChecklistsTypes.TASK ? (
                  <CheckSquare className="h-4 w-4 lg:h-5 lg:w-5" />
                ) : (
                  <BarChart3 className="h-4 w-4 lg:h-5 lg:w-5" />
                )}
              </Button>
            )}

            {onEdit && permissions?.canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="h-10 w-10 p-0"
              >
                <Edit3 className="h-4 w-4 lg:h-5 lg:w-5" />
              </Button>
            )}
          </div>

          {(permissions?.canEdit || permissions?.canDelete) && (
            <div
              className={`${
                permissions?.canEdit &&
                !permissions?.canDelete &&
                !permissions?.isOwner &&
                "lg:hidden"
              }`}
            >
              <DropdownMenu
                align="right"
                trigger={
                  <Button variant="outline" size="sm" className="h-10 w-10 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                }
                items={[
                  ...(onConvertType && permissions?.canEdit
                    ? [
                        {
                          type: "item" as const,
                          label:
                            checklist.type === ChecklistsTypes.TASK
                              ? t("modals.convert_to_simple")
                              : t("modals.convert_to_task"),
                          icon:
                            checklist.type === ChecklistsTypes.TASK ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <BarChart3 className="h-4 w-4" />
                            ),
                          onClick: () => {
                            onConvertType();
                          },
                          className: "lg:!hidden",
                        },
                      ]
                    : []),
                  ...(onArchive && permissions?.canDelete
                    ? [
                        {
                          type: "item" as const,
                          label: t("checklists.archive"),
                          icon: <Archive className="h-4 w-4" />,
                          onClick: onArchive,
                        },
                      ]
                    : []),
                  ...(onShare && permissions?.isOwner
                    ? [
                        {
                          type: "item" as const,
                          label: t("checklists.share"),
                          icon: <Share2 className="h-4 w-4" />,
                          onClick: onShare,
                        },
                      ]
                    : []),
                  ...(onEdit && permissions?.canEdit
                    ? [
                        {
                          type: "item" as const,
                          label: t("checklists.edit"),
                          icon: <Edit3 className="h-4 w-4" />,
                          onClick: onEdit,
                          className: "lg:!hidden",
                        },
                      ]
                    : []),
                  ...(onDelete && permissions?.canDelete
                    ? [
                        {
                          type: "item" as const,
                          label: t("checklists.delete"),
                          icon: <Trash2 className="h-4 w-4" />,
                          onClick: onDelete,
                          variant: "destructive" as const,
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          )}
        </div>
      </div>

      <SharedWithModal
        usernames={itemDetails.sharedWith}
        isOpen={showSharedWithModal}
        onClose={() => setShowSharedWithModal(false)}
      />
    </div>
  );
};

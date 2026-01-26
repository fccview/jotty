"use client";

import {
  ArrowLeft01Icon,
  Delete03Icon,
  PencilEdit02Icon,
  Share08Icon,
  TaskDaily01Icon,
  CheckmarkSquare04Icon,
  UserMultipleIcon,
  Globe02Icon,
  GridIcon,
  Tick02Icon,
  MoreHorizontalIcon,
  Archive02Icon,
  Copy01Icon,
  Copy02Icon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Checklist } from "@/app/_types";
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
import { useTranslations } from "next-intl";

interface ChecklistHeaderProps {
  checklist: Checklist;
  onBack: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onConvertType?: () => void;
  onArchive?: () => void;
  onClone?: () => void;
}

export const ChecklistHeader = ({
  checklist,
  onBack,
  onEdit,
  onDelete,
  onShare,
  onConvertType,
  onArchive,
  onClone,
}: ChecklistHeaderProps) => {
  const t = useTranslations();
  const metadata = useMetadata();
  const { handleCopyId, copied } = useChecklist({
    list: checklist,
    onUpdate: () => { },
  });

  const { globalSharing } = useAppMode();
  const { permissions } = usePermissions();
  const [showSharedWithModal, setShowSharedWithModal] = useState(false);

  const encodedCategory = encodeCategoryPath(metadata.category);
  const itemDetails = sharingInfo(globalSharing, metadata.uuid || metadata.id, encodedCategory);
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
            className="h-10 w-10 p-0"
          >
            <ArrowLeft01Icon className="h-4 w-4 lg:h-5 lg:w-5" />
          </Button>

          <div className="flex items-center gap-3 max-w-[70vw] lg:max-w-none">
            <h1 className="text-xl font-bold truncate lg:text-2xl text-foreground tracking-tight">
              {checklist.title}
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyId}
              className="h-6 w-6 p-0"
              title={`Copy ID: ${checklist?.uuid || checklist?.id}`}
            >
              {copied ? (
                <Tick02Icon className="h-3 w-3 text-green-500" />
              ) : (
                <GridIcon className="h-3 w-3" />
              )}
            </Button>

            {isPubliclyShared && (
              <span title={t('checklists.publiclyShared')}>
                <Globe02Icon className="h-3 w-3 text-primary" />
              </span>
            )}
            {isShared && (
              <span
                title={`Shared with ${sharedWith.join(", ")}`}
                className="cursor-pointer hover:text-primary"
                onClick={() => setShowSharedWithModal(true)}
              >
                <UserMultipleIcon className="h-3 w-3" />
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
                    ? t('checklists.convertToSimpleChecklist')
                    : t('checklists.convertToTaskProject')
                }
              >
                {checklist.type === ChecklistsTypes.TASK ? (
                  <CheckmarkSquare04Icon className="h-4 w-4 lg:h-5 lg:w-5" />
                ) : (
                  <TaskDaily01Icon className="h-4 w-4 lg:h-5 lg:w-5" />
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
                <PencilEdit02Icon className="h-4 w-4 lg:h-5 lg:w-5" />
              </Button>
            )}
          </div>

          {(permissions?.canEdit || permissions?.canDelete) && (
            <div
              className={`${permissions?.canEdit &&
                !permissions?.canDelete &&
                !permissions?.isOwner &&
                "lg:hidden"
                }`}
            >
              <DropdownMenu
                align="right"
                trigger={
                  <Button variant="outline" size="sm" className="h-10 w-10 p-0" aria-label={t("common.moreOptions")}>
                    <MoreHorizontalIcon className="h-4 w-4" />
                  </Button>
                }
                items={[
                  ...(onConvertType && permissions?.canEdit
                    ? [
                      {
                        type: "item" as const,
                        label:
                          checklist.type === ChecklistsTypes.TASK
                            ? "Convert to Simple Checklist"
                            : "Convert to Task Project",
                        icon:
                          checklist.type === ChecklistsTypes.TASK ? (
                            <CheckmarkSquare04Icon className="h-4 w-4" />
                          ) : (
                            <TaskDaily01Icon className="h-4 w-4" />
                          ),
                        onClick: () => {
                          onConvertType();
                        },
                        className: "lg:!hidden",
                      },
                    ]
                    : []),
                  ...(onClone
                    ? [
                      {
                        type: "item" as const,
                        label: "Clone",
                        icon: <Copy02Icon className="h-4 w-4" />,
                        onClick: onClone,
                      },
                    ]
                    : []),
                  ...(onArchive && permissions?.canDelete
                    ? [
                      {
                        type: "item" as const,
                        label: t("profile.archiveTab"),
                        icon: <Archive02Icon className="h-4 w-4" />,
                        onClick: onArchive,
                      },
                    ]
                    : []),
                  ...(onShare && permissions?.isOwner
                    ? [
                      {
                        type: "item" as const,
                        label: t("sharing.share"),
                        icon: <Share08Icon className="h-4 w-4" />,
                        onClick: onShare,
                      },
                    ]
                    : []),
                  ...(onEdit && permissions?.canEdit
                    ? [
                      {
                        type: "item" as const,
                        label: t("editor.edit"),
                        icon: <PencilEdit02Icon className="h-4 w-4" />,
                        onClick: onEdit,
                        className: "lg:!hidden",
                      },
                    ]
                    : []),
                  ...(onDelete && permissions?.canDelete
                    ? [
                      {
                        type: "item" as const,
                        label: t("common.delete"),
                        icon: <Delete03Icon className="h-4 w-4" />,
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

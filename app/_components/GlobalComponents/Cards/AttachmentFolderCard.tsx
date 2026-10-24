"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowUpRight01Icon, Clock01Icon, Folder01Icon } from "hugeicons-react";
import type { AttachmentFolder } from "@/app/_types";
import { shortUuid } from "@/app/_consts/attachments";
import { formatRelativeTime } from "@/app/_utils/date-utils";
import { formatFileSize } from "@/app/_utils/file-icon-utils";
import { itemHref } from "@/app/_utils/global-utils";
import { buttonVariants } from "@/app/_components/GlobalComponents/Buttons/Button";

interface AttachmentFolderCardProps {
  folder: AttachmentFolder;
  onOpen: (folder: AttachmentFolder) => void;
  showItemLink?: boolean;
}

export const folderLabel = (folder: AttachmentFolder): string =>
  `${folder.title} - ${shortUuid(folder.itemUuid)}`;

export const AttachmentFolderCard = ({
  folder,
  onOpen,
  showItemLink = true,
}: AttachmentFolderCardProps) => {
  const t = useTranslations();
  const label = folderLabel(folder);

  return (
    <div className="jotty-attachment-folder-card bg-card border border-border rounded-jotty p-4 hover:shadow-md hover:border-primary/50 transition-all duration-200 flex flex-col h-full">
      <button
        type="button"
        onClick={() => onOpen(folder)}
        className="flex items-start gap-2 mb-3 group text-left"
      >
        <Folder01Icon className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
        <h3
          className="font-medium text-foreground flex-1 leading-snug line-clamp-2 break-all group-hover:text-primary"
          title={label}
        >
          {label}
        </h3>
      </button>

      <p className="text-sm lg:text-xs text-muted-foreground mb-1">
        {t("attachments.folderStats", {
          count: folder.count,
          size: formatFileSize(folder.size),
        })}
      </p>

      <div className="flex items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-1 text-sm lg:text-xs text-muted-foreground">
          <Clock01Icon className="h-3 w-3" />
          <span>{formatRelativeTime(folder.updatedAt, t)}</span>
        </div>
        {showItemLink && (
          <Link
            href={itemHref(folder.itemType, folder.itemUuid)}
            aria-label={t("attachments.openItem")}
            title={t("attachments.openItem")}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ArrowUpRight01Icon className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
};

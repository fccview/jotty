"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft01Icon, MultiplicationSignIcon, Search01Icon } from "hugeicons-react";
import type { FileItem } from "@/app/_types";
import { useAttachmentBrowser } from "@/app/_hooks/useAttachmentBrowser";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { FileGrid } from "@/app/_components/GlobalComponents/Layout/FileGrid";
import {
  AttachmentFolderCard,
  folderLabel,
} from "@/app/_components/GlobalComponents/Cards/AttachmentFolderCard";
import { Logo } from "@/app/_components/GlobalComponents/Layout/Logo/Logo";

type Browser = ReturnType<typeof useAttachmentBrowser>;

interface AttachmentBrowserProps {
  browser: Browser;
  onPickFile: (file: FileItem) => void;
  onDeleteFile?: (file: FileItem) => void;
  showItemLinks?: boolean;
}

export const AttachmentBrowser = ({
  browser,
  onPickFile,
  onDeleteFile,
  showItemLinks = true,
}: AttachmentBrowserProps) => {
  const t = useTranslations();
  const showingFiles = browser.searching || browser.folder !== null;

  const emptyText = browser.failed
    ? t("attachments.loadFailed")
    : browser.searching
      ? t("attachments.noneFound", { query: browser.query.trim() })
      : t("attachments.folderEmpty");

  return (
    <div className="jotty-attachment-browser space-y-4">
      <div className="relative">
        <Search01Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
        <Input
          id="searchAttachments"
          name="searchAttachments"
          type="text"
          value={browser.query}
          onChange={(e) => browser.setQuery(e.target.value)}
          placeholder={t("attachments.search")}
          className="pl-10 pr-10 !space-y-0 [&>label]:hidden"
        />
        {browser.query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => browser.setQuery("")}
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
            aria-label={t("common.clear")}
          >
            <MultiplicationSignIcon className="h-3 w-3" />
          </Button>
        )}
      </div>

      {browser.folder && !browser.searching && (
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => browser.openFolder(null)}
            className="h-8 gap-1 flex-shrink-0"
          >
            <ArrowLeft01Icon className="h-4 w-4" />
            {t("attachments.allFolders")}
          </Button>
          <span className="text-muted-foreground">/</span>
          <span
            className="text-md lg:text-sm font-medium text-foreground truncate"
            title={folderLabel(browser.folder)}
          >
            {folderLabel(browser.folder)}
          </span>
        </div>
      )}

      {showingFiles ? (
        <FileGrid
          files={browser.files}
          isLoading={browser.isLoading}
          emptyText={emptyText}
          onFileClick={onPickFile}
          onDeleteFile={onDeleteFile}
        />
      ) : browser.isLoading && browser.folders.length === 0 ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <Logo className="h-8 w-8 animate-pulse" />
        </div>
      ) : browser.folders.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {browser.folders.map((folder) => (
            <AttachmentFolderCard
              key={folder.itemUuid}
              folder={folder}
              onOpen={browser.openFolder}
              showItemLink={showItemLinks}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {browser.failed ? t("attachments.loadFailed") : t("attachments.empty.all")}
          </p>
        </div>
      )}

      {browser.hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void browser.loadMore()}
            disabled={browser.isLoading}
          >
            {browser.isLoading ? t("common.loading") : t("attachments.loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
};

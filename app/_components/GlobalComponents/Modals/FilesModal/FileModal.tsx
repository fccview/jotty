"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Modal, ModalVariant, ModalWidth } from "@/app/_components/GlobalComponents/Modals/Modal";
import { useFileManager } from "@/app/_hooks/useFileManager";
import { useAttachmentBrowser } from "@/app/_hooks/useAttachmentBrowser";
import type { FileItem } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";
import { FileUpload } from "../../FormElements/FileUpload";
import { FileTabs } from "../../Tabs/FileTabs";
import { FileGrid } from "../../Layout/FileGrid";
import { AttachmentBrowser } from "../../Attachments/AttachmentBrowser";
import { cn } from "@/app/_utils/global-utils";
import { MENU_ITEM_ACTIVE_CLASS } from "@/app/_consts/styling";
import { HugeiconsIcon } from "@hugeicons/react";
import { Attachment01Icon, Folder01Icon } from "@hugeicons/core-free-icons";
import { PanelTabs, type PanelTab } from "../../Tabs/PanelTabs";

export interface AttachTarget {
  uuid: string;
  type: ItemTypes;
}

enum ModalScopes {
  HERE = "here",
  ALL = "all",
}

interface FileModalProps {
  isOpen: boolean;
  onClose: () => void;
  target?: AttachTarget;
  onSelectFile: (
    url: string,
    type: FileItem["type"],
    fileName: string,
    mimeType: string,
  ) => void;
}

export const FileModal = ({ isOpen, onClose, target, onSelectFile }: FileModalProps) => {
  const t = useTranslations();
  const [scope, setScope] = useState<ModalScopes>(ModalScopes.HERE);
  const manager = useFileManager(target?.uuid);
  const browser = useAttachmentBrowser(isOpen && scope === ModalScopes.ALL);
  const { loadFiles } = manager;

  useEffect(() => {
    if (isOpen) loadFiles();
  }, [isOpen, loadFiles]);

  const pick = (file: FileItem) => {
    onSelectFile(file.url, file.type, file.name, file.mimeType);
    onClose();
  };

  const pickElsewhere = async (file: FileItem) => {
    if (file.itemUuid === target?.uuid) return pick(file);
    const attached = await manager.attachExisting(file);
    if (attached) pick(attached);
  };

  const scopes: PanelTab<ModalScopes>[] = [
    {
      id: ModalScopes.HERE,
      icon: Attachment01Icon,
      label: target?.type === ItemTypes.CHECKLIST ? t("attachments.thisBoard") : t("attachments.thisNote"),
    },
    { id: ModalScopes.ALL, icon: Folder01Icon, label: t("attachments.allAttachments") },
  ];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t("common.filesAndImages")}
        variant={ModalVariant.WORKSPACE}
        width={ModalWidth.XWIDE}
      >
        <div className="flex flex-col md:flex-row h-full max-h-[calc(90vh-5rem)] min-h-0">
          <nav
            aria-label={t("attachments.scopes")}
            className="hidden md:flex md:w-52 flex-none flex-col gap-1 border-r border-dashed border-border p-3"
          >
            {scopes.map(({ id, icon, label }) => (
              <button
                key={id}
                type="button"
                aria-current={scope === id ? "page" : undefined}
                onClick={() => setScope(id)}
                className={cn(
                  "flex items-center gap-2 rounded-[calc(var(--jotty-radius-effective)*0.75)] px-2.5 py-2 text-md lg:text-sm text-left transition-colors duration-150",
                  scope === id
                    ? MENU_ITEM_ACTIVE_CLASS
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <HugeiconsIcon icon={icon} className="h-4 w-4 flex-none" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </nav>

          <PanelTabs
            className="md:hidden"
            tabs={scopes}
            active={scope}
            onSelect={setScope}
            label={t("attachments.scopes")}
          />

          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            {!target ? (
              <p className="p-6 text-center text-muted-foreground">{t("attachments.saveFirst")}</p>
            ) : scope === ModalScopes.HERE ? (
              <>
                <FileTabs activeTab={manager.activeTab} setActiveTab={manager.setActiveTab} />
                <FileUpload
                  activeTab={manager.activeTab}
                  selectedFile={manager.selectedFile}
                  onFileSelect={manager.handleFileSelect}
                  onUpload={manager.handleUpload}
                  isUploading={manager.isUploading}
                  uploadError={manager.uploadError || undefined}
                  fileSizeError={manager.fileSizeError || undefined}
                />
                <div className="jotty-file-grid-container flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
                  <FileGrid
                    files={manager.filteredFiles}
                    isLoading={manager.isLoading}
                    activeTab={manager.activeTab}
                    onFileClick={pick}
                    onDeleteFile={manager.handleDeleteFile}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
                <AttachmentBrowser
                  browser={browser}
                  onPickFile={(file) => void pickElsewhere(file)}
                  showItemLinks={false}
                />
              </div>
            )}
          </div>
        </div>
      </Modal>
      {manager.deleteModal}
    </>
  );
};

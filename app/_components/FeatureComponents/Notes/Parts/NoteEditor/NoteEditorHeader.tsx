"use client";

import { ShareModal } from "@/app/_components/GlobalComponents/Modals/SharingModals/ShareModal";
import { CategoryTreeSelector } from "@/app/_components/GlobalComponents/Dropdowns/CategoryTreeSelector";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import {
  Archive02Icon,
  ArrowLeft01Icon,
  Tick02Icon,
  GridIcon,
  Globe02Icon,
  UserMultipleIcon,
  Folder02Icon,
  Orbit01Icon,
  FloppyDiskIcon,
  Share08Icon,
  Download01Icon,
  SidebarRightIcon,
  FileEditIcon,
  Delete03Icon,
  MoreHorizontalIcon,
  Copy01Icon,
  ViewIcon,
  LockKeyIcon,
  ViewOffSlashIcon,
  MessageLock02Icon,
  Cancel01Icon,
} from "hugeicons-react";
import { Note, Category } from "@/app/_types";
import { NoteEditorViewModel } from "@/app/_types";
import { useEffect, useState } from "react";
import { DropdownMenu } from "@/app/_components/GlobalComponents/Dropdowns/DropdownMenu";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { useRouter } from "next/navigation";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { toggleArchive } from "@/app/_server/actions/dashboard";
import { Modes } from "@/app/_types/enums";
import {
  copyTextToClipboard,
  encodeCategoryPath,
  buildCategoryPath,
} from "@/app/_utils/global-utils";
import { sharingInfo } from "@/app/_utils/sharing-utils";
import { usePermissions } from "@/app/_providers/PermissionsProvider";
import { SharedWithModal } from "@/app/_components/GlobalComponents/Modals/SharingModals/SharedWithModal";
import { useMetadata } from "@/app/_providers/MetadataProvider";
import { PGPEncryptionModal } from "@/app/_components/GlobalComponents/Modals/EncryptionModals/PGPEncryptionModal";
import { XChaChaEncryptionModal } from "@/app/_components/GlobalComponents/Modals/EncryptionModals/XChaChaEncryptionModal";
import { updateNote } from "@/app/_server/actions/note";
import { Logo } from "@/app/_components/GlobalComponents/Layout/Logo/Logo";
import { detectEncryptionMethod, isEncrypted, isValidXChaChaJSON } from "@/app/_utils/encryption-utils";
import { useTranslations } from "next-intl";

interface NoteEditorHeaderProps {
  note: Note;
  categories: Category[];
  isOwner: boolean;
  onBack: () => void;
  onClone?: () => void;
  showTOC: boolean;
  setShowTOC: (show: boolean) => void;
  viewModel: NoteEditorViewModel;
  onOpenDecryptModal?: React.MutableRefObject<(() => void) | null>;
  onOpenViewModal?: React.MutableRefObject<(() => void) | null>;
}

export const NoteEditorHeader = ({
  note,
  categories,
  isOwner,
  onBack,
  onClone,
  viewModel,
  showTOC,
  setShowTOC,
  onOpenDecryptModal,
  onOpenViewModal,
}: NoteEditorHeaderProps) => {
  const t = useTranslations();
  const metadata = useMetadata();
  const {
    title,
    setTitle,
    category,
    isEditing,
    status,
    handleEdit,
    handleCancel,
    handleSave,
    handleDelete,
    isPrinting,
    isEditingEncrypted,
  } = viewModel;
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSharedWithModal, setShowSharedWithModal] = useState(false);
  const [showEncryptionModal, setShowEncryptionModal] = useState(false);
  const [encryptionModalMode, setEncryptionModalMode] = useState<
    "encrypt" | "decrypt" | "view" | "edit" | "save"
  >("encrypt");
  const [hasPromptedForDecryption, setHasPromptedForDecryption] =
    useState(false);
  const [copied, setCopied] = useState(false);
  const { user } = useAppMode();
  const router = useRouter();
  const { permissions } = usePermissions();

  useEffect(() => {
    setHasPromptedForDecryption(false);
  }, [note?.id]);

  useEffect(() => {
    if (onOpenDecryptModal) {
      onOpenDecryptModal.current = () => {
        setEncryptionModalMode("decrypt");
        setShowEncryptionModal(true);
      };
    }
    if (onOpenViewModal) {
      onOpenViewModal.current = () => {
        setEncryptionModalMode("view");
        setShowEncryptionModal(true);
      };
    }
  }, [onOpenDecryptModal, onOpenViewModal]);

  useEffect(() => {
    if (
      note?.encrypted &&
      user?.encryptionSettings?.autoDecrypt &&
      !hasPromptedForDecryption &&
      !isEditing
    ) {
      setEncryptionModalMode("view");
      setShowEncryptionModal(true);
      setHasPromptedForDecryption(true);
    }
  }, [
    note?.encrypted,
    user?.encryptionSettings?.autoDecrypt,
    hasPromptedForDecryption,
    isEditing,
  ]);

  const handleArchive = async () => {
    const result = await toggleArchive(note, Modes.NOTES);
    if (result.success) {
      router.refresh();
    }
  };

  const handleCopyId = async () => {
    const success = await copyTextToClipboard(
      `${note?.uuid
        ? note?.uuid
        : `${encodeCategoryPath(note?.category || "Uncategorized")}/${note?.id
        }`
      }`
    );
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleViewDecryption = (decryptedContent: string) => {
    viewModel.handleEditorContentChange(decryptedContent, true, false);
    setShowEncryptionModal(false);
  };

  const handleEditEncrypted = (decryptedContent: string, passphrase?: string, method?: string) => {
    if (passphrase && method) {
      viewModel.handleEditEncrypted(passphrase, method, decryptedContent);
      setShowEncryptionModal(false);
    }
  };

  const handleSaveEncrypted = (decryptedContent: string, passphrase?: string, method?: string) => {
    const saveParam = method === "pgp" ? decryptedContent : passphrase;
    if (saveParam || method === "pgp") {
      handleSave(false, saveParam);
      setShowEncryptionModal(false);
    }
  };

  const handlePermanentDecryption = async (newContent: string) => {
    const formData = new FormData();
    formData.append("id", note.id);
    formData.append("title", title);
    formData.append("content", newContent);
    formData.append("category", category);
    formData.append("originalCategory", note.category || "Uncategorized");
    if (note.uuid) {
      formData.append("uuid", note.uuid);
    }

    const result = await updateNote(formData);

    if (result.success && result.data) {
      const categoryPath = buildCategoryPath(
        result.data.category || t("notes.uncategorized"),
        result.data.id
      );
      const newPath = `/note/${categoryPath}`;
      const currentPath = window.location.pathname;

      if (newPath === currentPath) {
        window.location.reload();
      } else {
        router.push(newPath);
      }
    }
  };

  const handleEncryptionSuccess = async (newContent: string) => {
    const formData = new FormData();
    formData.append("id", note.id);
    formData.append("title", title);
    formData.append("content", newContent);
    formData.append("category", category);
    formData.append("originalCategory", note.category || "Uncategorized");
    if (note.uuid) {
      formData.append("uuid", note.uuid);
    }

    const result = await updateNote(formData);

    if (result.success && result.data) {
      const categoryPath = buildCategoryPath(
        result.data.category || t("notes.uncategorized"),
        result.data.id
      );
      const newPath = `/note/${categoryPath}`;
      const currentPath = window.location.pathname;

      if (newPath === currentPath) {
        window.location.reload();
      } else {
        router.push(newPath);
      }
    }
  };

  const { globalSharing } = useAppMode();
  const encodedCategory = encodeCategoryPath(metadata.category);
  const itemDetails = sharingInfo(globalSharing, metadata.uuid || metadata.id, encodedCategory);
  const isShared = itemDetails.exists && itemDetails.sharedWith.length > 0;
  const sharedWith = itemDetails.sharedWith;
  const isPubliclyShared = itemDetails.isPublic;

  const canDelete = permissions?.canDelete;

  const isContentStillEncrypted = isEncrypted(viewModel.editorContent || "");
  const isInViewMode = note?.encrypted && !isContentStillEncrypted;

  return (
    <>
      <div
        className={`bg-background border-b border-border px-4 ${isEditing ? "py-[11px]" : "py-3"
          } sticky top-0 z-20 no-print`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0 transition-all duration-100">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-8 w-8 flex-shrink-0"
            >
              <ArrowLeft01Icon className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <Input
                  id="noteTitle"
                  name="noteTitle"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("checklists.noteTitle")}
                  className="!space-y-0 [&>label]:hidden [&>input]:text-xl [&>input]:font-bold [&>input]:bg-transparent [&>input]:border-none [&>input]:p-0 [&>input]:focus:ring-0"
                />
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold truncate">{title}</h1>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        handleCopyId();
                      }}
                      className="h-6 w-6 p-0"
                      title={`Copy ID: ${note?.uuid
                        ? note?.uuid
                        : `${encodeCategoryPath(
                          note?.category || t("notes.uncategorized")
                        )}/${note?.id}`
                        }`}
                    >
                      {copied ? (
                        <Tick02Icon className="h-3 w-3 text-green-500" />
                      ) : (
                        <GridIcon className="h-3 w-3" />
                      )}
                    </Button>

                    {note?.encrypted && (
                      <LockKeyIcon className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                    {isPubliclyShared && (
                      <span title={t("notes.publiclySharedNote")}>
                        <Globe02Icon className="h-4 w-4 text-primary" />
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
                  {category && category !== t("notes.uncategorized") && (
                    <div className="flex items-center gap-1.5 mt-1 text-md lg:text-sm text-muted-foreground">
                      <Folder02Icon className="h-3 w-3" />
                      <span>{category}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isEditing ? (
              <>
                {isOwner && (
                  <div className="lg:w-[400px]">
                    <CategoryTreeSelector
                      categories={categories}
                      selectedCategory={category}
                      onCategorySelect={viewModel.setCategory}
                      placeholder={t('common.selectCategory')}
                      className="note-mobile-category-tree"
                    />
                  </div>
                )}

                <Button variant="outline" className="hidden lg:flex" size="sm" onClick={handleCancel}>{t('common.cancel')}</Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (isEditingEncrypted) {
                      setEncryptionModalMode("save");
                      setShowEncryptionModal(true);
                    } else {
                      handleSave();
                    }
                  }}
                  className="hidden lg:flex"
                  disabled={status.isSaving || status.isAutoSaving}
                >
                  {status.isSaving ? (
                    <>
                      <Logo
                        className="h-4 w-4 bg-background mr-2 animate-pulse"
                        pathClassName="fill-primary"
                      />
                      <span>{t('common.saving')}</span>
                    </>
                  ) : (
                    <>
                      <FloppyDiskIcon className="h-4 w-4 mr-2" />
                      <span>{t('common.save')}</span>
                    </>
                  )}
                </Button>

                <div className={`fixed bottom-[20px] ${user?.handedness === "left-handed" ? "left-[2.5%]" : "right-[2.5%]"} lg:hidden z-50 flex flex-col gap-1 bg-background border border-border rounded-jotty p-1`}>
                  <Button variant="outline" size="icon" onClick={handleCancel}>
                    <Cancel01Icon className="h-5 w-5" />
                  </Button>
                  
                  <Button
                    size="icon"
                    onClick={() => {
                      if (isEditingEncrypted) {
                        setEncryptionModalMode("save");
                        setShowEncryptionModal(true);
                      } else {
                        handleSave();
                      }
                    }}
                    className="h-10 w-10"
                    disabled={status.isSaving || status.isAutoSaving}
                    title={status.isSaving ? t('common.saving') : t('common.save')}
                  >
                    {status.isSaving ? (
                      <Logo
                        className="h-5 w-5 bg-background animate-pulse"
                        pathClassName="fill-primary-foreground"
                      />
                    ) : (
                      <FloppyDiskIcon className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  {user?.notesDefaultMode === "edit" &&
                    permissions?.canEdit &&
                    !note?.encrypted && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleSave()}
                        title={t("notes.quickSave")}
                        className="text-primary hover:text-primary/80"
                      >
                        {status.isSaving ? (
                          <>
                            <Logo
                              className="h-5 w-5 bg-background mr-2 animate-pulse"
                              pathClassName="fill-primary"
                            />
                          </>
                        ) : (
                          <>
                            <FloppyDiskIcon className="h-5 w-5" />
                          </>
                        )}
                      </Button>
                    )}

                  {permissions?.canEdit && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (note?.encrypted) {
                          setEncryptionModalMode("edit");
                          setShowEncryptionModal(true);
                        } else {
                          handleEdit();
                        }
                      }}
                      title={note?.encrypted ? t('encryption.editEncrypted') : t('common.edit')}
                    >
                      {note?.encrypted ? (
                        <MessageLock02Icon className="h-5 w-5" />
                      ) : (
                        <FileEditIcon className="h-5 w-5" />
                      )}
                    </Button>
                  )}
                  <DropdownMenu
                    align="right"
                    trigger={
                      <Button variant="outline" size="icon">
                        <MoreHorizontalIcon className="h-5 w-5" />
                      </Button>
                    }
                    items={[
                      ...(permissions?.isOwner
                        ? [
                          {
                            type: "item" as const,
                            label: t("sharing.share"),
                            icon: <Share08Icon className="h-4 w-4" />,
                            onClick: () => setShowShareModal(true),
                          },
                        ]
                        : []),
                      ...(onClone
                        ? [
                          {
                            type: "item" as const,
                            label: "Clone",
                            icon: <Copy01Icon className="h-4 w-4" />,
                            onClick: onClone,
                          },
                        ]
                        : []),
                      ...(note?.encrypted
                        ? [
                          {
                            type: "item" as const,
                            label: !isInViewMode ? t("settings.view") : "Hide",
                            icon: !isInViewMode ? <ViewIcon className="h-4 w-4" /> : <ViewOffSlashIcon className="h-4 w-4" />,
                            onClick: () => {
                              if (!isInViewMode) {
                                setEncryptionModalMode("view");
                                setShowEncryptionModal(true);
                              } else {
                                window.location.reload();
                              }
                            },
                          },
                          ...(!isInViewMode && permissions?.canEdit ? [{
                            type: "item" as const,
                            label: t("encryption.decrypt"),
                            icon: <LockKeyIcon className="h-4 w-4" />,
                            onClick: () => {
                              setEncryptionModalMode("decrypt");
                              setShowEncryptionModal(true);
                            },
                          }] : []),
                        ]
                        : [
                          ...(permissions?.canEdit ? [{
                            type: "item" as const,
                            label: t("encryption.encryptNote"),
                            icon: <LockKeyIcon className="h-4 w-4" />,
                            onClick: () => {
                              setEncryptionModalMode("encrypt");
                              setShowEncryptionModal(true);
                            },
                          }] : []),
                        ]),
                      {
                        type: "item" as const,
                        label: "Print / Save as PDF",
                        icon: isPrinting ? (
                          <Orbit01Icon className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download01Icon className="h-4 w-4" />
                        ),
                        onClick: viewModel.handlePrint,
                      },
                      {
                        type: "item" as const,
                        label: "Table of Contents",
                        icon: <SidebarRightIcon className="h-4 w-4" />,
                        onClick: () => setShowTOC(!showTOC),
                        className: "hidden lg:flex",
                      },
                      ...(permissions?.canDelete
                        ? [
                          {
                            type: "item" as const,
                            label: t("profile.archiveTab"),
                            icon: <Archive02Icon className="h-4 w-4" />,
                            onClick: handleArchive,
                          },
                        ]
                        : []),
                      ...(canDelete
                        ? [
                          {
                            type: "item" as const,
                            label: t("common.delete"),
                            icon: <Delete03Icon className="h-4 w-4" />,
                            onClick: handleDelete,
                            variant: "destructive" as const,
                          },
                        ]
                        : []),
                    ]}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            router.refresh();
          }}
        />
      )}

      <SharedWithModal
        usernames={itemDetails.sharedWith}
        isOpen={showSharedWithModal}
        onClose={() => setShowSharedWithModal(false)}
      />

      {(() => {
        const currentMethod = detectEncryptionMethod(note?.content || "");
        const preferredMethod = user?.encryptionSettings?.method || "xchacha";
        const methodToUse = encryptionModalMode === "encrypt" ? preferredMethod : currentMethod;

        return methodToUse === "pgp" ? (
          <PGPEncryptionModal
            isOpen={showEncryptionModal}
            onClose={() => setShowEncryptionModal(false)}
            mode={encryptionModalMode}
            noteContent={
              encryptionModalMode === "view" || encryptionModalMode === "edit" || encryptionModalMode === "save"
                ? note.content
                : viewModel.editorContent
            }
            onSuccess={
              encryptionModalMode === "view"
                ? handleViewDecryption
                : encryptionModalMode === "edit"
                  ? handleEditEncrypted
                  : encryptionModalMode === "save"
                    ? handleSaveEncrypted
                    : encryptionModalMode === "decrypt"
                      ? handlePermanentDecryption
                      : handleEncryptionSuccess
            }
          />
        ) : (
          <XChaChaEncryptionModal
            isOpen={showEncryptionModal}
            onClose={() => setShowEncryptionModal(false)}
            mode={encryptionModalMode}
            noteContent={
              encryptionModalMode === "view" || encryptionModalMode === "edit" || encryptionModalMode === "save"
                ? note.content
                : viewModel.editorContent
            }
            onSuccess={
              encryptionModalMode === "view"
                ? handleViewDecryption
                : encryptionModalMode === "edit"
                  ? handleEditEncrypted
                  : encryptionModalMode === "save"
                    ? handleSaveEncrypted
                    : encryptionModalMode === "decrypt"
                      ? handlePermanentDecryption
                      : handleEncryptionSuccess
            }
          />
        );
      })()}
    </>
  );
};

"use client";

import { Modal } from "../Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { Toggle } from "@/app/_components/GlobalComponents/FormElements/Toggle";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { useFolderShare } from "@/app/_hooks/useFolderShare";
import { Modes } from "@/app/_types/enums";
import { Search01Icon, Alert02Icon } from "hugeicons-react";
import { useTranslations } from "next-intl";

interface FolderShareModalProps {
  isOpen: boolean;
  mode: Modes;
  categoryPath: string;
  onClose: () => void;
}

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
    isPublic,
    searchQuery,
    setSearchQuery,
    filteredUsers,
    toggleUser,
    setPerms,
    togglePublic,
  } = useFolderShare({ isOpen, mode, categoryPath });

  if (!isOpen) return null;

  return (
    <Modal isOpen={true} onClose={onClose} title={t("sharing.shareFolder")}>
      <div className="space-y-4 py-6">
        <h3 className="font-semibold text-lg">{categoryPath}</h3>
        <p className="text-sm text-muted-foreground">
          {t("sharing.folderShareHint")}
        </p>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="relative">
          <Search01Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            id="searchFolderUsers"
            name="searchFolderUsers"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("sharing.searchUsers")}
            className="pl-10"
          />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-2">
          {filteredUsers.map((entry) => {
            const username = entry.username || "";
            const granted = grants[username];

            return (
              <div
                key={username}
                className="flex items-center justify-between gap-3 rounded-jotty border border-border p-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <UserAvatar username={username} avatarUrl={entry.avatarUrl} />
                  <span className="truncate text-sm">{username}</span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {granted && (
                    <>
                      <label className="flex items-center gap-1 text-xs text-muted-foreground">
                        {t("sharing.canEdit")}
                        <Toggle
                          size="sm"
                          checked={granted.canEdit === true}
                          onCheckedChange={(value) =>
                            setPerms(username, "canEdit", value)
                          }
                          disabled={isLoading}
                        />
                      </label>
                      <label className="flex items-center gap-1 text-xs text-muted-foreground">
                        {t("sharing.canDelete")}
                        <Toggle
                          size="sm"
                          checked={granted.canDelete === true}
                          onCheckedChange={(value) =>
                            setPerms(username, "canDelete", value)
                          }
                          disabled={isLoading}
                        />
                      </label>
                    </>
                  )}
                  <Button
                    variant={granted ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => toggleUser(username)}
                    disabled={isLoading}
                  >
                    {granted ? t("sharing.removeAccess") : t("sharing.share")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-jotty border border-border p-3 space-y-2">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium">{t("sharing.publicAccess")}</p>
            <Toggle
              checked={isPublic}
              onCheckedChange={togglePublic}
              disabled={isLoading}
            />
          </div>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Alert02Icon className="h-4 w-4 shrink-0 mt-0.5" />
            {t("sharing.publicFolderWarning")}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 p-6 border-t border-border bg-muted/20">
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          {t("common.close")}
        </Button>
      </div>
    </Modal>
  );
};

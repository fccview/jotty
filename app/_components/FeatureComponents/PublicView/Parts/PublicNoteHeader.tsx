"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Clock01Icon, SidebarRightIcon } from "hugeicons-react";
import { Note } from "@/app/_types";
import { PublicUser } from "@/app/_utils/user-sanitize-utils";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";

interface PublicNoteHeaderProps {
  note: Note;
  user: PublicUser | null;
  showPanel: boolean;
  onTogglePanel: () => void;
  onOpenSheet: () => void;
}

export const PublicNoteHeader = ({
  note,
  user,
  showPanel,
  onTogglePanel,
  onOpenSheet,
}: PublicNoteHeaderProps) => {
  const t = useTranslations();
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (user?.avatarUrl) setAvatarUrl(window.location.origin + user.avatarUrl);
  }, [user?.avatarUrl]);

  const panelLabel = showPanel ? t("notePanel.hide") : t("notePanel.show");

  return (
    <header className="mb-8 no-print flex items-start gap-3">
      <UserAvatar size="lg" username={user?.username || ""} avatarUrl={avatarUrl} />
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{note.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-md lg:text-sm text-muted-foreground mt-2">
          <span>{t("common.by", { owner: user?.username ?? "" })}</span>
          {note.category && <span>• {note.category}</span>}
          <span className="flex items-center gap-1">
            <Clock01Icon className="h-4 w-4" />
            {t("notes.updatedOn", { date: new Date(note.updatedAt).toLocaleDateString() })}
          </span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onTogglePanel}
        title={panelLabel}
        aria-label={panelLabel}
        aria-pressed={showPanel}
        className="hidden lg:inline-flex flex-none"
      >
        <SidebarRightIcon className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenSheet}
        title={t("notePanel.show")}
        aria-label={t("notePanel.show")}
        className="lg:hidden flex-none"
      >
        <SidebarRightIcon className="h-5 w-5" />
      </Button>
    </header>
  );
};

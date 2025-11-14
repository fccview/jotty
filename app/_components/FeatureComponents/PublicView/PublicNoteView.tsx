"use client";

import { Note, User } from "@/app/_types";
import { Clock } from "lucide-react";
import { UnifiedMarkdownRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

interface PublicNoteViewProps {
  note: Note;
  user: User | null;
}

export const PublicNoteView = ({ note, user }: PublicNoteViewProps) => {
  const t = useTranslations();
  const [avatarUrl, setAvatarUrl] = useState("");

  const searchParams = useSearchParams();
  const isPrintView = searchParams.get("view_mode") === "print";

  useEffect(() => {
    if (typeof window !== "undefined" && user?.avatarUrl) {
      setAvatarUrl(window.location.origin + user.avatarUrl);
    }
  }, [user?.avatarUrl]);

  const containerClass = isPrintView
    ? "bg-background"
    : "min-h-screen bg-background";

  const mainContainerClass = isPrintView
    ? ""
    : "container mx-auto px-4 py-8 max-w-6xl";

  const cardClass = isPrintView
    ? ""
    : "bg-card border border-border rounded-lg p-6";

  return (
    <div className={containerClass}>
      <div className={mainContainerClass}>
        <div className="mb-8 no-print">
          <div className="flex items-center gap-3 mb-4">
            <UserAvatar
              size="lg"
              username={user?.username || ""}
              avatarUrl={avatarUrl}
            />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {note.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
                <div className="flex items-center gap-1">
                  <span>{t("public.by", { username: user?.username || "" })}</span>
                </div>
                {note.category && <span>• {note.category}</span>}
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>
                    {t("public.updated", { date: new Date(note.updatedAt).toLocaleDateString() })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <UnifiedMarkdownRenderer content={note.content} />
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center no-print">
          <p className="text-sm text-muted-foreground">
            {t("public.note_shared_by", { owner: note.owner || "" })}
          </p>
        </div>
      </div>
    </div>
  );
};

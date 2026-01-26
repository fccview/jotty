"use client";

import { Note } from "@/app/_types";
import { Clock01Icon, ViewIcon, LockKeyIcon } from "hugeicons-react";
import { UnifiedMarkdownRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";
import { PrintView } from "@/app/_components/FeatureComponents/Notes/Parts/PrintView";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ReadingProgressBar } from "../../GlobalComponents/Layout/ReadingProgressBar";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { PGPEncryptionModal } from "@/app/_components/GlobalComponents/Modals/EncryptionModals/PGPEncryptionModal";
import { XChaChaEncryptionModal } from "@/app/_components/GlobalComponents/Modals/EncryptionModals/XChaChaEncryptionModal";
import { detectEncryptionMethod } from "@/app/_utils/encryption-utils";
import { useTranslations } from "next-intl";
import { PublicUser } from "@/app/_utils/user-sanitize-utils";

interface PublicNoteViewProps {
  note: Note;
  user: PublicUser | null;
}

export const PublicNoteView = ({ note, user }: PublicNoteViewProps) => {
  const t = useTranslations();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [showEncryptionModal, setShowEncryptionModal] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const isPrintView = searchParams.get("view_mode") === "print";

  useEffect(() => {
    if (typeof window !== "undefined" && user?.avatarUrl) {
      setAvatarUrl(window.location.origin + user.avatarUrl);
    }
  }, [user?.avatarUrl]);

  if (isPrintView) {
    return <PrintView note={note} />;
  }

  const containerClass = "min-h-screen bg-background relative";
  const mainContainerClass = "container mx-auto px-4 py-8 max-w-6xl";
  const cardClass = "bg-card border border-border rounded-jotty p-6";

  return (
    <div className={containerClass}>
      <div className={mainContainerClass}>
        <ReadingProgressBar fixed />
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
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-md lg:text-sm text-muted-foreground mt-2">
                <div className="flex items-center gap-1">
                  <span>by {user?.username}</span>
                </div>
                {note.category && <span>• {note.category}</span>}
                <div className="flex items-center gap-1">
                  <Clock01Icon className="h-4 w-4" />
                  <span>
                    Updated {new Date(note.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={cardClass}>
          {note.encrypted && !decryptedContent ? (
            <div className="text-center space-y-4 max-w-md mx-auto px-6 py-12">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <LockKeyIcon className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">{t("encryption.thisNoteIsEncrypted")}</h3>
              <p className="text-md lg:text-sm text-muted-foreground">
                This note is protected with {detectEncryptionMethod(note.content) === "pgp" ? "PGP" : "XChaCha20-Poly1305"} encryption.
              </p>
              <div className="flex items-center justify-center gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowEncryptionModal(true)}
                  className="flex items-center gap-2"
                >
                  <ViewIcon className="h-4 w-4" />{t('settings.view')}</Button>
              </div>
            </div>
          ) : (
            <UnifiedMarkdownRenderer
              content={decryptedContent || note.content}
            />
          )}
        </div>

        {note.encrypted && (() => {
          const method = detectEncryptionMethod(note.content);
          return method === "pgp" ? (
            <PGPEncryptionModal
              isOpen={showEncryptionModal}
              onClose={() => setShowEncryptionModal(false)}
              mode="view"
              noteContent={note.content}
              onSuccess={(content) => {
                setDecryptedContent(content);
                setShowEncryptionModal(false);
              }}
            />
          ) : (
            <XChaChaEncryptionModal
              isOpen={showEncryptionModal}
              onClose={() => setShowEncryptionModal(false)}
              mode="view"
              noteContent={note.content}
              onSuccess={(content) => {
                setDecryptedContent(content);
                setShowEncryptionModal(false);
              }}
            />
          );
        })()}

        <div className="mt-12 pt-8 border-t border-border text-center no-print">
          <p className="text-md lg:text-sm text-muted-foreground">
            This note is shared publicly by {note.owner}
          </p>
        </div>
      </div>
    </div>
  );
};

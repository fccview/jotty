"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LockKeyIcon, ViewIcon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { PGPEncryptionModal } from "@/app/_components/GlobalComponents/Modals/EncryptionModals/PGPEncryptionModal";
import { XChaChaEncryptionModal } from "@/app/_components/GlobalComponents/Modals/EncryptionModals/XChaChaEncryptionModal";
import { detectEncryptionMethod } from "@/app/_utils/encryption-utils";
import type { EncryptionMethod } from "@/app/_types";

const FALLBACK_METHOD: EncryptionMethod = "xchacha";
const METHOD_NAMES: Record<EncryptionMethod, string> = { pgp: "PGP", xchacha: "XChaCha20-Poly1305" };
const METHOD_MODALS: Record<EncryptionMethod, typeof PGPEncryptionModal> = {
  pgp: PGPEncryptionModal,
  xchacha: XChaChaEncryptionModal,
};

interface PublicEncryptedNoteProps {
  content: string;
  onDecrypted: (content: string) => void;
}

export const PublicEncryptedNote = ({ content, onDecrypted }: PublicEncryptedNoteProps) => {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const method = detectEncryptionMethod(content) ?? FALLBACK_METHOD;
  const EncryptionModal = METHOD_MODALS[method];

  return (
    <div className="text-center space-y-4 max-w-md mx-auto px-6 py-12">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <LockKeyIcon className="h-8 w-8 text-primary" />
        </div>
      </div>
      <h3 className="text-xl font-semibold">{t("encryption.thisNoteIsEncrypted")}</h3>
      <p className="text-md lg:text-sm text-muted-foreground">
        {t("encryption.noteProtectedWith", { type: METHOD_NAMES[method] })}
      </p>
      <div className="flex items-center justify-center gap-3 pt-4">
        <Button variant="outline" onClick={() => setIsOpen(true)} className="flex items-center gap-2">
          <ViewIcon className="h-4 w-4" />
          {t("settings.view")}
        </Button>
      </div>
      <EncryptionModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        mode="view"
        noteContent={content}
        onSuccess={(decrypted) => {
          onDecrypted(decrypted);
          setIsOpen(false);
        }}
      />
    </div>
  );
};

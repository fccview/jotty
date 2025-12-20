"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Modal } from "../Modal";
import { InfoBox } from "@/app/_components/GlobalComponents/Cards/InfoBox";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import {
  encryptXChaCha,
  decryptXChaCha,
} from "@/app/_server/actions/xchacha";
import { useToast } from "@/app/_providers/ToastProvider";
import { useTranslations } from "next-intl";

interface XChaChaEncryptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "encrypt" | "decrypt" | "view";
  noteContent: string;
  onSuccess: (content: string) => void;
}

export const XChaChaEncryptionModal = ({
  isOpen,
  onClose,
  mode,
  noteContent,
  onSuccess,
}: XChaChaEncryptionModalProps) => {
  const t = useTranslations();
  const { showToast } = useToast();
  const [passphrase, setPassphrase] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const passphraseRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      passphraseRef.current?.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passphrase.trim()) {
      showToast({
        type: "error",
        title: "Error",
        message: "Passphrase is required",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();

      if (mode === "encrypt") {
        formData.append("content", noteContent);
        formData.append("passphrase", passphrase);

        const result = await encryptXChaCha(formData);

        if (result.success && result.data) {
          showToast({
            type: "success",
            title: "Success",
            message: "Note encrypted successfully",
          });
          onSuccess(result.data.encryptedContent);
          handleClose();
        } else {
          showToast({
            type: "error",
            title: "Error",
            message: result.error || "Failed to encrypt note",
          });
        }
      } else {
        formData.append("encryptedContent", noteContent);
        formData.append("passphrase", passphrase);

        const result = await decryptXChaCha(formData);

        if (result.success && result.data) {
          showToast({
            type: "success",
            title: "Success",
            message: "Note decrypted successfully",
          });
          onSuccess(result.data.decryptedContent);
          handleClose();
        } else {
          showToast({
            type: "error",
            title: "Error",
            message: result.error || "Failed to decrypt note",
          });
        }
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        message: "An unexpected error occurred",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setPassphrase("");
    onClose();
  };

  const isEncrypt = mode === "encrypt";
  const isView = mode === "view";
  const actionLabel = isEncrypt ? "Encrypt" : isView ? "View" : "Decrypt";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`${actionLabel} Note`}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <InfoBox
          variant="info"
          title={
            isEncrypt
              ? "Encrypting Note"
              : isView
              ? "View Decrypted Content"
              : "Decrypting Note"
          }
          items={
            isEncrypt
              ? [
                  "Note content will be encrypted with XChaCha20-Poly1305",
                  "Only someone with the passphrase can decrypt it",
                  "Note title/frontmatter will remain unencrypted",
                  "Your passphrase will NEVER be stored on the server",
                ]
              : isView
              ? [
                  "Note content will be decrypted for viewing only",
                  "Note will remain encrypted on the server",
                  "You cannot edit encrypted notes",
                ]
              : [
                  "This will decrypt the note content",
                  "Note content will be restored as unencrypted",
                  "You will be able to edit the note content after decryption",
                ]
          }
        />

        <Input
          ref={passphraseRef}
          id="passphrase"
          type="password"
          label="Passphrase"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="Enter your passphrase"
          disabled={isProcessing}
          required
        />

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
          >{t('common.cancel')}</Button>
          <Button type="submit" disabled={isProcessing}>
            {isProcessing ? `${actionLabel}ing...` : actionLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

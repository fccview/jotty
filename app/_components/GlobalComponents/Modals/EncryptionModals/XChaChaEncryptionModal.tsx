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
import { logAudit } from "@/app/_server/actions/log";
import { useToast } from "@/app/_providers/ToastProvider";
import { useTranslations } from "next-intl";

interface XChaChaEncryptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "encrypt" | "decrypt" | "view" | "edit" | "save";
  noteContent: string;
  onSuccess: (content: string, passphrase?: string, method?: string) => void;
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
        title: t("common.error"),
        message: t("encryption.passphraseRequired"),
      });
      return;
    }

    setIsProcessing(true);
    try {
      if (mode === "save") {
        const validateFormData = new FormData();
        validateFormData.append("encryptedContent", noteContent);
        validateFormData.append("passphrase", passphrase);

        const validateResult = await decryptXChaCha(validateFormData);

        if (!validateResult.success) {
          await logAudit({
            level: "WARNING",
            action: "note_saved_encrypted",
            category: "encryption",
            success: false,
            errorMessage: t("encryption.incorrectPassphraseForXChaChaSave")
          });
          showToast({
            type: "error",
            title: t("common.error"),
            message: t("encryption.incorrectPassphrase"),
          });
          setIsProcessing(false);
          return;
        }

        onSuccess("", passphrase, "xchacha");
        handleClose();
        setIsProcessing(false);
        return;
      }

      const formData = new FormData();

      if (mode === "encrypt") {
        formData.append("content", noteContent);
        formData.append("passphrase", passphrase);

        const result = await encryptXChaCha(formData);

        if (result.success && result.data) {
          showToast({
            type: "success",
            title: t("common.success"),
            message: t("encryption.noteEncryptedSuccessfully"),
          });
          onSuccess(result.data.encryptedContent);
          handleClose();
        } else {
          showToast({
            type: "error",
            title: t("common.error"),
            message: result.error || t("encryption.failedToEncryptNote"),
          });
        }
      } else {
        formData.append("encryptedContent", noteContent);
        formData.append("passphrase", passphrase);

        const result = await decryptXChaCha(formData);

        if (result.success && result.data) {
          showToast({
            type: "success",
            title: t("common.success"),
            message: t("encryption.noteDecryptedSuccessfully"),
          });
          onSuccess(result.data.decryptedContent, passphrase, "xchacha");
          handleClose();
        } else {
          showToast({
            type: "error",
            title: t("common.error"),
            message: result.error || t("encryption.failedToDecryptNote"),
          });
        }
      }
    } catch (error) {
      showToast({
        type: "error",
        title: t("common.error"),
        message: t("encryption.unexpectedError"),
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
  const isEdit = mode === "edit";
  const isSave = mode === "save";
  const actionLabel = isEncrypt ? t("encryption.encrypt") : isView ? t("common.view") : isEdit ? t("encryption.editingEncryptedNote") : isSave ? t("common.save") : t("encryption.decrypt");
  const modalTitle = isEncrypt ? t("encryption.encryptNote") : isView ? t("encryption.viewNote") : isEdit ? t("encryption.editNote") : isSave ? t("encryption.saveEncryptedNote") : t("encryption.decryptNote");

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <InfoBox
          variant="info"
          title={
            isEncrypt
              ? t("encryption.encryptingNote")
              : isView
                ? t("encryption.viewDecryptedContent")
                : isEdit
                  ? t("encryption.editingEncryptedNote")
                  : isSave
                    ? t("encryption.saveEncryptedNote")
                    : t("encryption.decryptingNote")
          }
          items={
            isEncrypt
              ? [
                t("encryption.noteContentWillBeEncrypted"),
                t("encryption.onlySomeoneWithPassphraseCanDecrypt"),
                t("encryption.noteTitleWillRemainUnencrypted"),
                t("encryption.passphraseNeverStoredOnServer"),
              ]
              : isView
                ? [
                  t("encryption.noteWillBeDecryptedForViewing"),
                  t("encryption.noteWillStayEncrypted"),
                  t("encryption.cannotEditEncryptedNotes"),
                ]
                : isEdit
                  ? [
                    t("encryption.enterPassphraseToEdit"),
                    t("encryption.noteWillStayEncrypted"),
                    t("encryption.autoSaveDisabledForEncrypted"),
                  ]
                  : isSave
                    ? [
                      t("encryption.enterPassphraseToSave"),
                      t("encryption.noteWillBeEncryptedBeforeSaving"),
                      t("encryption.noteWillStayEncrypted"),
                    ]
                    : [
                      t("encryption.thisWillDecryptNote"),
                      t("encryption.noteWillBeRestoredAsUnencrypted"),
                      t("encryption.youWillBeAbleToEditAfterDecryption"),
                    ]
          }
        />

        <Input
          ref={passphraseRef}
          id="passphrase"
          type="password"
          label={t("encryption.passphrase")}
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder={t("encryption.enterYourPassphrase")}
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

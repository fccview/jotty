"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Modal } from "../Modal";
import { InfoBox } from "@/app/_components/GlobalComponents/Cards/InfoBox";
import { Toggle } from "@/app/_components/GlobalComponents/FormElements/Toggle";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { Textarea } from "@/app/_components/GlobalComponents/FormElements/Textarea";
import {
  encryptNoteContent,
  decryptNoteContent,
  getStoredKeys,
} from "@/app/_server/actions/pgp";
import { useToast } from "@/app/_providers/ToastProvider";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface PGPEncryptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "encrypt" | "decrypt" | "view" | "edit" | "save";
  noteContent: string;
  onSuccess: (content: string, passphrase?: string, method?: string) => void;
}

export const PGPEncryptionModal = ({
  isOpen,
  onClose,
  mode,
  noteContent,
  onSuccess,
}: PGPEncryptionModalProps) => {
  const t = useTranslations();
  const { showToast } = useToast();
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [customKey, setCustomKey] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [signNote, setSignNote] = useState(false);
  const [useStoredSigningKey, setUseStoredSigningKey] = useState(true);
  const [signingKey, setSigningKey] = useState("");
  const [signingPassphrase, setSigningPassphrase] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasStoredKeys, setHasStoredKeys] = useState(false);
  const passphraseRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      passphraseRef.current?.focus();
      if (mode === "encrypt") {
        checkStoredKeys();
      }
    }
  }, [isOpen, mode]);

  const checkStoredKeys = async () => {
    try {
      const result = await getStoredKeys();
      if (result.success && result.data) {
        const hasKeys = result.data.hasKeys || false;
        setHasStoredKeys(hasKeys);
        if (!hasKeys) {
          setUseCustomKey(true);
          setUseStoredSigningKey(false);
        }
      }
    } catch (error) {
      console.error("Error checking stored keys:", error);
      setHasStoredKeys(false);
      setUseCustomKey(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "encrypt" && !hasStoredKeys && !customKey.trim()) {
      showToast({
        type: "error",
        title: t("common.error"),
        message: t("encryption.publicKeyRequired"),
      });
      return;
    }

    if (useCustomKey && !customKey.trim()) {
      showToast({
        type: "error",
        title: t("common.error"),
        message: t("encryption.keyRequired", { keyType: mode === "encrypt" ? t("encryption.publicKey") : t("encryption.privateKey") }),
      });
      return;
    }

    if ((mode === "encrypt" || mode === "save") && signNote) {
      if (!useStoredSigningKey && !signingKey.trim()) {
        showToast({
          type: "error",
          title: t("common.error"),
          message: t("encryption.privateKeyRequiredForSigning"),
        });
        return;
      }
      if (!signingPassphrase.trim()) {
        showToast({
          type: "error",
          title: t("common.error"),
          message: t("encryption.passphraseRequiredForSigning"),
        });
        return;
      }
    }

    if ((mode === "decrypt" || mode === "view" || mode === "edit") && !passphrase.trim()) {
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
        const saveData = signNote
          ? JSON.stringify({
            signNote: true,
            signingPassphrase,
            useStoredSigningKey
          })
          : "";
        onSuccess(saveData, "", "pgp");
        handleClose();
        setIsProcessing(false);
        return;
      }

      const formData = new FormData();

      if (mode === "encrypt") {
        formData.append("content", noteContent);
        formData.append("useStoredKey", (!useCustomKey).toString());
        if (useCustomKey) {
          formData.append("publicKey", customKey.trim());
        }

        formData.append("signNote", signNote.toString());
        if (signNote) {
          formData.append("useStoredSigningKey", useStoredSigningKey.toString());
          if (!useStoredSigningKey) {
            formData.append("signingKey", signingKey.trim());
          }
          formData.append("signingPassphrase", signingPassphrase);
        }

        const result = await encryptNoteContent(formData);

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
        formData.append("useStoredKey", (!useCustomKey).toString());
        if (useCustomKey) {
          formData.append("privateKey", customKey.trim());
        }

        const result = await decryptNoteContent(formData);

        if (result.success && result.data) {
          let message = t("encryption.noteDecryptedSuccessfully");
          let type: "success" | "info" = "success";
          let title = t("common.success");

          if (result.data.signature) {
            if (result.data.signature.valid) {
              message += ". " + t("encryption.signatureVerified");
              title = t("encryption.decryptedAndVerified");
            } else {
              message += ". " + t("encryption.signatureInvalid");
              type = "info";
              title = t("encryption.decryptedWithWarning");
            }
          }

          showToast({
            type,
            title,
            message,
          });
          onSuccess(result.data.decryptedContent, passphrase, "pgp");
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
    setUseCustomKey(false);
    setCustomKey("");
    setPassphrase("");
    setSignNote(false);
    setUseStoredSigningKey(true);
    setSigningKey("");
    setSigningPassphrase("");
    onClose();
  };

  const isEncrypt = mode === "encrypt";
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isSave = mode === "save";
  const keyLabel = isEncrypt ? t("encryption.publicKey") : t("encryption.privateKey");
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
                t("encryption.noteContentWillBeEncryptedWithPGP"),
                t("encryption.onlySomeoneWithPrivateKeyCanDecrypt"),
                t("encryption.noteTitleWillRemainUnencrypted"),
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

        {isEncrypt && !hasStoredKeys && (
          <InfoBox
            variant="warning"
            title={t("encryption.noStoredKeysFound")}
            items={[
              t("encryption.noEncryptionKeysConfigured"),
              t("encryption.pastePublicKeyBelow"),
              t("encryption.generateOrImportKeysInProfile"),
              t("encryption.passphraseNeverStoredOnServer"),
            ]}
          />
        )}

        {hasStoredKeys && (
          <div className="flex items-center justify-between gap-4">
            <label
              htmlFor="useCustomKey"
              className="flex-1 cursor-pointer"
              onClick={() => setUseCustomKey(!useCustomKey)}
            >
              <div className="font-medium">
                {t("encryption.useCustomKey", { keyType: isEncrypt ? t("encryption.publicKey").toLowerCase() : t("encryption.privateKey").toLowerCase() })}
              </div>
            </label>
            <Toggle
              checked={useCustomKey}
              onCheckedChange={setUseCustomKey}
              size="md"
            />
          </div>
        )}

        {isEncrypt && !hasStoredKeys && (
          <Textarea
            id="customKey"
            label={t("encryption.publicKey")}
            value={customKey}
            onChange={(e) => setCustomKey(e.target.value)}
            placeholder={`-----BEGIN PGP PUBLIC KEY BLOCK-----

...

-----END PGP PUBLIC KEY BLOCK-----`}
            disabled={isProcessing}
            required
            minHeight="200px"
          />
        )}

        {useCustomKey && hasStoredKeys && (
          <Textarea
            id="customKey"
            label={keyLabel}
            value={customKey}
            onChange={(e) => setCustomKey(e.target.value)}
            placeholder={`-----BEGIN PGP ${isEncrypt ? "PUBLIC" : "PRIVATE"
              } KEY BLOCK-----

...

-----END PGP ${isEncrypt ? "PUBLIC" : "PRIVATE"} KEY BLOCK-----`}
            disabled={isProcessing}
            required
            minHeight="200px"
          />
        )}

        {(isEncrypt || isSave) && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="signNote"
                className="flex-1 cursor-pointer"
                onClick={() => setSignNote(!signNote)}
              >
                <div className="font-medium">{t("encryption.signWithPrivateKey")}</div>
                <div className="text-sm text-muted-foreground">
                  {t("encryption.proveAuthenticityOfNote")}
                </div>
              </label>
              <Toggle
                checked={signNote}
                onCheckedChange={setSignNote}
                size="md"
              />
            </div>

            {signNote && (
              <div className="pl-4 border-l-2 border-border space-y-4">
                {hasStoredKeys && (
                  <div className="flex items-center justify-between gap-4">
                    <label
                      htmlFor="useStoredSigningKey"
                      className="flex-1 cursor-pointer"
                      onClick={() => setUseStoredSigningKey(!useStoredSigningKey)}
                    >
                      <div className="font-medium text-sm">
                        {t("encryption.useStoredPrivateKey")}
                      </div>
                    </label>
                    <Toggle
                      checked={useStoredSigningKey}
                      onCheckedChange={setUseStoredSigningKey}
                      size="sm"
                    />
                  </div>
                )}

                {(!useStoredSigningKey || !hasStoredKeys) && (
                  <Textarea
                    id="signingKey"
                    label={t("encryption.privateKeyForSigning")}
                    value={signingKey}
                    onChange={(e) => setSigningKey(e.target.value)}
                    placeholder={`-----BEGIN PGP PRIVATE KEY BLOCK-----

...

-----END PGP PRIVATE KEY BLOCK-----`}
                    disabled={isProcessing}
                    required
                    minHeight="150px"
                  />
                )}

                <Input
                  id="signingPassphrase"
                  type="password"
                  label={t("encryption.signingPassphrase")}
                  value={signingPassphrase}
                  onChange={(e) => setSigningPassphrase(e.target.value)}
                  placeholder={t("encryption.enterPassphraseForSigningKey")}
                  disabled={isProcessing}
                  required
                />
              </div>
            )}
          </div>
        )}

        {(mode === "decrypt" || mode === "view" || mode === "edit") && (
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
        )}

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

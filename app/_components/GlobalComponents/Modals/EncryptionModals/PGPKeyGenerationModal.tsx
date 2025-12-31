"use client";

import { useState, useEffect, useRef } from "react";
import { Download01Icon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Modal } from "../Modal";
import { InfoBox } from "@/app/_components/GlobalComponents/Cards/InfoBox";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { PasswordFields } from "@/app/_components/GlobalComponents/FormElements/PasswordFields";
import { generateKeyPair } from "@/app/_server/actions/pgp";
import { useToast } from "@/app/_providers/ToastProvider";
import { useTranslations } from "next-intl";

interface PGPKeyGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PGPKeyGenerationModal = ({
  isOpen,
  onClose,
  onSuccess,
}: PGPKeyGenerationModalProps) => {
  const t = useTranslations();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<{
    publicKey: string;
    privateKey: string;
    fingerprint: string;
  } | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      nameInputRef.current?.focus();
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

    if (passphrase !== confirmPassphrase) {
      showToast({
        type: "error",
        title: t("common.error"),
        message: t("errors.passwordsDoNotMatch"),
      });
      return;
    }

    if (passphrase.length < 8) {
      showToast({
        type: "error",
        title: t("common.error"),
        message: t("errors.passwordMinLength"),
      });
      return;
    }

    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append("passphrase", passphrase);
      if (name.trim()) formData.append("name", name.trim());
      if (email.trim()) formData.append("email", email.trim());

      const result = await generateKeyPair(formData);

      if (result.success && result.data) {
        setGeneratedKeys(result.data);
        showToast({
          type: "success",
          title: t("common.success"),
          message: t("encryption.pgpKeyPairGeneratedSuccessfully"),
        });
        onSuccess();
      } else {
        showToast({
          type: "error",
          title: t("common.error"),
          message: result.error || t("encryption.failedToGenerateKeys"),
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: t("common.error"),
        message: t("errors.anUnknownErrorOccurred"),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadKey = (keyType: "public" | "private") => {
    if (!generatedKeys) return;

    const key =
      keyType === "public" ? generatedKeys.publicKey : generatedKeys.privateKey;
    const blob = new Blob([key], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${keyType}.asc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setName("");
    setEmail("");
    setPassphrase("");
    setConfirmPassphrase("");
    setGeneratedKeys(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("encryption.generatePGPKeyPair")}
      className="max-w-2xl"
    >
      {!generatedKeys ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <InfoBox
            variant="warning"
            title={t("encryption.important")}
            items={[
              t("encryption.rememberPassphraseCannotRecover"),
              t("encryption.withoutPassphraseCannotDecrypt"),
              t("encryption.backupPrivateKeySafely"),
            ]}
          />

          <Input
            ref={nameInputRef}
            id="name"
            type="text"
            label={t("encryption.nameOptional")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("encryption.yourName")}
            disabled={isGenerating}
          />

          <Input
            id="email"
            type="email"
            label={t("encryption.emailOptional")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("encryption.yourEmail")}
            disabled={isGenerating}
          />

          <PasswordFields
            password={passphrase}
            setPassword={setPassphrase}
            confirmPassword={confirmPassphrase}
            setConfirmPassword={setConfirmPassphrase}
            disabled={isGenerating}
            isEditMode={false}
          />

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isGenerating}
            >{t('common.cancel')}</Button>
            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? t("encryption.generating") : t("encryption.generateKeys")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <InfoBox
            variant="info"
            title={t("encryption.keysGeneratedSuccessfully")}
            items={[
              `${t("encryption.fingerprint")}: ${generatedKeys.fingerprint}`,
              t("encryption.keysSavedSecurely"),
              t("encryption.downloadKeysForBackup"),
            ]}
          />

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => handleDownloadKey("public")}
              variant="outline"
              className="w-full"
            >
              <Download01Icon className="h-4 w-4 mr-2" />
              {t("encryption.downloadPublicKey")}
            </Button>
            <Button
              onClick={() => handleDownloadKey("private")}
              variant="outline"
              className="w-full"
            >
              <Download01Icon className="h-4 w-4 mr-2" />
              {t("encryption.downloadPrivateKey")}
            </Button>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleClose}>{t('common.done')}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

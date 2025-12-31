"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Modal } from "../Modal";
import { InfoBox } from "@/app/_components/GlobalComponents/Cards/InfoBox";
import { Textarea } from "@/app/_components/GlobalComponents/FormElements/Textarea";
import { importKeys } from "@/app/_server/actions/pgp";
import { useToast } from "@/app/_providers/ToastProvider";
import { useTranslations } from "next-intl";

interface PGPKeyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PGPKeyImportModal = ({
  isOpen,
  onClose,
  onSuccess,
}: PGPKeyImportModalProps) => {
  const t = useTranslations();
  const { showToast } = useToast();
  const [publicKey, setPublicKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const publicKeyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      publicKeyRef.current?.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey.trim() || !privateKey.trim()) {
      showToast({
        type: "error",
        title: t("common.error"),
        message: t("encryption.bothKeysRequired"),
      });
      return;
    }

    if (!publicKey.includes("-----BEGIN PGP PUBLIC KEY BLOCK-----")) {
      showToast({
        type: "error",
        title: t("common.error"),
        message: t("encryption.invalidPublicKeyFormat"),
      });
      return;
    }

    if (!privateKey.includes("-----BEGIN PGP PRIVATE KEY BLOCK-----")) {
      showToast({
        type: "error",
        title: t("common.error"),
        message: t("encryption.invalidPrivateKeyFormat"),
      });
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("publicKey", publicKey.trim());
      formData.append("privateKey", privateKey.trim());

      const result = await importKeys(formData);

      if (result.success) {
        showToast({
          type: "success",
          title: t("common.success"),
          message: t("encryption.keysImportedSuccessfully"),
        });
        onSuccess();
        handleClose();
      } else {
        showToast({
          type: "error",
          title: t("common.error"),
          message: result.error || t("encryption.failedToImportKeys"),
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: t("common.error"),
        message: t("errors.anUnknownErrorOccurred"),
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setPublicKey("");
    setPrivateKey("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("encryption.importPGPKeys")}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <InfoBox
          variant="info"
          title={t('encryption.importExistingKeys')}
          items={[
            t("encryption.pasteAsciiArmoredKeys"),
            t("encryption.keysMustStartWith"),
            t("encryption.keysWillBeSecurelyStored"),
          ]}
        />

        <Textarea
          ref={publicKeyRef}
          id="publicKey"
          label={t("encryption.publicKeyLabel")}
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value)}
          placeholder={`-----BEGIN PGP PUBLIC KEY BLOCK-----

mQINBF...

-----END PGP PUBLIC KEY BLOCK-----`}
          disabled={isImporting}
          required
          minHeight="150px"
        />

        <Textarea
          id="privateKey"
          label={t("encryption.privateKeyLabel")}
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          placeholder={`-----BEGIN PGP PRIVATE KEY BLOCK-----

lQdGBF...

-----END PGP PRIVATE KEY BLOCK-----`}
          disabled={isImporting}
          required
          minHeight="150px"
        />

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isImporting}
          >{t('common.cancel')}</Button>
          <Button type="submit" disabled={isImporting}>
            {isImporting ? t("encryption.importing") : t("encryption.importKeys")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

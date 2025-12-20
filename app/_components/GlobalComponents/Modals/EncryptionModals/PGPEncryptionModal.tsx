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
  mode: "encrypt" | "decrypt" | "view";
  noteContent: string;
  onSuccess: (content: string) => void;
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
        title: "Error",
        message: "Public key is required. You don't have any stored keys.",
      });
      return;
    }

    if (useCustomKey && !customKey.trim()) {
      showToast({
        type: "error",
        title: "Error",
        message: `${mode === "encrypt" ? "Public" : "Private"} key is required`,
      });
      return;
    }

    if (mode === "encrypt" && signNote) {
      if (!useStoredSigningKey && !signingKey.trim()) {
        showToast({
          type: "error",
          title: "Error",
          message: "Private key is required for signing",
        });
        return;
      }
      if (!signingPassphrase.trim()) {
        showToast({
          type: "error",
          title: "Error",
          message: "Passphrase is required for signing",
        });
        return;
      }
    }

    if (mode === "decrypt" && !passphrase.trim()) {
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
        formData.append("useStoredKey", (!useCustomKey).toString());
        if (useCustomKey) {
          formData.append("privateKey", customKey.trim());
        }

        const result = await decryptNoteContent(formData);

        if (result.success && result.data) {
          let message = "Note decrypted successfully";
          let type: "success" | "info" = "success";
          let title = "Success";

          if (result.data.signature) {
            if (result.data.signature.valid) {
              message += ". Signature verified.";
              title = "Decrypted & Verified";
            } else {
              message += ". Warning: Signature invalid or could not be verified.";
              type = "info";
              title = "Decrypted with Warning";
            }
          }

          showToast({
            type,
            title,
            message,
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
  const keyLabel = isEncrypt ? "Public Key" : "Private Key";
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
                  "Note content will be encrypted with PGP",
                  "Only someone with the private key/passphrase can decrypt it",
                  "Note title/frontmatter will remain unencrypted",
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

        {isEncrypt && !hasStoredKeys && (
          <InfoBox
            variant="warning"
            title="No stored keys found"
            items={[
              "You don't have any encryption keys configured",
              "Please paste a public key below to encrypt the note content",
              "You can generate or import specific keys for Jotty in Profile → Encryption",
              "Your passphrase will NEVER be stored on the server",
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
                Use custom {isEncrypt ? "public" : "private"} key
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
            label="Public Key"
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
            placeholder={`-----BEGIN PGP ${
              isEncrypt ? "PUBLIC" : "PRIVATE"
            } KEY BLOCK-----

...

-----END PGP ${isEncrypt ? "PUBLIC" : "PRIVATE"} KEY BLOCK-----`}
            disabled={isProcessing}
            required
            minHeight="200px"
          />
        )}

        {isEncrypt && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="signNote"
                className="flex-1 cursor-pointer"
                onClick={() => setSignNote(!signNote)}
              >
                <div className="font-medium">Sign with private key</div>
                <div className="text-sm text-muted-foreground">
                  prove authenticity of this note
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
                        Use stored private key
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
                    label="Private Key for Signing"
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
                  label="Signing Passphrase"
                  value={signingPassphrase}
                  onChange={(e) => setSigningPassphrase(e.target.value)}
                  placeholder="Enter passphrase for signing key"
                  disabled={isProcessing}
                  required
                />
              </div>
            )}
          </div>
        )}

        {(mode === "decrypt" || mode === "view") && (
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

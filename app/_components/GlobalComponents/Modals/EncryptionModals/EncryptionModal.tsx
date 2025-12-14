"use client";

import { useState, useEffect, useRef } from "react";
import { Key, Lock, Unlock } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Modal } from "../Modal";
import { InfoBox } from "@/app/_components/GlobalComponents/Cards/InfoBox";
import { Toggle } from "@/app/_components/GlobalComponents/FormElements/Toggle";
import {
  encryptNoteContent,
  decryptNoteContent,
} from "@/app/_server/actions/pgp";
import { useToast } from "@/app/_providers/ToastProvider";
import { useRouter } from "next/navigation";

interface EncryptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "encrypt" | "decrypt" | "view";
  noteContent: string;
  onSuccess: (content: string) => void;
}

export const EncryptionModal = ({
  isOpen,
  onClose,
  mode,
  noteContent,
  onSuccess,
}: EncryptionModalProps) => {
  const { showToast } = useToast();
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [customKey, setCustomKey] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const passphraseRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      passphraseRef.current?.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (useCustomKey && !customKey.trim()) {
      showToast({
        type: "error",
        title: "Error",
        message: `${mode === "encrypt" ? "Public" : "Private"} key is required`,
      });
      return;
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
    setUseCustomKey(false);
    setCustomKey("");
    setPassphrase("");
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
      titleIcon={
        isEncrypt ? (
          <Key className="h-5 w-5 text-primary" />
        ) : (
          <Unlock className="h-5 w-5 text-primary" />
        )
      }
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <InfoBox
          variant={isEncrypt ? "info" : "warning"}
          title={isEncrypt ? "Encrypting Note" : isView ? "View Decrypted Content" : "Decrypting Note"}
          items={
            isEncrypt
              ? [
                "Your note content will be encrypted with PGP",
                "Only someone with the private key can decrypt it",
                "The note title will remain unencrypted",
              ]
              : isView
                ? [
                  "Content will be decrypted for viewing only",
                  "The file will remain encrypted on the server",
                  "You cannot edit encrypted notes",
                ]
                : [
                  "This will decrypt the note file",
                  "The note will be saved as unencrypted",
                  "You will be able to edit the note after decryption",
                ]
          }
        />

        <div className="flex items-center justify-between gap-4">
          <label
            htmlFor="useCustomKey"
            className="flex-1 cursor-pointer"
            onClick={() => setUseCustomKey(!useCustomKey)}
          >
            <div className="font-medium">
              Use custom {isEncrypt ? "public" : "private"} key
            </div>
            <p className="text-sm text-muted-foreground">
              {useCustomKey
                ? `Paste your custom ${isEncrypt ? "public" : "private"} key below`
                : `Use your stored ${isEncrypt ? "public" : "private"} key`}
            </p>
          </label>
          <Toggle
            checked={useCustomKey}
            onCheckedChange={setUseCustomKey}
            size="md"
          />
        </div>

        {useCustomKey && (
          <div>
            <label
              htmlFor="customKey"
              className="block text-sm font-medium text-foreground mb-2"
            >
              {keyLabel} *
            </label>
            <textarea
              id="customKey"
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring font-mono text-xs min-h-[200px]"
              placeholder={`-----BEGIN PGP ${isEncrypt ? "PUBLIC" : "PRIVATE"} KEY BLOCK-----\n\n...\n\n-----END PGP ${isEncrypt ? "PUBLIC" : "PRIVATE"} KEY BLOCK-----`}
              disabled={isProcessing}
              required
            />
          </div>
        )}

        {(mode === "decrypt" || mode === "view") && (
          <div>
            <label
              htmlFor="passphrase"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Passphrase *
            </label>
            <input
              ref={passphraseRef}
              id="passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter your passphrase"
              disabled={isProcessing}
              required
            />
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isProcessing}>
            {isProcessing ? `${actionLabel}ing...` : actionLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, AlertCircle } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Modal } from "../Modal";
import { InfoBox } from "@/app/_components/GlobalComponents/Cards/InfoBox";
import { importKeys } from "@/app/_server/actions/pgp";
import { useToast } from "@/app/_providers/ToastProvider";

interface KeyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const KeyImportModal = ({
  isOpen,
  onClose,
  onSuccess,
}: KeyImportModalProps) => {
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
        title: "Error",
        message: "Both public and private keys are required",
      });
      return;
    }

    // Validate ASCII-armored format
    if (!publicKey.includes("-----BEGIN PGP PUBLIC KEY BLOCK-----")) {
      showToast({
        type: "error",
        title: "Error",
        message: "Invalid public key format. Must be ASCII-armored PGP key.",
      });
      return;
    }

    if (!privateKey.includes("-----BEGIN PGP PRIVATE KEY BLOCK-----")) {
      showToast({
        type: "error",
        title: "Error",
        message: "Invalid private key format. Must be ASCII-armored PGP key.",
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
          title: "Success",
          message: "Keys imported successfully",
        });
        onSuccess();
        handleClose();
      } else {
        showToast({
          type: "error",
          title: "Error",
          message: result.error || "Failed to import keys",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        message: "An unexpected error occurred",
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
      title="Import PGP Keys"
      titleIcon={<Upload className="h-5 w-5 text-primary" />}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <InfoBox
          variant="info"
          title="Import Existing Keys"
          items={[
            "Paste your ASCII-armored PGP keys below",
            "Keys must start with -----BEGIN PGP...",
            "Your keys will be securely stored",
          ]}
        />

        <div>
          <label
            htmlFor="publicKey"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Public Key *
          </label>
          <textarea
            ref={publicKeyRef}
            id="publicKey"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring font-mono text-xs min-h-[150px]"
            placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----&#10;&#10;mQINBF...&#10;&#10;-----END PGP PUBLIC KEY BLOCK-----"
            disabled={isImporting}
            required
          />
        </div>

        <div>
          <label
            htmlFor="privateKey"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Private Key *
          </label>
          <textarea
            id="privateKey"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring font-mono text-xs min-h-[150px]"
            placeholder="-----BEGIN PGP PRIVATE KEY BLOCK-----&#10;&#10;lQdGBF...&#10;&#10;-----END PGP PRIVATE KEY BLOCK-----"
            disabled={isImporting}
            required
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isImporting}>
            {isImporting ? "Importing..." : "Import Keys"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

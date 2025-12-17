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

interface KeyGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const KeyGenerationModal = ({
  isOpen,
  onClose,
  onSuccess,
}: KeyGenerationModalProps) => {
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
        title: "Error",
        message: "Passphrase is required",
      });
      return;
    }

    if (passphrase !== confirmPassphrase) {
      showToast({
        type: "error",
        title: "Error",
        message: "Passphrases do not match",
      });
      return;
    }

    if (passphrase.length < 8) {
      showToast({
        type: "error",
        title: "Error",
        message: "Passphrase must be at least 8 characters",
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
          title: "Success",
          message: "PGP key pair generated successfully",
        });
        onSuccess();
      } else {
        showToast({
          type: "error",
          title: "Error",
          message: result.error || "Failed to generate keys",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        message: "An unexpected error occurred",
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
      title="Generate PGP Key Pair"
      className="max-w-2xl"
    >
      {!generatedKeys ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <InfoBox
            variant="warning"
            title="Important"
            items={[
              "Remember your passphrase! It cannot be recovered.",
              "Without the passphrase, you cannot decrypt your notes.",
              "Backup your private key safely.",
            ]}
          />

          <Input
            ref={nameInputRef}
            id="name"
            type="text"
            label="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            disabled={isGenerating}
          />

          <Input
            id="email"
            type="email"
            label="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
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
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate Keys"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <InfoBox
            variant="info"
            title="Keys Generated Successfully"
            items={[
              `Fingerprint: ${generatedKeys.fingerprint}`,
              "Your keys have been saved securely.",
              "Download your keys for backup (optional).",
            ]}
          />

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => handleDownloadKey("public")}
              variant="outline"
              className="w-full"
            >
              <Download01Icon className="h-4 w-4 mr-2" />
              Download Public Key
            </Button>
            <Button
              onClick={() => handleDownloadKey("private")}
              variant="outline"
              className="w-full"
            >
              <Download01Icon className="h-4 w-4 mr-2" />
              Download Private Key
            </Button>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

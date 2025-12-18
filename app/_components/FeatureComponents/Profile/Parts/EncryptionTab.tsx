"use client";

import { useEffect, useState } from "react";
import {
  LockKeyIcon,
  Download01Icon,
  Upload01Icon,
  Delete03Icon,
  Alert02Icon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { FormWrapper } from "@/app/_components/GlobalComponents/FormElements/FormWrapper";
import { Toggle } from "@/app/_components/GlobalComponents/FormElements/Toggle";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { InfoBox } from "@/app/_components/GlobalComponents/Cards/InfoBox";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useToast } from "@/app/_providers/ToastProvider";
import { updateUserSettings } from "@/app/_server/actions/users";
import {
  getStoredKeys,
  exportKeys,
  deleteKeys,
  setCustomKeyPath as setCustomKeyPathAction,
} from "@/app/_server/actions/pgp";
import { PGPKeyMetadata } from "@/app/_types";
import { KeyGenerationModal } from "@/app/_components/GlobalComponents/Modals/EncryptionModals/KeyGenerationModal";
import { KeyImportModal } from "@/app/_components/GlobalComponents/Modals/EncryptionModals/KeyImportModal";

export const EncryptionTab = () => {
  const { user, setUser, isDemoMode } = useAppMode();
  const { showToast } = useToast();
  const [hasKeys, setHasKeys] = useState(false);
  const [keyMetadata, setKeyMetadata] = useState<PGPKeyMetadata | null>(null);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [autoDecrypt, setAutoDecrypt] = useState(
    user?.encryptionSettings?.autoDecrypt ?? true
  );
  const [customKeyPath, setCustomKeyPath] = useState(
    user?.encryptionSettings?.customKeyPath ?? ""
  );
  const [isSavingPath, setIsSavingPath] = useState(false);

  useEffect(() => {
    loadKeyStatus();
  }, []);

  useEffect(() => {
    setAutoDecrypt(user?.encryptionSettings?.autoDecrypt ?? true);
    setCustomKeyPath(user?.encryptionSettings?.customKeyPath ?? "");
  }, [user]);

  const loadKeyStatus = async () => {
    setIsLoadingKeys(true);
    try {
      const result = await getStoredKeys();
      if (result.success && result.data) {
        setHasKeys(result.data.hasKeys);
        setKeyMetadata(result.data.metadata ?? null);
      }
    } catch (error) {
      console.error("Error loading key status:", error);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const handleExportKey = async (keyType: "public" | "private") => {
    if (keyType === "private") {
      const confirmed = window.confirm(
        "WARNING: Your private key allows decryption of all encrypted notes. Only export if you understand the security implications. Continue?"
      );
      if (!confirmed) return;
    }

    try {
      const result = await exportKeys(keyType);
      if (result.success && result.data) {
        const blob = new Blob([result.data.key], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${keyType}.asc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast({
          type: "success",
          title: "Success",
          message: `${
            keyType === "public" ? "Public" : "Private"
          } key exported successfully`,
        });
      } else {
        showToast({
          type: "error",
          title: "Error",
          message: result.error || "Failed to export key",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        message: "An unexpected error occurred",
      });
    }
  };

  const handleDeleteKeys = async () => {
    try {
      const result = await deleteKeys();
      if (result.success) {
        showToast({
          type: "success",
          title: "Success",
          message: "Keys deleted successfully",
        });
        setHasKeys(false);
        setKeyMetadata(null);
        setShowDeleteConfirm(false);
        loadKeyStatus();
      } else {
        showToast({
          type: "error",
          title: "Error",
          message: result.error || "Failed to delete keys",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        message: "An unexpected error occurred",
      });
    }
  };

  const handleAutoDecryptChange = async (enabled: boolean) => {
    setAutoDecrypt(enabled);
    try {
      const result = await updateUserSettings({
        encryptionSettings: {
          ...user?.encryptionSettings,
          hasKeys: user?.encryptionSettings?.hasKeys ?? false,
          autoDecrypt: enabled,
        },
      });

      if (result.success && result.data) {
        setUser(result.data.user);
        showToast({
          type: "success",
          title: "Success",
          message: "Auto-decrypt setting updated",
        });
      } else {
        showToast({
          type: "error",
          title: "Error",
          message: result.error || "Failed to update setting",
        });
        setAutoDecrypt(!enabled);
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        message: "An unexpected error occurred",
      });
      setAutoDecrypt(!enabled);
    }
  };

  const handleSaveCustomPath = async () => {
    if (!customKeyPath.trim()) {
      showToast({
        type: "error",
        title: "Error",
        message: "Please enter a valid path",
      });
      return;
    }

    setIsSavingPath(true);
    try {
      const result = await setCustomKeyPathAction(customKeyPath.trim());
      if (result.success && result.data) {
        setUser(result.data.user);
        showToast({
          type: "success",
          title: "Success",
          message: "Custom key path set successfully",
        });
        loadKeyStatus();
      } else {
        showToast({
          type: "error",
          title: "Error",
          message: result.error || "Failed to set custom path",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        message: "An unexpected error occurred",
      });
    } finally {
      setIsSavingPath(false);
    }
  };

  return (
    <div className="space-y-6">
      <FormWrapper title="Encryption Keys">
        {isLoadingKeys ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : hasKeys && keyMetadata ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <LockKeyIcon className="h-5 w-5" />
              <span className="font-medium">Keys configured</span>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Fingerprint: </span>
                <span className="font-mono text-xs">
                  {keyMetadata.keyFingerprint}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Created: </span>
                <span>
                  {new Date(keyMetadata.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Algorithm: </span>
                <span>{keyMetadata.algorithm}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <LockKeyIcon className="h-5 w-5" />
              <span>No encryption keys configured</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Generate a new key pair or import existing keys to enable note
              encryption.
            </p>
          </div>
        )}
      </FormWrapper>

      <FormWrapper title="Key Management">
        {!isDemoMode ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {!hasKeys && (
              <>
                <Button
                  onClick={() => setShowGenerateModal(true)}
                  className="w-full"
                >
                  <LockKeyIcon className="h-4 w-4 mr-2" />
                  Generate New Key Pair
                </Button>
                <Button
                  onClick={() => setShowImportModal(true)}
                  variant="outline"
                  className="w-full"
                >
                  <Upload01Icon className="h-4 w-4 mr-2" />
                  Import Existing Keys
                </Button>
              </>
            )}
            {hasKeys && (
              <>
                <Button
                  onClick={() => handleExportKey("public")}
                  variant="outline"
                  className="w-full"
                >
                  <Download01Icon className="h-4 w-4 mr-2" />
                  Export Public Key
                </Button>
                <Button
                  onClick={() => handleExportKey("private")}
                  variant="outline"
                  className="w-full"
                >
                  <Download01Icon className="h-4 w-4 mr-2" />
                  Export Private Key
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="destructive"
                  className="w-full md:col-span-2"
                >
                  <Delete03Icon className="h-4 w-4 mr-2" />
                  Delete Keys
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Stored encryption keys are disabled in demo mode.
          </div>
        )}
      </FormWrapper>

      <FormWrapper title="Encryption Settings">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <label
              htmlFor="autoDecrypt"
              className="flex-1 cursor-pointer space-y-1"
              onClick={() => handleAutoDecryptChange(!autoDecrypt)}
            >
              <div className="font-medium">
                Prompt for passphrase when opening encrypted notes
              </div>
              <p className="text-sm text-muted-foreground">
                If enabled, you will be prompted for your passphrase when
                opening an encrypted note. The note will stay encrypted on the
                server, but you will be able to see the decrypted content in the
                current tab session.
              </p>
            </label>
            <Toggle
              checked={autoDecrypt}
              onCheckedChange={handleAutoDecryptChange}
              size="md"
            />
          </div>
        </div>
      </FormWrapper>

      <FormWrapper title="Custom Key Path (Local Installations)">
        {!isDemoMode ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Specify a custom (absolute) filesystem path for storing encryption
              keys. This is only needed for local installations. Docker users
              should map the default path in docker-compose.yml instead.
            </p>
            <Input
              id="customKeyPath"
              type="text"
              label="Custom Path"
              value={customKeyPath}
              onChange={(e) => setCustomKeyPath(e.target.value)}
              placeholder="/home/user/my-keys"
              description="Must be an absolute path (e.g., /home/user/my-keys or C:\Users\user\my-keys)"
            />
            <Button
              onClick={handleSaveCustomPath}
              disabled={isSavingPath || !customKeyPath.trim()}
              variant="outline"
            >
              {isSavingPath ? "Saving..." : "Set Custom Path"}
            </Button>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Custom key path is disabled in demo mode
          </div>
        )}
      </FormWrapper>

      <KeyGenerationModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onSuccess={loadKeyStatus}
      />

      <KeyImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={loadKeyStatus}
      />

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-jotty p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 text-destructive mb-4">
              <Alert02Icon className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Delete Encryption Keys?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              This will permanently delete your encryption keys. You will NOT be
              able to decrypt any encrypted notes without re-importing your
              private key. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteKeys}>
                Delete Keys
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

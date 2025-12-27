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
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useToast } from "@/app/_providers/ToastProvider";
import { updateUserSettings } from "@/app/_server/actions/users";
import {
  getStoredKeys,
  exportKeys,
  deleteKeys,
  setCustomKeyPath as setCustomKeyPathAction,
} from "@/app/_server/actions/pgp";
import { PGPKeyMetadata, EncryptionMethod } from "@/app/_types";
import { PGPKeyGenerationModal } from "@/app/_components/GlobalComponents/Modals/EncryptionModals/PGPKeyGenerationModal";
import { PGPKeyImportModal } from "@/app/_components/GlobalComponents/Modals/EncryptionModals/PGPKeyImportModal";
import { useTranslations } from "next-intl";

interface EncryptionTabClientProps {
  initialKeyData: {
    hasKeys: boolean;
    metadata: PGPKeyMetadata | null;
  };
}

export const EncryptionTabClient = ({ initialKeyData }: EncryptionTabClientProps) => {
  const t = useTranslations();
  const { user, setUser, isDemoMode } = useAppMode();
  const { showToast } = useToast();
  const [hasKeys, setHasKeys] = useState(initialKeyData.hasKeys);
  const [keyMetadata, setKeyMetadata] = useState<PGPKeyMetadata | null>(initialKeyData.metadata);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
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
  const method: EncryptionMethod = user?.encryptionSettings?.method || "xchacha";

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
      const confirmed = window.confirm(t('encryption.privateKeyWarning'));
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
          title: t('common.success'),
          message: keyType === "public" ? t('encryption.publicKeyExported') : t('encryption.privateKeyExported'),
        });
      } else {
        showToast({
          type: "error",
          title: t('common.error'),
          message: result.error || t('encryption.failedToExportKey'),
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: t('common.error'),
        message: t('encryption.unexpectedError'),
      });
    }
  };

  const handleDeleteKeys = async () => {
    try {
      const result = await deleteKeys();
      if (result.success) {
        showToast({
          type: "success",
          title: t('common.success'),
          message: t('encryption.keysDeleted'),
        });
        setHasKeys(false);
        setKeyMetadata(null);
        setShowDeleteConfirm(false);
        loadKeyStatus();
      } else {
        showToast({
          type: "error",
          title: t('common.error'),
          message: result.error || t('encryption.failedToDeleteKeys'),
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: t('common.error'),
        message: t('encryption.unexpectedError'),
      });
    }
  };

  const handleAutoDecryptChange = async (enabled: boolean) => {
    setAutoDecrypt(enabled);
    try {
      const result = await updateUserSettings({
        encryptionSettings: {
          method: user?.encryptionSettings?.method || "xchacha",
          hasKeys: user?.encryptionSettings?.hasKeys ?? false,
          autoDecrypt: enabled,
          customKeyPath: user?.encryptionSettings?.customKeyPath,
        },
      });

      if (result.success && result.data) {
        setUser(result.data.user);
        showToast({
          type: "success",
          title: t('common.success'),
          message: t('encryption.autoDecryptUpdated'),
        });
      } else {
        showToast({
          type: "error",
          title: t('common.error'),
          message: result.error || t('encryption.failedToUpdateSetting'),
        });
        setAutoDecrypt(!enabled);
      }
    } catch (error) {
      showToast({
        type: "error",
        title: t('common.error'),
        message: t('encryption.unexpectedError'),
      });
      setAutoDecrypt(!enabled);
    }
  };

  const handleSaveCustomPath = async () => {
    if (!customKeyPath.trim()) {
      showToast({
        type: "error",
        title: t('common.error'),
        message: t('encryption.enterValidPath'),
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
          title: t('common.success'),
          message: t('encryption.customPathSet'),
        });
        loadKeyStatus();
      } else {
        showToast({
          type: "error",
          title: t('common.error'),
          message: result.error || t('encryption.failedToSetCustomPath'),
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: t('common.error'),
        message: t('encryption.unexpectedError'),
      });
    } finally {
      setIsSavingPath(false);
    }
  };

  const handleMethodChange = async (newMethod: string) => {
    try {
      const result = await updateUserSettings({
        encryptionSettings: {
          ...user?.encryptionSettings,
          method: newMethod as EncryptionMethod,
          hasKeys: user?.encryptionSettings?.hasKeys ?? false,
          autoDecrypt: user?.encryptionSettings?.autoDecrypt ?? true,
        },
      });

      if (result.success && result.data) {
        setUser(result.data.user);
        showToast({
          type: "success",
          title: t('common.success'),
          message: t('encryption.methodUpdated'),
        });
      } else {
        showToast({
          type: "error",
          title: t('common.error'),
          message: result.error || t('encryption.failedToUpdateMethod'),
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: t('common.error'),
        message: t('encryption.unexpectedError'),
      });
    }
  };

  return (
    <div className="space-y-6">
      <FormWrapper title={t('encryption.encryptionMethod')}>
        <div className="space-y-4">
          <Dropdown
            value={method}
            onChange={handleMethodChange}
            options={[
              { id: "xchacha", name: t('encryption.xchacha') },
              { id: "pgp", name: t('encryption.pgp') }
            ]}
            placeholder={t('encryption.selectMethod')}
            className="w-full"
          />
          <InfoBox
            variant="info"
            title={t('encryption.encryptionMethodsTitle')}
            items={[
              t('encryption.xchachaDescription'),
              t('encryption.pgpDescription')
            ]}
          />
        </div>
      </FormWrapper>

      {method === "pgp" && (
        <FormWrapper title={t('encryption.encryptionKeys')}>
          {isLoadingKeys ? (
            <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
          ) : hasKeys && keyMetadata ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <LockKeyIcon className="h-5 w-5" />
                <span className="font-medium">{t('encryption.keysConfigured')}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('encryption.fingerprint')}</span>
                  <span className="font-mono text-xs">
                    {keyMetadata.keyFingerprint}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('encryption.created')}</span>
                  <span>
                    {new Date(keyMetadata.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('encryption.algorithm')}</span>
                  <span>{keyMetadata.algorithm}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <LockKeyIcon className="h-5 w-5" />
                <span>{t('encryption.noKeysConfigured')}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('encryption.generateOrImportKeys')}
              </p>
            </div>
          )}
        </FormWrapper>
      )}

      {method === "pgp" && (
        <FormWrapper title={t('encryption.keyManagement')}>
          {!isDemoMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {!hasKeys && (
                <>
                  <Button
                    onClick={() => setShowGenerateModal(true)}
                    className="w-full"
                  >
                    <LockKeyIcon className="h-4 w-4 mr-2" />
                    {t('encryption.generateNewKeyPair')}
                  </Button>
                  <Button
                    onClick={() => setShowImportModal(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <Upload01Icon className="h-4 w-4 mr-2" />
                    {t('encryption.importExistingKeys')}
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
                    {t('encryption.exportPublicKey')}
                  </Button>
                  <Button
                    onClick={() => handleExportKey("private")}
                    variant="outline"
                    className="w-full"
                  >
                    <Download01Icon className="h-4 w-4 mr-2" />
                    {t('encryption.exportPrivateKey')}
                  </Button>
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="destructive"
                    className="w-full md:col-span-2"
                  >
                    <Delete03Icon className="h-4 w-4 mr-2" />
                    {t('encryption.deleteKeys')}
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {t('encryption.keysDisabledInDemo')}
            </div>
          )}
        </FormWrapper>
      )}

      <FormWrapper title={t('encryption.encryptionSettings')}>
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <label
              htmlFor="autoDecrypt"
              className="flex-1 cursor-pointer space-y-1"
              onClick={() => handleAutoDecryptChange(!autoDecrypt)}
            >
              <div className="font-medium">
                {t('encryption.promptForPassphrase')}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('encryption.promptForPassphraseDescription')}
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

      {method === "pgp" && (
        <FormWrapper title={t('encryption.customKeyPath')}>
          {!isDemoMode ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('encryption.customKeyPathDescription')}
              </p>
              <Input
                id="customKeyPath"
                type="text"
                label={t('encryption.customPath')}
                value={customKeyPath}
                onChange={(e) => setCustomKeyPath(e.target.value)}
                placeholder={t('encryption.customPathPlaceholder')}
                description={t('encryption.customPathHelp')}
              />
              <Button
                onClick={handleSaveCustomPath}
                disabled={isSavingPath || !customKeyPath.trim()}
                variant="outline"
              >
                {isSavingPath ? t('common.saving') : t('encryption.setCustomPath')}
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {t('encryption.customPathDisabledInDemo')}
            </div>
          )}
        </FormWrapper>
      )}

      <PGPKeyGenerationModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onSuccess={loadKeyStatus}
      />

      <PGPKeyImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={loadKeyStatus}
      />

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-jotty p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 text-destructive mb-4">
              <Alert02Icon className="h-6 w-6" />
              <h3 className="text-lg font-semibold">{t('encryption.deleteKeysConfirmTitle')}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {t('encryption.deleteKeysConfirmMessage')}
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleDeleteKeys}>
                {t('encryption.deleteKeys')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

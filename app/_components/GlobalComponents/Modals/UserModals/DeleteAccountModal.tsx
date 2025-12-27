"use client";

import { useState } from "react";
import {
  Delete03Icon,
  ViewIcon,
  ViewOffSlashIcon,
  AlertCircleIcon,
  Tick02Icon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useRouter } from "next/navigation";
import { Modal } from "../Modal";
import { InfoCardVariant } from "@/app/_components/GlobalComponents/Cards/InfoCard";
import { InfoBox } from "../../Cards/InfoBox";
import { deleteAccount } from "@/app/_server/actions/users";
import { useTranslations } from "next-intl";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeleteAccountModal = ({
  isOpen,
  onClose,
}: DeleteAccountModalProps) => {
  const t = useTranslations();
  const router = useRouter();
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirmPassword.trim()) {
      setError("Password confirmation is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("confirmPassword", confirmPassword);

      const result = await deleteAccount(formData);

      if (result.success) {
        setSuccess("Account deleted successfully. Redirecting to login...");
        setTimeout(() => {
          router.push("/auth/login");
        }, 2000);
      } else {
        setError(result.error || "Failed to delete account");
      }
    } catch (error) {
      setError("Failed to delete account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmPassword("");
    setShowPassword(false);
    setError(null);
    setSuccess(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={true} onClose={onClose} title={t('settings.deleteAccount')}>
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-jotty">
            <AlertCircleIcon className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-jotty">
            <Tick02Icon className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary">{success}</span>
          </div>
        )}

        <div className="space-y-4">
          <InfoBox
            title={t("settings.deleteAccountWarning")}
            variant={InfoCardVariant.WARNING}
            items={[
              "All your checklists and notes will be permanently deleted",
              "All shared content will be removed",
              "Your account and session data will be erased",
              "This action is irreversible",
            ]}
          ></InfoBox>

          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.confirmPassword')}</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-jotty focus:outline-none focus:ring-none focus:ring-ring pr-10"
                placeholder={t("settings.enterPasswordToConfirm")}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              >
                {showPassword ? (
                  <ViewOffSlashIcon className="h-4 w-4" />
                ) : (
                  <ViewIcon className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Enter your password to confirm account deletion
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>{t('common.cancel')}</Button>
          <Button
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              "Deleting..."
            ) : (
              <>
                <Delete03Icon className="h-4 w-4 mr-2" />{t('settings.deleteAccount')}</>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

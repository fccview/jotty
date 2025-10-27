"use client";

import { useState } from "react";
import { Trash2, Eye, EyeOff, AlertCircle, Check } from "lucide-react";
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
  const router = useRouter();
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const t = useTranslations();
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
    <Modal
      isOpen={true}
      onClose={onClose}
      title={t("global.delete_account")}
      titleIcon={<Trash2 className="h-5 w-5 text-destructive" />}
    >
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-md">
            <Check className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary">{success}</span>
          </div>
        )}

        <div className="space-y-4">
          <InfoBox
            title={t("global.warning_cannot_undo")}
            variant={InfoCardVariant.WARNING}
            items={[
              t("global.all_checklists_and_notes_will_be_permanently_deleted"),
              t("global.all_shared_content_will_be_removed"),
              t("global.your_account_and_session_data_will_be_erased"),
              t("global.this_action_is_irreversible"),
            ]}
          ></InfoBox>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t("global.confirm_password")}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring pr-10"
                placeholder={t("global.enter_your_password_to_confirm")}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("global.enter_your_password_to_confirm_account_deletion")}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {t("global.cancel")}
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              t("global.deleting")
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                {t("global.delete_account")}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

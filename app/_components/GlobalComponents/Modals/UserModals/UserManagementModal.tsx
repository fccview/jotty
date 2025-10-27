"use client";

import { Modal } from "../Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import {
  Shield,
  Trash2,
  Edit3,
  Plus,
  Save,
  AlertCircle,
  Lock,
  Loader2,
} from "lucide-react";
import { useUserManagementModal } from "@/app/_hooks/useUserManagementModal";
import { User as UserType } from "@/app/_types";
import { PasswordFields } from "@/app/_components/GlobalComponents/FormElements/PasswordFields";
import { useTranslations } from "next-intl";
interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  user?: UserType;
  onSuccess: () => void;
}

export const UserManagementModal = (props: UserManagementModalProps) => {
  const { isOpen, onClose, mode, user } = props;
  const { state, setters, handlers } = useUserManagementModal(props);
  const t = useTranslations();
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={mode === "add" ? t("global.add_new_user") : t("global.edit_user")}
      titleIcon={
        mode === "add" ? (
          <Plus className="h-5 w-5 text-primary" />
        ) : (
          <Edit3 className="h-5 w-5 text-primary" />
        )
      }
    >
      <form onSubmit={handlers.handleSubmit} className="space-y-4">
        {state.error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">{state.error}</span>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-2">{t("global.username")}</label>
          <input
            type="text"
            value={state.username}
            onChange={(e) => setters.setUsername(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder={t("global.enter_username")}
            disabled={state.isLoading}
          />
        </div>
        {mode === "add" && (
          <PasswordFields
            password={state.password}
            setPassword={setters.setPassword}
            confirmPassword={state.confirmPassword}
            setConfirmPassword={setters.setConfirmPassword}
            disabled={state.isLoading}
            isEditMode
          />
        )}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isAdmin"
            checked={state.isAdmin}
            onChange={(e) => setters.setIsAdmin(e.target.checked)}
            className="rounded border-border"
            disabled={state.isLoading}
          />
          <label
            htmlFor="isAdmin"
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <Shield className="h-4 w-4" /> {t("global.admin_privileges")}
          </label>
        </div>
        {mode === "edit" && (
          <>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="changePassword"
                checked={state.changePassword}
                onChange={(e) => setters.setChangePassword(e.target.checked)}
                className="rounded border-border"
                disabled={state.isLoading}
              />
              <label
                htmlFor="changePassword"
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Lock className="h-4 w-4" /> {t("global.change_password")}
              </label>
            </div>
            {state.changePassword && (
              <PasswordFields
                password={state.password}
                setPassword={setters.setPassword}
                confirmPassword={state.confirmPassword}
                setConfirmPassword={setters.setConfirmPassword}
                disabled={state.isLoading}
                isEditMode
              />
            )}
          </>
        )}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            {mode === "edit" && user && (
              <Button
                type="button"
                variant="outline"
                onClick={handlers.handleDelete}
                disabled={state.isLoading}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" /> {t("global.delete")}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={state.isLoading}
            >
              {t("global.cancel")}
            </Button>
            <Button type="submit" disabled={state.isLoading}>
              {state.isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("global.saving")}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {mode === "add" ? t("global.create_user") : t("global.save_changes")}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

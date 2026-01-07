"use client";

import { Modal } from "../Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import {
  ShieldUserIcon,
  Delete03Icon,
  FloppyDiskIcon,
  AlertCircleIcon,
  SquareLock01Icon,
  Orbit01Icon,
  FileSecurityIcon,
} from "hugeicons-react";
import { useUserManagementModal } from "@/app/_hooks/useUserManagementModal";
import { User as UserType } from "@/app/_types";
import { PasswordFields } from "@/app/_components/GlobalComponents/FormElements/PasswordFields";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { Toggle } from "@/app/_components/GlobalComponents/FormElements/Toggle";
import { Logo } from "../../Layout/Logo/Logo";
import { useTranslations } from "next-intl";

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  user?: UserType;
  onSuccess: () => void;
}

export const UserManagementModal = (props: UserManagementModalProps) => {
  const t = useTranslations();
  const { isOpen, onClose, mode, user } = props;
  const { state, setters, handlers, DeleteModal } = useUserManagementModal(props);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={mode === "add" ? t('auth.createUser') : t('admin.editUser')}
    >
      <form onSubmit={handlers.handleSubmit} className="space-y-4">
        {state.error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-jotty">
            <AlertCircleIcon className="h-4 w-4 text-destructive" />
            <span className="text-md lg:text-sm text-destructive">{state.error}</span>
          </div>
        )}
        <Input
          id="username"
          name="username"
          label={t('common.username')}
          type="text"
          value={state.username}
          onChange={(e) => setters.setUsername(e.target.value)}
          placeholder={t('admin.enterUsername')}
          disabled={state.isLoading}
        />
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
            className="flex items-center gap-2 text-md lg:text-sm cursor-pointer"
          >
            <ShieldUserIcon className="h-4 w-4" /> {t('admin.privileges')}
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
                className="flex items-center gap-2 text-md lg:text-sm cursor-pointer"
              >
                <SquareLock01Icon className="h-4 w-4" />{t('settings.changePassword')}</label>
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
            {user?.mfaEnabled && (
              <>
                <div className="flex items-center justify-between">
                  <label htmlFor="disableMfa" className="flex items-center gap-2 text-md lg:text-sm font-medium text-foreground">
                    <FileSecurityIcon className="h-4 w-4" />
                    {t('mfa.disableMfaForUser')}
                  </label>
                  <Toggle
                    id="disableMfa"
                    checked={state.disableMfa}
                    onCheckedChange={setters.setDisableMfa}
                    disabled={state.isLoading}
                  />
                </div>
                {state.disableMfa && (
                  <Input
                    id="recovery-code"
                    name="recovery-code"
                    label={t('mfa.recoveryCode')}
                    type="text"
                    value={state.recoveryCode}
                    onChange={(e) => setters.setRecoveryCode(e.target.value)}
                    placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                    disabled={state.isLoading}
                  />
                )}
              </>
            )}
          </>
        )}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            {mode === "edit" && user && (
              <Button
                type="button"
                variant="destructive"
                onClick={handlers.handleDelete}
                disabled={state.isLoading}
              >
                <Delete03Icon className="h-4 w-4 mr-2" />{t('common.delete')}</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={state.isLoading}
            >{t('common.cancel')}</Button>
            <Button type="submit" disabled={state.isLoading}>
              {state.isLoading ? (
                <>
                  <Logo
                    className="h-4 w-4 bg-background mr-2 animate-pulse"
                    pathClassName="fill-primary"
                  />{t('common.saving')}</>
              ) : (
                <>
                  <FloppyDiskIcon className="h-4 w-4 mr-2" />
                  {mode === "add" ? t('auth.createUser') : t('common.saveChanges')}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
      <DeleteModal />
    </Modal>
  );
};

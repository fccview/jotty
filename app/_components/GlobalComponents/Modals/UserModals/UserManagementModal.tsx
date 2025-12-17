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
} from "hugeicons-react";
import { useUserManagementModal } from "@/app/_hooks/useUserManagementModal";
import { User as UserType } from "@/app/_types";
import { PasswordFields } from "@/app/_components/GlobalComponents/FormElements/PasswordFields";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { Logo } from "../../Layout/Logo/Logo";

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

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={mode === "add" ? "Add New User" : "Edit User"}
    >
      <form onSubmit={handlers.handleSubmit} className="space-y-4">
        {state.error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-jotty">
            <AlertCircleIcon className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">{state.error}</span>
          </div>
        )}
        <Input
          id="username"
          name="username"
          label="Username"
          type="text"
          value={state.username}
          onChange={(e) => setters.setUsername(e.target.value)}
          placeholder="Enter username"
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
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <ShieldUserIcon className="h-4 w-4" /> Admin privileges
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
                <SquareLock01Icon className="h-4 w-4" /> Change Password
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
                <Delete03Icon className="h-4 w-4 mr-2" /> Delete
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
              Cancel
            </Button>
            <Button type="submit" disabled={state.isLoading}>
              {state.isLoading ? (
                <>
                  <Logo className="h-4 w-4 bg-background mr-2 animate-pulse" pathClassName="fill-primary" />
                  Saving...
                </>
              ) : (
                <>
                  <FloppyDiskIcon className="h-4 w-4 mr-2" />
                  {mode === "add" ? "Create User" : "Save Changes"}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

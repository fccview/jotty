import { useState, useEffect } from "react";
import { User as UserType } from "@/app/_types";
import { useTranslations } from "next-intl";
import {
  createUser,
  deleteUser,
  updateUser,
} from "@/app/_server/actions/users";
import { adminDisableUserMfa } from "@/app/_server/actions/mfa";
import { useToast } from "@/app/_providers/ToastProvider";

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  user?: UserType;
  onSuccess: () => void;
}

export const useUserManagementModal = ({
  isOpen,
  mode,
  user,
  onSuccess,
  onClose,
}: UserManagementModalProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [disableMfa, setDisableMfa] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast} = useToast();
  const t = useTranslations();

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && user) {
        setUsername(user.username);
        setIsAdmin(user.isAdmin);
      } else {
        setUsername("");
        setIsAdmin(false);
      }
      setPassword("");
      setConfirmPassword("");
      setChangePassword(false);
      setDisableMfa(false);
      setRecoveryCode("");
      setError(null);
    }
  }, [isOpen, mode, user]);

  const validate = () => {
    if (!username.trim()) return t("errors.usernameRequired");
    const isPasswordRequired = mode === "add" || changePassword;
    if (isPasswordRequired && !password) return t("errors.passwordRequired");
    if (isPasswordRequired && password.length < 6)
      return t("errors.passwordMinLength");
    if (isPasswordRequired && password !== confirmPassword)
      return t("errors.passwordsDoNotMatch");
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (disableMfa && !recoveryCode.trim()) {
      setError(t("mfa.recoveryCodeRequired"));
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (mode === "edit" && disableMfa && user) {
        const mfaResult = await adminDisableUserMfa(user.username, recoveryCode);
        if (!mfaResult.success) {
          throw new Error(mfaResult.error || t("mfa.failedToDisableMfa"));
        }
      }

      let result;
      if (mode === "add") {
        const formData = new FormData();
        formData.append("username", username);
        formData.append("password", password);
        formData.append("confirmPassword", confirmPassword);
        formData.append("isAdmin", String(isAdmin));
        result = await createUser(formData);
      } else {
        const formData = new FormData();
        formData.append("username", user!.username);
        formData.append("newUsername", username);
        if (changePassword && password) {
          formData.append("password", password);
          formData.append("confirmPassword", confirmPassword);
        }
        formData.append("isAdmin", String(isAdmin));
        result = await updateUser(formData);
      }

      if (result.success) {
        showToast({
          type: "success",
          title: t("errors.userSavedSuccessfully", {
            mode: mode === "add" ? "created" : "updated"
          }),
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(result.error || t("errors.failedToSaveUser", { mode }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.anErrorOccurred"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !user ||
      !window.confirm(t("errors.deleteUserConfirmation", { username: user.username }))
    )
      return;

    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("username", user.username);
      const result = await deleteUser(formData);

      if (result.success) {
        showToast({ type: "success", title: t("errors.userDeletedSuccessfully") });
        onSuccess();
        onClose();
      } else {
        throw new Error(result.error || t("errors.failedToDeleteUser"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.anErrorOccurred"));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    state: {
      username,
      password,
      confirmPassword,
      isAdmin,
      changePassword,
      disableMfa,
      recoveryCode,
      isLoading,
      error,
    },
    setters: {
      setUsername,
      setPassword,
      setConfirmPassword,
      setIsAdmin,
      setChangePassword,
      setDisableMfa,
      setRecoveryCode,
    },
    handlers: { handleSubmit, handleDelete },
  };
};

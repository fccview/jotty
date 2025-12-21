"use client";

import {
  AlertCircleIcon,
  Tick02Icon,
  LockKeyIcon,
  Copy01Icon,
  ViewIcon,
  ViewOffSlashIcon,
  RefreshIcon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { User as UserType, AppSettings } from "@/app/_types";
import { updateProfile } from "@/app/_server/actions/users";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { ImageUpload } from "@/app/_components/GlobalComponents/FormElements/ImageUpload";
import { uploadUserAvatar } from "@/app/_server/actions/upload";
import { useState, useEffect } from "react";
import { logout } from "@/app/_server/actions/auth";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { generateApiKey, getApiKey } from "@/app/_server/actions/api";
import { User as UserData } from "@/app/_types";
import { FormWrapper } from "@/app/_components/GlobalComponents/FormElements/FormWrapper";
import { usePreferredDateTime } from "@/app/_hooks/usePreferredDateTime";
import { useTranslations } from "next-intl";

interface ProfileTabProps {
  user: UserData | null;
  isAdmin: boolean;
  setUser: React.Dispatch<React.SetStateAction<UserData | null>>;
  isSsoUser: boolean;
}

export const ProfileTab = ({
  user,
  isAdmin,
  setUser,
  isSsoUser,
}: ProfileTabProps) => {
  const t = useTranslations();
  const router = useRouter();
  const [editedUsername, setEditedUsername] = useState(user?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    user?.avatarUrl
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasFormChanged, setHasFormChanged] = useState(false);

  const { isDemoMode } = useAppMode();
  const { formatDateString } = usePreferredDateTime();

  useEffect(() => {
    setEditedUsername(user?.username || "");
    setAvatarUrl(user?.avatarUrl);
    setHasFormChanged(false);
  }, [user]);

  useEffect(() => {
    const hasChanges =
      editedUsername !== (user?.username || "") ||
      currentPassword !== "" ||
      newPassword !== "" ||
      confirmPassword !== "";
    setHasFormChanged(hasChanges);
  }, [
    editedUsername,
    currentPassword,
    newPassword,
    confirmPassword,
    user?.username,
  ]);

  useEffect(() => {
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    try {
      const result = await getApiKey();
      if (result.success) {
        setApiKey(result.data || null);
      }
    } catch (error) {
      console.error("Error loading API key:", error);
    }
  };

  const handleGenerateApiKey = async () => {
    setIsGenerating(true);
    try {
      const result = await generateApiKey();
      if (result.success && result.data) {
        setApiKey(result.data);
        setShowApiKey(true);
      }
    } catch (error) {
      console.error("Error generating API key:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyApiKey = async () => {
    if (apiKey) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(apiKey);
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = apiKey;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
        }
      } catch (error) {
        console.error("Failed to copy API key:", error);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!editedUsername.trim()) {
      setError(t('profile.usernameRequired'));
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError(t('profile.passwordsDoNotMatch'));
      return;
    }

    setError(null);

    try {
      const formData = new FormData();
      const originalUsername = user?.username;
      formData.append("newUsername", editedUsername);
      if (currentPassword) {
        formData.append("currentPassword", currentPassword);
      }
      if (newPassword) {
        formData.append("newPassword", newPassword);
      }
      if (avatarUrl !== undefined && avatarUrl !== "null") {
        formData.append("avatarUrl", avatarUrl);
      }

      const result = await updateProfile(formData);

      if (result.success) {
        setSuccess(t('profile.profileUpdated'));
        setUser((prev: UserType | null) =>
          prev
            ? { ...prev, username: editedUsername, avatarUrl: avatarUrl }
            : null
        );
        setNewPassword("");
        setConfirmPassword("");
        setCurrentPassword("");

        if (editedUsername !== originalUsername) {
          await logout();
          router.push("/");
        }

        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || t('profile.failedToUpdateProfile'));
      }
    } catch (error) {
      setError(t('profile.failedToUpdateProfileRetry'));
    }
  };

  const handleAvatarUpload = async (
    _iconType: keyof AppSettings | undefined,
    url: string
  ) => {
    setIsUploadingAvatar(true);
    try {
      setAvatarUrl(url);
      const formData = new FormData();
      formData.append("avatarUrl", url);
      formData.append("newUsername", editedUsername);
      const result = await updateProfile(formData);

      if (result.success) {
        setUser((prev: UserType | null) =>
          prev ? { ...prev, avatarUrl: url } : null
        );
        setSuccess(t('profile.avatarUpdated'));
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || t('profile.failedToUpdateAvatar'));
      }
    } catch (error) {
      setError(t('profile.failedToUpdateAvatarRetry'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      setAvatarUrl(undefined);
      const formData = new FormData();
      formData.append("avatarUrl", "");
      formData.append("newUsername", editedUsername);
      const result = await updateProfile(formData);

      if (result.success) {
        setUser((prev: UserType | null) =>
          prev ? { ...prev, avatarUrl: undefined } : null
        );
        setSuccess(t('profile.avatarRemoved'));
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || t('profile.failedToRemoveAvatar'));
      }
    } catch (error) {
      setError(t('profile.failedToRemoveAvatarRetry'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const isUsernameDisabled = isSsoUser || isDemoMode;
  const isSaveButtonDisabled =
    isUploadingAvatar || isDemoMode || !hasFormChanged;
  const isAvatarDisabled = isUploadingAvatar || isDemoMode;
  const isCurrentPasswordDisabled = isDemoMode;
  const isNewPasswordDisabled = isDemoMode;
  const isConfirmPasswordDisabled = isDemoMode;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('profile.usernameProfile', { username: user?.username || '' })}</h2>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="flex flex-col items-center gap-4 p-4 border border-border rounded-jotty">
            <UserAvatar
              username={editedUsername}
              avatarUrl={avatarUrl}
              size="lg"
              className="w-24 h-24 text-5xl"
            />
            {!isDemoMode && (
              <ImageUpload
                label={t("profile.avatar")}
                description={t("profile.uploadProfilePicture")}
                currentUrl={avatarUrl || ""}
                onUpload={handleAvatarUpload}
                customUploadAction={uploadUserAvatar}
              />
            )}
            {avatarUrl && (
              <Button
                variant="ghost"
                onClick={handleRemoveAvatar}
                disabled={isAvatarDisabled}
                className="text-destructive hover:bg-destructive/10"
              >
                {t('profile.removeAvatar')}
              </Button>
            )}
          </div>
        </div>
        <div className="md:col-span-2 space-y-4">
          <div className="space-y-4">
            <div className="md:flex md:items-center md:justify-between p-4 bg-muted/50 rounded-jotty">
              <div>
                <h3 className="font-medium">{t('profile.apiKey')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('profile.apiKeyDescription')}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2 mt-2 md:mt-0">
                {apiKey && (
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-sm bg-muted px-2 py-1 rounded">
                      {showApiKey ? apiKey : "••••••••••••••••"}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="h-8 w-8 p-0"
                      title={showApiKey ? t('profile.hideApiKey') : t('profile.showApiKey')}
                    >
                      {showApiKey ? (
                        <ViewOffSlashIcon className="h-4 w-4" />
                      ) : (
                        <ViewIcon className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyApiKey}
                      className="h-8 w-8 p-0"
                      title={t('profile.copyApiKey')}
                    >
                      <Copy01Icon className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {isDemoMode ? (
                  <span className="text-sm text-muted-foreground">
                    {t('settings.disabledInDemoMode')}
                  </span>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleGenerateApiKey}
                    disabled={isGenerating}
                    title={apiKey ? t('profile.regenerateApiKey') : t('profile.generateApiKey')}
                  >
                    {apiKey ? (
                      <RefreshIcon className="h-4 w-4" />
                    ) : (
                      <LockKeyIcon className="h-4 w-4 mr-2" />
                    )}
                    {isGenerating ? t('profile.generating') : apiKey ? "" : t('profile.generate')}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <FormWrapper
            title={t('common.profile')}
            action={
              <Button
                onClick={handleSaveProfile}
                title={t('profile.saveProfile')}
                disabled={isSaveButtonDisabled}
                size="sm"
              >
                {isDemoMode ? t('settings.disabledInDemoMode') : t('profile.saveProfile')}
              </Button>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t('profile.memberSince')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {user?.createdAt
                    ? formatDateString(user.createdAt)
                    : t('profile.unknown')}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t('profile.userType')}</p>
                <p className="text-sm text-muted-foreground">
                  {isAdmin ? t('common.admin') : t('common.user')}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Input
                id="username"
                label={t('common.username')}
                type="text"
                onChange={(e) => setEditedUsername(e.target.value)}
                placeholder={t('profile.yourUsername')}
                defaultValue={user?.username}
                disabled={isUsernameDisabled}
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground">
                {t('profile.usernameUpdateWarning')}
              </p>
            </div>
            <div className="space-y-2">
              <Input
                id="current-password"
                label={t('settings.currentPassword')}
                type="password"
                value={currentPassword}
                disabled={isCurrentPasswordDisabled}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('profile.enterCurrentPassword')}
              />
            </div>
            <div className="space-y-2">
              <Input
                id="new-password"
                label={t('settings.newPassword')}
                type="password"
                value={newPassword}
                disabled={isNewPasswordDisabled}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('profile.enterNewPassword')}
              />
            </div>
            <div className="space-y-2">
              <Input
                id="confirm-password"
                label={t('settings.confirmPassword')}
                type="password"
                disabled={isConfirmPasswordDisabled}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('profile.confirmNewPassword')}
              />
            </div>
          </FormWrapper>
        </div>
      </div>
    </div>
  );
};

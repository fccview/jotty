"use client";

import { Save, AlertCircle, Check, Shield } from "lucide-react";
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

interface ProfileTabProps {
  user: UserType | null;
  isAdmin: boolean;
  isLoading: boolean;
  setUser: React.Dispatch<React.SetStateAction<UserType | null>>;
  isSsoUser: boolean;
}

export const ProfileTab = ({
  user,
  isAdmin,
  isLoading,
  setUser,
  isSsoUser,
}: ProfileTabProps) => {
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
  const { isDemoMode } = useAppMode();

  useEffect(() => {
    setEditedUsername(user?.username || "");
    setAvatarUrl(user?.avatarUrl);
  }, [user]);

  const handleSaveProfile = async () => {
    if (!editedUsername.trim()) {
      setError("Username is required");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError("New passwords do not match");
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
      if (avatarUrl !== undefined) {
        formData.append("avatarUrl", avatarUrl);
      }

      const result = await updateProfile(formData);

      if (result.success) {
        setSuccess("Profile updated successfully!");
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
        setError(result.error || "Failed to update profile");
      }
    } catch (error) {
      setError("Failed to update profile. Please try again.");
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

      if (!result.success) {
        setError(result.error || "Failed to update avatar");
      }
    } catch (error) {
      setError("Failed to update avatar. Please try again.");
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
        setSuccess("Avatar removed successfully!");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to remove avatar");
      }
    } catch (error) {
      setError("Failed to remove avatar. Please try again.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const isUsernameDisabled = isLoading || isSsoUser || isDemoMode;
  const isSaveButtonDisabled = isLoading || isUploadingAvatar || isDemoMode;
  const isAvatarDisabled = isUploadingAvatar || isLoading || isDemoMode;
  const isCurrentPasswordDisabled = isLoading || isDemoMode;
  const isNewPasswordDisabled = isLoading || isDemoMode;
  const isConfirmPasswordDisabled = isLoading || isDemoMode;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Profile Information</h2>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="flex flex-col items-center gap-4 p-4 border border-border rounded-lg">
            <UserAvatar
              username={editedUsername}
              avatarUrl={avatarUrl}
              size="lg"
              className="w-24 h-24 text-5xl"
            />
            {!isDemoMode && (
              <ImageUpload
                label="Avatar"
                description="Upload a profile picture (PNG, JPG, WebP up to 5MB)"
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
                Remove Avatar
              </Button>
            )}
          </div>
        </div>
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                Member Since
              </p>
              <p className="text-sm text-muted-foreground">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">User Type</p>
              <p className="text-sm text-muted-foreground">
                {isAdmin ? "Admin" : "User"}
              </p>
            </div>
          </div>

          <div>
            <Input
              id="username"
              label="Username"
              type="text"
              value={editedUsername}
              onChange={(e) => setEditedUsername(e.target.value)}
              placeholder="Your username"
              defaultValue={user?.username}
              disabled={isUsernameDisabled}
              className="mt-1"
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-border mt-4">
            <h3 className="font-medium">Change Password</h3>

            <div>
              <Input
                id="current-password"
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="mt-1"
                disabled={isCurrentPasswordDisabled}
              />
            </div>

            <div>
              <Input
                id="new-password"
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (optional)"
                className="mt-1"
                disabled={isNewPasswordDisabled}
              />
            </div>

            <div>
              <Input
                id="confirm-password"
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="mt-1"
                disabled={isConfirmPasswordDisabled}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveProfile} disabled={isSaveButtonDisabled}>
              {isLoading ? (
                "Saving..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isDemoMode ? "Disabled in demo mode" : "Save Changes"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

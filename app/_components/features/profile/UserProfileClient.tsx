"use client";

import { useState, useEffect } from "react";
import { User, Settings, Monitor, ArrowLeft, Puzzle } from "lucide-react";
import { Button } from "@/app/_components/ui/elements/button";
import { User as UserType } from "@/app/_types";
import { getUserProfileAction } from "@/app/_server/actions/users/get-user-profile";
import { exportUserDataAction } from "@/app/_server/actions/users/export-data";
import { useRouter } from "next/navigation";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";
import { DeleteAccountModal } from "@/app/_components/ui/modals/user/DeleteAccountModal";
import { PrivacySettingsModal } from "@/app/_components/ui/modals/user/PrivacySettingsModal";
import { ProfileTab } from "./components/ProfileTab";
import { SessionsTab } from "./components/SessionsTab";
import { SettingsTab } from "./components/SettingsTab";
import { PluginsTab } from "./components/PluginsTab";

interface UserProfileClientProps {
  username: string;
  isAdmin: boolean;
}

export function UserProfileClient({
  username,
  isAdmin,
}: UserProfileClientProps) {
  const router = useRouter();
  const { checkNavigation } = useNavigationGuard();
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "profile" | "sessions" | "settings" | "plugins"
  >("profile");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    setIsLoading(true);
    try {
      const result = await getUserProfileAction();

      if (result.success && result.data) {
        const profileUser: UserType = {
          username: result.data.username,
          isAdmin: result.data.isAdmin,
          passwordHash: "",
          createdAt: result.data.createdAt,
          lastLogin: result.data.lastLogin,
        };
        setUser(profileUser);
        setEditedUsername(result.data.username);
      } else {
        console.error("Error loading user profile:", result.error);
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const result = await exportUserDataAction();

      if (result.success && result.data) {
        const dataStr = JSON.stringify(result.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `user-data-${username}-${new Date().toISOString().split("T")[0]
          }.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setSuccess("Data exported successfully!");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to export data");
      }
    } catch (error) {
      setError("Failed to export data");
    }
  };

  if (isLoading && !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => checkNavigation(() => router.push("/"))}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">User Profile</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>
        </div>
      </div>

      <div className="bg-muted p-1 rounded-lg">
        <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
          {[
            { id: "profile", label: "Profile", icon: User },
            { id: "sessions", label: "Sessions", icon: Monitor },
            { id: "settings", label: "Settings", icon: Settings },
            { id: "plugins", label: "Plugins", icon: Puzzle },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-[600px]">
        {activeTab === "profile" && (
          <ProfileTab
            user={user}
            username={username}
            isAdmin={isAdmin}
            isLoading={isLoading}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            editedUsername={editedUsername}
            setEditedUsername={setEditedUsername}
            currentPassword={currentPassword}
            setCurrentPassword={setCurrentPassword}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            error={error}
            setError={setError}
            success={success}
            setSuccess={setSuccess}
            setUser={setUser}
          />
        )}
        {activeTab === "sessions" && <SessionsTab username={username} />}
        {activeTab === "settings" && (
          <SettingsTab
            setShowDeleteModal={setShowDeleteModal}
            setShowPrivacyModal={setShowPrivacyModal}
          />
        )}
        {activeTab === "plugins" && (
          <PluginsTab
            username={username}
            isAdmin={isAdmin}
          />
        )}
      </div>

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />

      <PrivacySettingsModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
    </div>
  );
}

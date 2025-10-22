"use client";

import { useState, useEffect } from "react";
import { User, Settings, Monitor, ArrowLeft } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { User as UserType } from "@/app/_types";
import { useRouter } from "next/navigation";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";
import { DeleteAccountModal } from "@/app/_components/GlobalComponents/Modals/UserModals/DeleteAccountModal";
import { ProfileTab } from "./Parts/ProfileTab";
import { SessionsTab } from "./Parts/SessionsTab";
import { SettingsTab } from "./Parts/SettingsTab";
import { getCurrentUser } from "@/app/_server/actions/users";

interface UserProfileClientProps {
  isSsoUser: boolean;
  isAdmin: boolean;
  avatarUrl?: string | null;
}

export const UserProfileClient = ({
  isSsoUser,
  isAdmin,
  avatarUrl,
}: UserProfileClientProps) => {
  const router = useRouter();
  const { checkNavigation } = useNavigationGuard();
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "profile" | "sessions" | "settings"
  >("profile");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    setIsLoading(true);
    try {
      const result = await getCurrentUser();

      if (result?.username) {
        const profileUser: UserType = {
          username: result.username,
          isAdmin: result.isAdmin,
          passwordHash: "",
          createdAt: result.createdAt,
          lastLogin: result.lastLogin,
          avatarUrl: result.avatarUrl,
        };
        setUser(profileUser);
      } else {
        console.error("Error loading user profile:", result);
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    } finally {
      setIsLoading(false);
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
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.id as "profile" | "sessions" | "settings")}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors whitespace-nowrap flex-shrink-0"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="min-h-[600px]">
        {activeTab === "profile" && (
          <ProfileTab
            user={user}
            isAdmin={isAdmin}
            isLoading={isLoading}
            setUser={setUser}
            isSsoUser={isSsoUser}
          />
        )}
        {activeTab === "sessions" && <SessionsTab />}
        {activeTab === "settings" && (
          <SettingsTab setShowDeleteModal={setShowDeleteModal} />
        )}
      </div>

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />
    </div>
  );
};

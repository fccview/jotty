"use client";

import { useState, useEffect } from "react";
import { User, Settings, Monitor, Archive } from "lucide-react";
import { SiteHeader } from "@/app/_components/GlobalComponents/Layout/SiteHeader";
import { User as UserType, Category } from "@/app/_types";
import { useRouter } from "next/navigation";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";
import { DeleteAccountModal } from "@/app/_components/GlobalComponents/Modals/UserModals/DeleteAccountModal";
import { ProfileTab } from "./Parts/ProfileTab";
import { SessionsTab } from "./Parts/SessionsTab";
import { SettingsTab } from "./Parts/SettingsTab";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { Button } from "../../GlobalComponents/Buttons/Button";
import { ArchiveTab } from "./Parts/ArchiveTab";
import { ArchivedItem } from "@/app/_server/actions/archived";

interface UserProfileClientProps {
  isSsoUser: boolean;
  isAdmin: boolean;
  avatarUrl?: string | null;
  archivedItems: ArchivedItem[];
  listsCategories: Category[];
  notesCategories: Category[];
}

export const UserProfileClient = ({
  isSsoUser,
  isAdmin,
  avatarUrl,
  archivedItems,
  listsCategories,
  notesCategories,
}: UserProfileClientProps) => {
  const { user } = useAppMode();
  const [activeTab, setActiveTab] = useState<
    "profile" | "sessions" | "archive" | "settings"
  >("profile");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <div className="space-y-6">
      <SiteHeader
        title="User Profile"
        description="Manage your account settings and preferences"
      />

      <div className="bg-muted p-1 rounded-lg">
        <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
          {[
            { id: "profile", label: "Profile", icon: User },
            { id: "sessions", label: "Sessions", icon: Monitor },
            { id: "archive", label: "Archive", icon: Archive },
            { id: "settings", label: "Settings", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() =>
                  setActiveTab(
                    tab.id as "profile" | "sessions" | "archive" | "settings"
                  )
                }
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
            setUser={() => {}}
            isSsoUser={isSsoUser}
          />
        )}
        {activeTab === "sessions" && <SessionsTab />}
        {activeTab === "archive" && (
          <ArchiveTab
            user={user}
            archivedItems={archivedItems}
            listsCategories={listsCategories}
            notesCategories={notesCategories}
          />
        )}
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

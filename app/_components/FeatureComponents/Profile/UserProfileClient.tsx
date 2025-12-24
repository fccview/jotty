"use client";

import { useState, useEffect } from "react";
import {
  UserIcon,
  Tv02Icon,
  SharedWifiIcon,
  LockKeyIcon,
  Archive02Icon,
  Settings01Icon,
  Activity03Icon,
} from "hugeicons-react";
import { SiteHeader } from "@/app/_components/GlobalComponents/Layout/SiteHeader";
import { Category } from "@/app/_types";
import { DeleteAccountModal } from "@/app/_components/GlobalComponents/Modals/UserModals/DeleteAccountModal";
import { ProfileTab } from "./Parts/ProfileTab";
import { SessionsTab } from "./Parts/SessionsTab";
import { UserPreferencesTab } from "./Parts/UserPreferencesTab";
import { EncryptionTab } from "./Parts/EncryptionTab";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { Button } from "../../GlobalComponents/Buttons/Button";
import { ArchiveTab } from "./Parts/ArchiveTab";
import { ArchivedItem } from "@/app/_server/actions/archived";
import { LinkIndex } from "@/app/_server/actions/link";
import { LinksTab } from "@/app/_components/FeatureComponents/Profile/Parts/LinksTab";
import { AuditLogsTab } from "@/app/_components/FeatureComponents/Profile/Parts/AuditLogsTab";
import { ProfileTabs } from "@/app/_types/enums";
import { useTranslations } from "next-intl";

interface UserProfileClientProps {
  isSsoUser: boolean;
  isAdmin: boolean;
  archivedItems: ArchivedItem[];
  listsCategories: Category[];
  notesCategories: Category[];
  linkIndex: LinkIndex;
}

export const UserProfileClient = ({
  isSsoUser,
  isAdmin,
  archivedItems,
  listsCategories,
  notesCategories,
  linkIndex,
}: UserProfileClientProps) => {
  const t = useTranslations();
  const { user, appSettings } = useAppMode();
  const [activeTab, setActiveTab] = useState<ProfileTabs>(ProfileTabs.PROFILE);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const handleTabChange = (newTab: ProfileTabs) => {
    setActiveTab(newTab);
    if (typeof window !== "undefined") {
      window.location.hash = newTab;
    }
  };

  useEffect(() => {
    setIsHydrated(true);
    const hash = window.location.hash.replace("#", "");
    const validTabs = Object.values(ProfileTabs);
    if (validTabs.includes(hash as ProfileTabs)) {
      setActiveTab(hash as ProfileTabs);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      const validTabs = Object.values(ProfileTabs);
      if (validTabs.includes(hash as ProfileTabs)) {
        setActiveTab(hash as ProfileTabs);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [isHydrated]);

  return (
    <div className="space-y-6">
      <SiteHeader
        title={t('profile.userProfile')}
        description={t('profile.manageAccount')}
      />

      <div className="bg-muted p-1 rounded-jotty">
        <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
          {[
            { id: ProfileTabs.PROFILE, label: t('profile.profileTab'), icon: UserIcon },
            { id: ProfileTabs.SESSIONS, label: t('profile.sessionsTab'), icon: Tv02Icon },
            { id: ProfileTabs.ARCHIVE, label: t('profile.archiveTab'), icon: Archive02Icon },
            ...(appSettings?.editor?.enableBilateralLinks
              ? [
                {
                  id: ProfileTabs.CONNECTIONS,
                  label: t('profile.connectionsTab'),
                  icon: SharedWifiIcon,
                },
              ]
              : []),
            {
              id: ProfileTabs.ENCRYPTION,
              label: t('profile.encryptionTab'),
              icon: LockKeyIcon,
            },
            {
              id: ProfileTabs.USER_PREFERENCES,
              label: t('profile.userPreferencesTab'),
              icon: Settings01Icon,
            },
            {
              id: ProfileTabs.AUDIT_LOGS,
              label: t('profile.auditLogsTab'),
              icon: Activity03Icon,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => handleTabChange(tab.id as ProfileTabs)}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-jotty transition-colors whitespace-nowrap flex-shrink-0"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="min-h-[600px]">
        {activeTab === ProfileTabs.PROFILE && (
          <ProfileTab
            user={user}
            isAdmin={isAdmin}
            setUser={() => { }}
            isSsoUser={isSsoUser}
          />
        )}
        {activeTab === ProfileTabs.SESSIONS && <SessionsTab />}
        {activeTab === ProfileTabs.ARCHIVE && (
          <ArchiveTab
            user={user}
            archivedItems={archivedItems}
            listsCategories={listsCategories}
            notesCategories={notesCategories}
          />
        )}
        {activeTab === ProfileTabs.CONNECTIONS && (
          <LinksTab linkIndex={linkIndex} />
        )}
        {activeTab === ProfileTabs.ENCRYPTION && <EncryptionTab />}
        {activeTab === ProfileTabs.USER_PREFERENCES && (
          <UserPreferencesTab
            setShowDeleteModal={setShowDeleteModal}
            noteCategories={notesCategories}
          />
        )}
        {activeTab === ProfileTabs.AUDIT_LOGS && <AuditLogsTab />}
      </div>

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />
    </div>
  );
};

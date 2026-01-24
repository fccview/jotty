"use client";

import {
  CheckmarkSquare04Icon,
  File02Icon,
  Globe02Icon,
  UserMultipleIcon,
} from "hugeicons-react";
import { AdminSharedItemsList } from "@/app/_components/FeatureComponents/Admin/Parts/Sharing/AdminSharedItemsList";
import {
  calculateMostActiveSharers,
  useThemeColors,
} from "@/app/_components/FeatureComponents/Admin/Parts/Sharing/AdminSharingFunctions";
import { ItemType } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { unshareWith } from "@/app/_server/actions/sharing";
import { getCurrentUser } from "@/app/_server/actions/users";
import { ItemTypes } from "@/app/_types/enums";
import { useMemo } from "react";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { useTranslations } from "next-intl";
import { useToast } from "@/app/_providers/ToastProvider";

export const AdminSharing = () => {
  const t = useTranslations();
  const { showToast } = useToast();
  const { allSharedItems, globalSharing: rawGlobalSharing, user, appSettings } = useAppMode();
  const colors = useThemeColors();

  const handleUnsharePublicItem = async (
    item: { id: string; category: string },
    itemType: ItemType
  ) => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      await unshareWith(
        item.id,
        item.category,
        currentUser.username,
        "public",
        itemType
      );

      window.location.reload();
    } catch (error) {
      console.error("Error unsharing public item:", error);
      showToast({
        type: "error",
        title: t("common.error"),
        message: "Failed to unshare public item",
      });
    }
  };

  const isSuperAdmin = user?.isSuperAdmin || false;
  const adminContentAccess = appSettings?.adminContentAccess || "yes";
  const hasContentAccess = isSuperAdmin || adminContentAccess !== "no";

  const totalSharedChecklists = allSharedItems?.checklists.length || 0;
  const totalSharedNotes = allSharedItems?.notes.length || 0;
  const totalPublicShares =
    (allSharedItems?.public.checklists.length || 0) +
    (allSharedItems?.public.notes.length || 0);

  const totalSharingRelationships =
    Object.values(rawGlobalSharing?.checklists || {}).reduce(
      (sum: number, entries) =>
        sum + (Array.isArray(entries) ? entries.length : 0),
      0
    ) +
    Object.values(rawGlobalSharing?.notes || {}).reduce(
      (sum: number, entries) =>
        sum + (Array.isArray(entries) ? entries.length : 0),
      0
    );

  const mostActiveSharers = useMemo(
    () => calculateMostActiveSharers(rawGlobalSharing),
    [rawGlobalSharing]
  );

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div className="rounded-md border bg-card p-6 shadow-sm">
          <div className="space-y-2 mb-6">
            <h3 className="text-lg font-semibold">{t('admin.sharingOverview')}</h3>
            <p className="text-md lg:text-sm text-muted-foreground">
              {t('admin.detailedSharingBreakdown')}
            </p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-jotty p-4">
                <div className="text-2xl font-bold text-primary">
                  {Object.keys(rawGlobalSharing?.checklists || {}).length}
                </div>
                <div className="text-md lg:text-sm text-muted-foreground">
                  {t('admin.activeChecklistSharers')}
                </div>
              </div>
              <div className="bg-muted/50 rounded-jotty p-4">
                <div className="text-2xl font-bold text-primary">
                  {Object.keys(rawGlobalSharing?.notes || {}).length}
                </div>
                <div className="text-md lg:text-sm text-muted-foreground">
                  {t('admin.activeNotesSharers')}
                </div>
              </div>
              <div className="bg-muted/50 rounded-jotty p-4">
                <div className="text-2xl font-bold text-primary">
                  {totalSharingRelationships}
                </div>
                <div className="text-md lg:text-sm text-muted-foreground">
                  {t('admin.totalSharing')}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">{t('admin.topContributors')}</h4>
              <div className="overflow-hidden rounded-jotty border">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-md lg:text-sm font-medium">{t('common.user')}</th>
                      <th className="px-4 py-3 text-left text-md lg:text-sm font-medium">
                        {t('admin.itemsShared')}
                      </th>
                      <th className="px-4 py-3 text-left text-md lg:text-sm font-medium">
                        {t('admin.activityLevel')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {mostActiveSharers.slice(0, 8).map((sharer, index) => (
                      <tr key={sharer.username} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-3">
                            <UserAvatar size="sm" username={sharer.username} />
                            <span className="font-medium">
                              {sharer.username}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-primary">
                            {sharer.sharedCount}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{
                                  width: `${Math.min(
                                    (sharer.sharedCount /
                                      mostActiveSharers[0].sharedCount) *
                                    100,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                            <span className="text-md lg:text-xs text-muted-foreground">
                              {sharer.sharedCount >
                                mostActiveSharers[0].sharedCount * 0.8
                                ? t('common.high')
                                : sharer.sharedCount >
                                  mostActiveSharers[0].sharedCount * 0.5
                                  ? t('common.medium')
                                  : t('common.low')}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold">{t('admin.sharedCMS')}</h2>
        {!hasContentAccess && (
          <div className="bg-muted border border-border rounded-jotty p-4 flex items-start gap-3">
            <Globe02Icon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-md lg:text-sm font-medium text-foreground">
                {t('admin.contentHidden')}
              </p>
              <p className="text-md lg:text-xs text-muted-foreground mt-1">
                {t('admin.noSharingPermissionsLabel')}
              </p>
            </div>
          </div>
        )}
        {hasContentAccess && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="rounded-md border bg-card p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="rounded-jotty bg-primary/10 p-2">
                    <CheckmarkSquare04Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{t('checklists.sharedChecklists')}</h4>
                    <p className="text-md lg:text-sm text-muted-foreground">
                      {totalSharedChecklists} {t('checklists.title')}
                    </p>
                  </div>
                </div>
                <AdminSharedItemsList items={allSharedItems?.checklists || []} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-md border bg-card p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="rounded-jotty bg-primary/10 p-2">
                    <File02Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{t('notes.sharedNotes')}</h4>
                    <p className="text-md lg:text-sm text-muted-foreground">
                      {totalSharedNotes} {t('notes.title')}
                    </p>
                  </div>
                </div>
                <AdminSharedItemsList items={allSharedItems?.notes || []} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-md border bg-card p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="rounded-jotty bg-primary/10 p-2">
                    <Globe02Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{t('sharing.publicShares')}</h4>
                    <p className="text-md lg:text-sm text-muted-foreground">
                      {t('admin.totalPublicItems', { count: totalPublicShares })}
                    </p>
                  </div>
                </div>
                <AdminSharedItemsList
                  items={[
                    ...(allSharedItems?.public.checklists || []),
                    ...(allSharedItems?.public.notes || []),
                  ]}
                  onUnshare={(item) => {
                    const isChecklist = allSharedItems?.public.checklists.some(
                      (c) => c.id === item.id && c.category === item.category
                    );
                    handleUnsharePublicItem(
                      item,
                      isChecklist ? ItemTypes.CHECKLIST : ItemTypes.NOTE
                    );
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

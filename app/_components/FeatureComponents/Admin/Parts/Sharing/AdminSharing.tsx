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
  const {
    allSharedItems,
    globalSharing: rawGlobalSharing,
    user,
    appSettings,
  } = useAppMode();
  const colors = useThemeColors();

  const handleUnsharePublicItem = async (
    item: { id: string; category: string },
    itemType: ItemType,
  ) => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      await unshareWith(
        item.id,
        item.category,
        currentUser.username,
        "public",
        itemType,
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
      0,
    ) +
    Object.values(rawGlobalSharing?.notes || {}).reduce(
      (sum: number, entries) =>
        sum + (Array.isArray(entries) ? entries.length : 0),
      0,
    );

  const mostActiveSharers = useMemo(
    () => calculateMostActiveSharers(rawGlobalSharing),
    [rawGlobalSharing],
  );

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div className="rounded-md border bg-card p-6 shadow-sm">
          <div className="space-y-2 mb-6">
            <h3 className="text-lg font-semibold">
              {t("admin.sharingOverview")}
            </h3>
            <p className="text-md lg:text-sm text-muted-foreground">
              {t("admin.detailedSharingBreakdown")}
            </p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-jotty p-4">
                <div className="text-2xl font-bold text-primary">
                  {Object.keys(rawGlobalSharing?.checklists || {}).length}
                </div>
                <div className="text-md lg:text-sm text-muted-foreground">
                  {t("admin.activeChecklistSharers")}
                </div>
              </div>
              <div className="bg-muted/50 rounded-jotty p-4">
                <div className="text-2xl font-bold text-primary">
                  {Object.keys(rawGlobalSharing?.notes || {}).length}
                </div>
                <div className="text-md lg:text-sm text-muted-foreground">
                  {t("admin.activeNotesSharers")}
                </div>
              </div>
              <div className="bg-muted/50 rounded-jotty p-4">
                <div className="text-2xl font-bold text-primary">
                  {totalSharingRelationships}
                </div>
                <div className="text-md lg:text-sm text-muted-foreground">
                  {t("admin.totalSharing")}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">{t("admin.topContributors")}</h4>
              <div className="overflow-hidden rounded-jotty border">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-md lg:text-sm font-medium">
                        {t("common.user")}
                      </th>
                      <th className="px-4 py-3 text-left text-md lg:text-sm font-medium">
                        {t("admin.itemsShared")}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

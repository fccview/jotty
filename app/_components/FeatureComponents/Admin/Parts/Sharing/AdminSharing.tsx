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
  transformGlobalSharingToNetworkData,
  useThemeColors,
} from "@/app/_components/FeatureComponents/Admin/Parts/Sharing/AdminSharingFunctions";
import { ItemType } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { unshareWith } from "@/app/_server/actions/sharing";
import { getCurrentUser } from "@/app/_server/actions/users";
import { ItemTypes } from "@/app/_types/enums";
import { useMemo } from "react";
import { ActiveSharersBarChart } from "./ActiveSharersBarChart";
import { ShareTypePieChart } from "./ShareTypePieChart";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";

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
    alert("Failed to unshare public item");
  }
};

export const AdminSharing = () => {
  const { allSharedItems, globalSharing: rawGlobalSharing } = useAppMode();
  const colors = useThemeColors();

  const totalSharedChecklists = allSharedItems?.checklists.length || 0;
  const totalSharedNotes = allSharedItems?.notes.length || 0;
  const totalPublicShares =
    (allSharedItems?.public.checklists.length || 0) +
    (allSharedItems?.public.notes.length || 0);

  const totalUniqueSharedItems =
    totalSharedChecklists + totalSharedNotes + totalPublicShares;

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

  const pieChartData = useMemo(
    () => [
      { name: "Checklists", value: totalSharedChecklists },
      { name: "Notes", value: totalSharedNotes },
    ],
    [totalSharedChecklists, totalSharedNotes]
  );

  const networkData = useMemo(
    () => transformGlobalSharingToNetworkData(rawGlobalSharing, colors),
    [rawGlobalSharing, colors]
  );

  const stats = [
    {
      title: "Shared Checklists",
      value: totalSharedChecklists,
      icon: (
        <CheckmarkSquare04Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
      ),
    },
    {
      title: "Shared Notes",
      value: totalSharedNotes,
      icon: <File02Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    },
    {
      title: "Public Shares",
      value: totalPublicShares,
      icon: <Globe02Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    },
    {
      title: "Total Shares",
      value: totalUniqueSharedItems,
      icon: <UserMultipleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div className="rounded-md border bg-card p-6 shadow-sm">
          <div className="space-y-2 mb-6">
            <h3 className="text-lg font-semibold">Sharing Activity Overview</h3>
            <p className="text-sm text-muted-foreground">
              Detailed breakdown of sharing patterns and user engagement
            </p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-jotty p-4">
                <div className="text-2xl font-bold text-primary">
                  {Object.keys(rawGlobalSharing?.checklists || {}).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Active Checklist Sharers
                </div>
              </div>
              <div className="bg-muted/50 rounded-jotty p-4">
                <div className="text-2xl font-bold text-primary">
                  {Object.keys(rawGlobalSharing?.notes || {}).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Active Note Sharers
                </div>
              </div>
              <div className="bg-muted/50 rounded-jotty p-4">
                <div className="text-2xl font-bold text-primary">
                  {totalSharingRelationships}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Sharing Actions
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Top Contributors</h4>
              <div className="overflow-hidden rounded-jotty border">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        Items Shared
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        Activity Level
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
                            <span className="text-xs text-muted-foreground">
                              {sharer.sharedCount >
                              mostActiveSharers[0].sharedCount * 0.8
                                ? "High"
                                : sharer.sharedCount >
                                  mostActiveSharers[0].sharedCount * 0.5
                                ? "Medium"
                                : "Low"}
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
        <h2 className="text-xl font-semibold">Shared Content Management</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="rounded-md border bg-card p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-4">
                <div className="rounded-jotty bg-primary/10 p-2">
                  <CheckmarkSquare04Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">Shared Checklists</h4>
                  <p className="text-sm text-muted-foreground">
                    {totalSharedChecklists} checklists
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
                  <h4 className="font-semibold">Shared Notes</h4>
                  <p className="text-sm text-muted-foreground">
                    {totalSharedNotes} notes
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
                  <h4 className="font-semibold">Public Shares</h4>
                  <p className="text-sm text-muted-foreground">
                    {totalPublicShares} public items
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
      </section>
    </div>
  );
};

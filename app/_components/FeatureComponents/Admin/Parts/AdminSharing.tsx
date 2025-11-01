"use client";

import { CheckSquare, FileText, Globe, Users } from "lucide-react";
import { StatCard } from "@/app/_components/GlobalComponents/Cards/StatCard";
import { AdminSharedItemsList } from "@/app/_components/FeatureComponents/Admin/Parts/AdminSharedItemsList";
import { MostActiveSharer } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { unshareWith } from "@/app/_server/actions/sharing";
import { getCurrentUser } from "@/app/_server/actions/users";
import { decodeCategoryPath, encodeCategoryPath } from "@/app/_utils/global-utils";

const calculateMostActiveSharers = (globalSharing: any) => {
  const sharerCounts: Record<string, number> = {};

  Object.values(globalSharing?.checklists || {}).forEach((entries: any) => {
    if (Array.isArray(entries)) {
      entries.forEach((entry: any) => {
        sharerCounts[entry.sharer] = (sharerCounts[entry.sharer] || 0) + 1;
      });
    }
  });

  Object.values(globalSharing?.notes || {}).forEach((entries: any) => {
    if (Array.isArray(entries)) {
      entries.forEach((entry: any) => {
        sharerCounts[entry.sharer] = (sharerCounts[entry.sharer] || 0) + 1;
      });
    }
  });

  return Object.entries(sharerCounts)
    .map(([username, sharedCount]) => ({ username, sharedCount }))
    .sort((a, b) => b.sharedCount - a.sharedCount)
    .slice(0, 5);
};

const handleUnsharePublicItem = async (item: { id: string; category: string }, itemType: "checklist" | "note") => {
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

  const totalSharedChecklists = allSharedItems?.checklists.length || 0;
  const totalSharedNotes = allSharedItems?.notes.length || 0;
  const totalSharingRelationships = totalSharedChecklists + totalSharedNotes;
  const totalPublicShares = (allSharedItems?.public.checklists.length || 0) + (allSharedItems?.public.notes.length || 0);

  const mostActiveSharers = calculateMostActiveSharers(rawGlobalSharing);


  const sharingStats = {
    totalSharedChecklists,
    totalSharedNotes,
    totalSharingRelationships,
    mostActiveSharers,
    totalPublicShares,
  };

  const stats = [
    {
      title: "Shared Checklists",
      value: sharingStats?.totalSharedChecklists,
      icon: <CheckSquare className="h-6 w-6 text-primary" />,
    },
    {
      title: "Shared Notes",
      value: sharingStats?.totalSharedNotes,
      icon: <FileText className="h-6 w-6 text-primary" />,
    },
    {
      title: "Public Shares",
      value: sharingStats?.totalPublicShares,
      icon: <Globe className="h-6 w-6 text-primary" />,
    },
    {
      title: "Total Shares",
      value: sharingStats?.totalSharingRelationships,
      icon: <Users className="h-6 w-6 text-primary" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Global Sharing Overview</h2>
        <div className="text-sm text-muted-foreground">
          {sharingStats?.totalSharingRelationships || 0} total sharing
          relationships
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value || 0}
            icon={stat.icon}
          />
        ))}
      </div>

      {sharingStats?.mostActiveSharers?.length > 0 && (
        <div className="p-6 rounded-lg border border-border bg-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Most Active Sharers
          </h3>
          <div className="space-y-2">
            {sharingStats.mostActiveSharers.map(
              (sharer: MostActiveSharer, index: number) => (
                <div
                  key={sharer.username}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      #{index + 1}
                    </span>
                    <span className="font-medium text-foreground">
                      {sharer.username}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {sharer.sharedCount} item
                    {sharer.sharedCount !== 1 ? "s" : ""} shared
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AdminSharedItemsList
          title="Checklists"
          items={allSharedItems?.checklists || []}
          icon={<CheckSquare className="h-5 w-5" />}
        />
        <AdminSharedItemsList
          title="Notes"
          items={allSharedItems?.notes || []}
          icon={<FileText className="h-5 w-5" />}
        />
        <AdminSharedItemsList
          title="Public Shares"
          items={[...(allSharedItems?.public.checklists || []), ...(allSharedItems?.public.notes || [])]}
          icon={<Globe className="h-5 w-5" />}
          onUnshare={(item) => {
            const isChecklist = allSharedItems?.public.checklists.some(c => c.id === item.id && c.category === item.category);
            handleUnsharePublicItem(item, isChecklist ? "checklist" : "note");
          }}
        />
      </div>
    </div>
  );
};

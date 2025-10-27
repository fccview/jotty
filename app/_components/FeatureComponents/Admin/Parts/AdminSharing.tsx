"use client";

import { CheckSquare, FileText, Globe, Users } from "lucide-react";
import { StatCard } from "@/app/_components/GlobalComponents/Cards/StatCard";
import { AdminSharedItemsList } from "@/app/_components/FeatureComponents/Admin/Parts/AdminSharedItemsList";
import { GlobalSharing, MostActiveSharer } from "@/app/_types";
import { useTranslations } from "next-intl";

interface AdminSharingProps {
  globalSharing: GlobalSharing;
}

export const AdminSharing = ({ globalSharing }: AdminSharingProps) => {
  const { sharingStats, allSharedChecklists, allSharedNotes } = globalSharing;
  const t = useTranslations();

  const stats = [
    {
      title: t("admin.sharing.shared_checklists"),
      value: sharingStats?.totalSharedChecklists,
      icon: <CheckSquare className="h-6 w-6 text-primary" />,
    },
    {
      title: t("admin.sharing.shared_notes"),
      value: sharingStats?.totalSharedNotes,
      icon: <FileText className="h-6 w-6 text-primary" />,
    },
    {
      title: t("admin.sharing.public_shares"),
      value: sharingStats?.totalPublicShares,
      icon: <Globe className="h-6 w-6 text-primary" />,
    },
    {
      title: t("admin.sharing.total_shares"),
      value: sharingStats?.totalSharingRelationships,
      icon: <Users className="h-6 w-6 text-primary" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("admin.sharing.global_sharing_overview")}</h2>
        <div className="text-sm text-muted-foreground">
          {sharingStats?.totalSharingRelationships || 0} {t("admin.sharing.total_sharing_relationships")}
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
            {t("admin.sharing.most_active_sharers")}
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
                    {t("admin.sharing.items_shared", { count: sharer.sharedCount })}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminSharedItemsList
          title={t("checklists.title")}
          items={allSharedChecklists}
          icon={<CheckSquare className="h-5 w-5" />}
        />
        <AdminSharedItemsList
          title={t("notes.title")}
          items={allSharedNotes}
          icon={<FileText className="h-5 w-5" />}
        />
      </div>
    </div>
  );
};

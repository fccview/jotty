"use client";

import {
  Users,
  FileText,
  CheckSquare,
  Shield,
  Share2,
  Package,
} from "lucide-react";
import { StatCard } from "@/app/_components/GlobalComponents/Cards/StatCard";
import { ReactNode } from "react";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useTranslations } from "next-intl";

interface AdminStats {
  totalUsers: number;
  totalChecklists: number;
  totalNotes: number;
  adminUsers: number;
}

interface AdminOverviewProps {
  stats: AdminStats;
}

export const AdminOverview = ({ stats }: AdminOverviewProps) => {
  const { appVersion } = useAppMode();
  const t = useTranslations();

  const statCards = [
    {
      title: t("overview.app_version"),
      value: appVersion || "",
      icon: <Package className="h-6 w-6 text-primary" />,
    },
    {
      title: t("overview.total_users"),
      value: stats.totalUsers,
      icon: <Users className="h-6 w-6 text-primary" />,
    },
    {
      title: t("overview.admin_users"),
      value: stats.adminUsers,
      icon: <Shield className="h-6 w-6 text-primary" />,
    },
    {
      title: t("overview.total_checklists"),
      value: stats.totalChecklists,
      icon: <CheckSquare className="h-6 w-6 text-primary" />,
    },
    {
      title: t("overview.total_notes"),
      value: stats.totalNotes,
      icon: <FileText className="h-6 w-6 text-primary" />,
    },
    {
      title: t("overview.shared_checklists"),
      value: stats.sharedChecklists,
      icon: <CheckSquare className="h-6 w-6 text-primary" />,
    },
    {
      title: t("overview.shared_notes"),
      value: stats.sharedNotes,
      icon: <FileText className="h-6 w-6 text-primary" />,
    },
    {
      title: t("overview.total_shares"),
      value: stats.totalSharingRelationships,
      icon: <Share2 className="h-6 w-6 text-primary" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t("overview.system_overview")}
        </h2>
        <p className="text-muted-foreground">
          {t("overview.system_overview_description")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(
          (card: {
            title: string;
            value: string | number;
            icon: ReactNode;
          }) => (
            <StatCard
              key={card.title}
              title={card.title}
              value={card.value}
              icon={card.icon}
            />
          )
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-lg border border-border bg-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {t("overview.user_distribution")}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                {t("overview.regular_users")}
              </span>
              <span className="font-medium">
                {stats.totalUsers - stats.adminUsers}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                {t("overview.admin_users")}
              </span>
              <span className="font-medium">{stats.adminUsers}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{
                  width: `${(stats.adminUsers / stats.totalUsers) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {t("overview.content_overview")}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                {t("overview.total_content")}
              </span>
              <span className="font-medium">
                {stats.totalChecklists + stats.totalNotes}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                {t("overview.shared_items")}
              </span>
              <span className="font-medium">
                {stats.sharedChecklists + stats.sharedNotes}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                {t("overview.sharing_relationships")}
              </span>
              <span className="font-medium">
                {stats.totalSharingRelationships}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{
                  width: `${
                    ((stats.sharedChecklists + stats.sharedNotes) /
                      (stats.totalChecklists + stats.totalNotes)) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

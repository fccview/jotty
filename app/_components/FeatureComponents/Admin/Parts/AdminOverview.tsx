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

  const statCards = [
    {
      title: "App Version",
      value: appVersion || "",
      icon: <Package className="h-6 w-6 text-primary" />,
    },
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: <Users className="h-6 w-6 text-primary" />,
    },
    {
      title: "Admin Users",
      value: stats.adminUsers,
      icon: <Shield className="h-6 w-6 text-primary" />,
    },
    {
      title: "Total Checklists",
      value: stats.totalChecklists,
      icon: <CheckSquare className="h-6 w-6 text-primary" />,
    },
    {
      title: "Total Notes",
      value: stats.totalNotes,
      icon: <FileText className="h-6 w-6 text-primary" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          System Overview
        </h2>
        <p className="text-muted-foreground">
          Monitor your application&apos;s usage and user activity.
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
            User Distribution
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Regular Users</span>
              <span className="font-medium">
                {stats.totalUsers - stats.adminUsers}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Admin Users</span>
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
            Content Overview
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Content</span>
              <span className="font-medium">
                {stats.totalChecklists + stats.totalNotes}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

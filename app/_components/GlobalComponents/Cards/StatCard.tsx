import { ReactNode } from "react";

export const StatCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon: ReactNode;
}) => (
  <div className="jotty-stat-card px-2 py-4 lg:px-4 rounded-jotty border border-border bg-card">
    <div className="flex items-center justify-start gap-4">
      <div className="p-2 bg-secondary rounded-jotty">{icon}</div>
      <div className="jotty-stat-card-content">
        <p className="text-md lg:text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  </div>
);

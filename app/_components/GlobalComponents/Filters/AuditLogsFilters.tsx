"use client";

import { AuditLogFilters, AuditLogLevel, AuditCategory } from "@/app/_types";
import { useTranslations } from "next-intl";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { useAppMode } from "@/app/_providers/AppModeProvider";

interface AuditLogsFiltersProps {
  filters: AuditLogFilters;
  onFiltersChange: (filters: AuditLogFilters) => void;
  showUserFilter?: boolean;
}

export const AuditLogsFilters = ({
  filters,
  onFiltersChange,
  showUserFilter = false,
}: AuditLogsFiltersProps) => {
  const t = useTranslations();
  const { usersPublicData } = useAppMode();

  const levels: AuditLogLevel[] = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"];
  const categories: AuditCategory[] = [
    "auth",
    "user",
    "checklist",
    "note",
    "sharing",
    "settings",
    "encryption",
    "api",
    "system",
  ];

  const levelOptions = [
    { id: "", name: t("auditLogs.allLevels") },
    ...levels.map((level) => ({ id: level, name: level })),
  ];

  const categoryOptions = [
    { id: "", name: t("auditLogs.allCategories") },
    ...categories.map((category) => {
      const key = category === "user" ? "userManagement" : category;
      return {
        id: category,
        name: t(`auditLogs.${key}` as any) || t(`common.${category}` as any) || category,
      };
    }),
  ];

  const userOptions = [
    { id: "", name: t("common.all") + " " + t("common.users") },
    ...(usersPublicData || [])
      .map((user) => ({
        id: user.username || "",
        name: user.username || "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  ];

  const handleChange = (key: keyof AuditLogFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value || undefined });
  };

  return (
    <div className="bg-primary/5 rounded-jotty p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {showUserFilter && (
          <div>
            <label className="text-md lg:text-sm font-medium mb-2 block">
              {t("common.user")}
            </label>
            <Dropdown
              value={filters.username || ""}
              options={userOptions}
              onChange={(value) => handleChange("username", value)}
              placeholder={t("common.all") + " " + t("common.users")}
            />
          </div>
        )}

        <div>
          <label className="text-md lg:text-sm font-medium mb-2 block">
            {t("auditLogs.level")}
          </label>
          <Dropdown
            value={filters.level || ""}
            options={levelOptions}
            onChange={(value) => handleChange("level", value as AuditLogLevel)}
            placeholder={t("auditLogs.allLevels")}
          />
        </div>

        <div>
          <label className="text-md lg:text-sm font-medium mb-2 block">
            {t("notes.category")}
          </label>
          <Dropdown
            value={filters.category || ""}
            options={categoryOptions}
            onChange={(value) => handleChange("category", value as AuditCategory)}
            placeholder={t("auditLogs.allCategories")}
          />
        </div>

        <div>
          <Input
            id="filter-start-date"
            label={t("common.startDate")}
            type="date"
            value={filters.startDate || ""}
            onChange={(e) => handleChange("startDate", e.target.value)}
          />
        </div>

        <div>
          <Input
            id="filter-end-date"
            label={t("common.endDate")}
            type="date"
            value={filters.endDate || ""}
            onChange={(e) => handleChange("endDate", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

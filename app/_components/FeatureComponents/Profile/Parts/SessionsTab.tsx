"use client";

import { SessionManager } from "@/app/_components/FeatureComponents/Profile/Parts/SessionManager";
import { useTranslations } from "next-intl";

export const SessionsTab = () => {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("profile.activeSessions")}</h2>
      </div>

      <SessionManager />
    </div>
  );
};

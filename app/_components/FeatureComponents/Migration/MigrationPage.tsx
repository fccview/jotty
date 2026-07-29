"use client";

import { useState, useEffect } from "react";
import { migrateToInlineSharing } from "@/app/_server/actions/migration/index";
import { isAdmin as checkIsAdmin } from "@/app/_server/actions/users";
import { AdminRequiredView } from "@/app/_components/FeatureComponents/Migration/Parts/MIgrationAdminRequired";
import { ShareMigrationView } from "./Parts/ShareMigrationView";
import { Loading } from "@/app/_components/GlobalComponents/Layout/Loading";
import { useTranslations } from "next-intl";

const LoadingView = () => <Loading />;

export const MigrationPage = () => {
  const t = useTranslations();
  const [isMigrating, setIsMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [migrationResult, setMigrationResult] = useState<{
    migrated: boolean;
    changes: string[];
  } | null>(null);

  useEffect(() => {
    const initializeMigration = async () => {
      try {
        setIsAdmin(await checkIsAdmin());
      } catch (error) {
        console.warn("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeMigration();
  }, []);

  const handleMigrate = async () => {
    setIsMigrating(true);
    setError(null);

    try {
      const result = await migrateToInlineSharing();

      if (!result.success) {
        throw new Error(result.error || t("migration.migrationFailed"));
      }

      setMigrationResult(result.data || null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("encryption.unexpectedError"),
      );
      setIsMigrating(false);
    }
  };

  if (isLoading) return <LoadingView />;
  if (isAdmin === false) return <AdminRequiredView />;

  return (
    <ShareMigrationView
      onMigrate={handleMigrate}
      isMigrating={isMigrating}
      error={error}
      migrationResult={migrationResult}
    />
  );
};

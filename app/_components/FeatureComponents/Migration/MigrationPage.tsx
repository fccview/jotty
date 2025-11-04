"use client";

import { useState, useEffect } from "react";
import { migrateToNewSharingFormat } from "@/app/_server/actions/migration/index";
import { logout } from "@/app/_server/actions/auth";
import { isAdmin as checkIsAdmin } from "@/app/_server/actions/users";
import { AdminRequiredView } from "@/app/_components/FeatureComponents/Migration/Parts/MIgrationAdminRequired";
import { clearAllSessions } from "@/app/_server/actions/session";
import { SharingMigrationView } from "./Parts/SharingMigrationView";

const LoadingView = () => (
  <div className="min-h-screen bg-background-secondary flex items-center justify-center p-4">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
      <p className="text-muted-foreground">Loading migration...</p>
    </div>
  </div>
);

export const MigrationPage = () => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [migrationResult, setMigrationResult] = useState<{
    migrated: boolean;
    changes: string[];
  } | null>(null);

  useEffect(() => {
    checkIsAdmin()
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false))
      .finally(() => setIsLoading(false));
  }, []);

  const handleMigrateSharing = async () => {
    setIsMigrating(true);
    setError(null);
    try {
      const result = await migrateToNewSharingFormat();

      if (result.success) {
        setMigrationResult(result.data || null);
      } else {
        throw new Error(result.error || "Migration failed");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setIsMigrating(false);
    }
  };

  if (isLoading) return <LoadingView />;
  if (isAdmin === false) return <AdminRequiredView />;

  return (
    <SharingMigrationView
      onMigrate={handleMigrateSharing}
      isMigrating={isMigrating}
      error={error}
      migrationResult={migrationResult}
    />
  );
};

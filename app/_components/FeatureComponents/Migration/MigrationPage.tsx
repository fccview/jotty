"use client";

import { useState, useEffect } from "react";
import {
  migrateToNewSharingFormat,
  migrateToYamlMetadataFormat,
} from "@/app/_server/actions/migration/index";
import { logout } from "@/app/_server/actions/auth";
import { isAdmin as checkIsAdmin } from "@/app/_server/actions/users";
import { AdminRequiredView } from "@/app/_components/FeatureComponents/Migration/Parts/MIgrationAdminRequired";
import { clearAllSessions } from "@/app/_server/actions/session";
import { SharingMigrationView } from "./Parts/SharingMigrationView";
import { YamlMetadataMigrationView } from "./Parts/YamlMetadataMigrationView";

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
  const [migrationType, setMigrationType] = useState<"sharing" | "yaml" | null>(
    null
  );
  const [sharingMigrationResult, setSharingMigrationResult] = useState<{
    migrated: boolean;
    changes: string[];
  } | null>(null);
  const [yamlMigrationResult, setYamlMigrationResult] = useState<{
    migrated: boolean;
    changes: string[];
  } | null>(null);

  useEffect(() => {
    const initializeMigration = async () => {
      try {
        const admin = await checkIsAdmin();
        setIsAdmin(admin);

        if (admin) {
          setMigrationType("yaml");
        }
      } catch (error) {
        console.warn("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeMigration();
  }, []);

  const handleMigrateSharing = async () => {
    setIsMigrating(true);
    setError(null);
    try {
      const result = await migrateToNewSharingFormat();

      if (result.success) {
        setSharingMigrationResult(result.data || null);
        const yamlResult = await migrateToYamlMetadataFormat();
        if (yamlResult.success && yamlResult.data?.migrated) {
          setMigrationType("yaml");
        }
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

  const handleMigrateYaml = async () => {
    setIsMigrating(true);
    setError(null);
    try {
      const result = await migrateToYamlMetadataFormat();

      if (result.success) {
        setYamlMigrationResult(result.data || null);
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
  if (migrationType === null) return <LoadingView />;

  if (migrationType === "sharing") {
    return (
      <SharingMigrationView
        onMigrate={handleMigrateSharing}
        isMigrating={isMigrating}
        error={error}
        migrationResult={sharingMigrationResult}
      />
    );
  }

  return (
    <YamlMetadataMigrationView
      onMigrate={handleMigrateYaml}
      isMigrating={isMigrating}
      error={error}
      migrationResult={yamlMigrationResult}
    />
  );
};

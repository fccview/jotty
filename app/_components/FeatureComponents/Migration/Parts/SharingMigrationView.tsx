import { MigrationHeader } from "./MigrationHeader";
import { InfoCard } from "@/app/_components/GlobalComponents/Cards/InfoCard";
import { InfoCardVariant } from "@/app/_components/GlobalComponents/Cards/InfoCard";
import { Info } from "lucide-react";
import { Database } from "lucide-react";
import { Users } from "lucide-react";
import { CheckCircle } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/app/_utils/global-utils";

interface SharingMigrationViewProps {
  onMigrate: () => void;
  isMigrating: boolean;
  error: string | null;
  migrationResult: {
    migrated: boolean;
    changes: string[];
  } | null;
}

export const SharingMigrationView = ({
  onMigrate,
  isMigrating,
  error,
  migrationResult,
}: SharingMigrationViewProps) => {
  const [hasBackedUp, setHasBackedUp] = useState(false);

  const isMigrationComplete = migrationResult !== null;

  return (
    <div className="min-h-screen bg-background-secondary flex items-center justify-center p-4">
      <div className="max-w-3xl w-full space-y-6">
        <MigrationHeader
          icon={<Database className="h-12 w-12 text-primary" />}
          title={
            isMigrationComplete
              ? "Migration Complete"
              : "Sharing System Update Required"
          }
          description={
            isMigrationComplete
              ? "Your sharing data has been successfully migrated to the new format."
              : `We${"'ve"} improved how sharing works in your app! We need to update your sharing data structure.`
          }
        />

        {!isMigrationComplete && (
          <>
            <InfoCard
              icon={<Info className="h-5 w-5 text-primary" />}
              title="What's happening?"
            >
              <p className="text-sm">
                We&apos;re migrating from the old{" "}
                <code className="bg-muted px-1 rounded text-xs">
                  shared-items.json
                </code>{" "}
                format to individual{" "}
                <code className="bg-muted px-1 rounded text-xs">
                  .sharing.json
                </code>{" "}
                files for each item type (notes and checklists). This makes
                sharing more granular and user-focused.
              </p>
            </InfoCard>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Migration Changes
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Users className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">User-focused sharing</p>
                    <p className="text-xs text-muted-foreground">
                      Each user now sees only items shared <strong>WITH</strong>{" "}
                      them, rather than items shared <strong>BY</strong> them.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Database className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      Separate sharing files
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Notes and checklists now have their own{" "}
                      <code className="bg-muted px-1 rounded text-xs">
                        .sharing.json
                      </code>{" "}
                      files.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      Public sharing support
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Publicly shared items are now properly organized in a
                      &quot;public&quot; section.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <InfoCard
              icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
              title="Important: Backup Your Data"
              variant={InfoCardVariant.WARNING}
            >
              <p>
                Before proceeding, please ensure you have a backup of your{" "}
                <code className="bg-muted px-1 rounded text-xs">
                  data/sharing
                </code>{" "}
                folder. While this migration is safe, it&apos;s always good
                practice to have a backup.
              </p>
            </InfoCard>

            {error && (
              <InfoCard
                icon={<Info className="h-4 w-4 text-destructive" />}
                title="Migration failed"
                variant={InfoCardVariant.DESTRUCTIVE}
              >
                <p>{error}</p>
              </InfoCard>
            )}

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="backup-confirmation"
                  checked={hasBackedUp}
                  onChange={(e) => setHasBackedUp(e.target.checked)}
                  className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <div>
                  <label
                    htmlFor="backup-confirmation"
                    className="text-sm font-medium text-foreground cursor-pointer"
                  >
                    I have backed up my sharing data and understand the
                    migration process.
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Please confirm you&apos;ve created a backup before
                    proceeding.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <Button
                onClick={onMigrate}
                disabled={isMigrating || !hasBackedUp}
                size="lg"
                className="min-w-48"
              >
                <RefreshCw
                  className={cn("h-4 w-4 mr-2", isMigrating && "animate-spin")}
                />
                {isMigrating ? "Migrating..." : "Start Migration"}
              </Button>
            </div>
          </>
        )}

        {isMigrationComplete && (
          <div className="space-y-4">
            <InfoCard
              icon={<CheckCircle className="h-5 w-5 text-green-600" />}
              title="Migration Successful"
              variant={InfoCardVariant.DEFAULT}
            >
              <p className="text-sm">
                {migrationResult.migrated
                  ? "Your sharing data has been successfully migrated. All users will be logged out to ensure they get fresh sessions with the updated sharing system."
                  : "No migration was needed - your system is already up to date."}
              </p>
            </InfoCard>

            {migrationResult.changes.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  What was changed:
                </h3>
                <ul className="space-y-2">
                  {migrationResult.changes.map((change, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">
                        {change}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {migrationResult.migrated && (
              <div className="flex justify-center pt-2">
                <Button onClick={() => (window.location.href = "/")} size="lg">
                  Return to App
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

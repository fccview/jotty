import { ReactNode, useState } from "react";
import {
  Alert02Icon,
  CheckmarkCircle04Icon,
  Database01Icon,
  FolderShared01Icon,
  InformationCircleIcon,
  RefreshIcon,
  UserMultipleIcon,
  ShieldUserIcon,
} from "hugeicons-react";
import { MigrationHeader } from "./MigrationHeader";
import {
  InfoCard,
  InfoCardVariant,
} from "@/app/_components/GlobalComponents/Cards/InfoCard";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { cn } from "@/app/_utils/global-utils";
import { useTranslations } from "next-intl";

const inlineCode = (chunks: ReactNode) => (
  <code className="bg-muted px-1 rounded text-xs">{chunks}</code>
);

interface ShareMigrationViewProps {
  onMigrate: () => void;
  isMigrating: boolean;
  error: string | null;
  migrationResult: {
    migrated: boolean;
    changes: string[];
  } | null;
}

export const ShareMigrationView = ({
  onMigrate,
  isMigrating,
  error,
  migrationResult,
}: ShareMigrationViewProps) => {
  const t = useTranslations();
  const [hasBackedUp, setHasBackedUp] = useState(false);

  const isMigrationComplete = migrationResult !== null;

  return (
    <div className="min-h-screen bg-background-secondary flex items-center justify-center p-4">
      <div className="max-w-3xl w-full space-y-6">
        <MigrationHeader
          icon={<FolderShared01Icon className="h-12 w-12 text-primary" />}
          title={
            isMigrationComplete
              ? t("migration.migrationComplete")
              : t("migration.sharingUpdateRequired")
          }
          description={
            isMigrationComplete
              ? t("migration.sharingNowWithData")
              : t("migration.sharingMovesDescription")
          }
        />

        {!isMigrationComplete && (
          <>
            <InfoCard
              icon={<InformationCircleIcon className="h-5 w-5 text-primary" />}
              title={t("migration.whatsHappening")}
            >
              <p className="text-md lg:text-sm">
                {t.rich("migration.whatsHappeningBody", { code: inlineCode })}
              </p>
            </InfoCard>

            <div className="bg-card border border-border rounded-jotty p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                {t("migration.migrationChanges")}
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-jotty">
                  <UserMultipleIcon className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-md lg:text-sm font-medium">
                      {t("migration.sharingTravelsTitle")}
                    </p>
                    <p className="text-md lg:text-xs text-muted-foreground">
                      {t("migration.sharingTravelsBody")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-jotty">
                  <FolderShared01Icon className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-md lg:text-sm font-medium">
                      {t("migration.folderSharingTitle")}
                    </p>
                    <p className="text-md lg:text-xs text-muted-foreground">
                      {t("migration.folderSharingBody")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-jotty">
                  <Database01Icon className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-md lg:text-sm font-medium">
                      {t("migration.oneFilePerFolderTitle")}
                    </p>
                    <p className="text-md lg:text-xs text-muted-foreground">
                      {t.rich("migration.oneFilePerFolderBody", {
                        code: inlineCode,
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-jotty">
                  <ShieldUserIcon className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-md lg:text-sm font-medium">
                      {t("migration.permissionsUnchangedTitle")}
                    </p>
                    <p className="text-md lg:text-xs text-muted-foreground">
                      {t("migration.permissionsUnchangedBody")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <InfoCard
              icon={<Alert02Icon className="h-5 w-5 text-amber-600" />}
              title={t("migration.importantBackupData")}
              variant={InfoCardVariant.WARNING}
            >
              <p>{t.rich("migration.backupWarningBody", { code: inlineCode })}</p>
            </InfoCard>

            {error && (
              <InfoCard
                icon={<Alert02Icon className="h-4 w-4 text-destructive" />}
                title={t("migration.migrationFailed")}
                variant={InfoCardVariant.DESTRUCTIVE}
              >
                <p>{error}</p>
              </InfoCard>
            )}

            <div className="bg-card border border-border rounded-jotty p-6 shadow-sm">
              <div className="flex items-center gap-3">
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
                    className="text-md lg:text-sm font-medium text-foreground cursor-pointer"
                  >
                    {t("migration.backupConfirmLabel")}
                    <span className="text-md lg:text-xs text-muted-foreground block">
                      {t("migration.backupConfirmHint")}
                    </span>
                  </label>
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
                <RefreshIcon
                  className={cn("h-4 w-4 mr-2", isMigrating && "animate-spin")}
                />
                {isMigrating
                  ? t("migration.migrating")
                  : t("migration.startMigration")}
              </Button>
            </div>
          </>
        )}

        {isMigrationComplete && (
          <div className="space-y-4">
            <InfoCard
              icon={
                <CheckmarkCircle04Icon className="h-5 w-5 text-green-600" />
              }
              title={t("migration.migrationSuccessful")}
              variant={InfoCardVariant.DEFAULT}
            >
              <p className="text-md lg:text-sm">
                {migrationResult.migrated
                  ? t("migration.sharingDataMigrated")
                  : t("migration.noMigrationNeeded")}
              </p>
            </InfoCard>

            {migrationResult.changes.length > 0 && (
              <div className="bg-card border border-border rounded-jotty p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  {t("migration.whatWasChanged")}
                </h3>
                <ul className="space-y-2">
                  {migrationResult.changes.map((change, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckmarkCircle04Icon className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-md lg:text-sm text-muted-foreground">
                        {change}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-center pt-2">
              <Button onClick={() => (window.location.href = "/")} size="lg">
                {t("migration.returnToApp")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

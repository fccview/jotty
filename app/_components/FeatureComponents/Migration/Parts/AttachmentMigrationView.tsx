import { ReactNode, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Alert02Icon,
  Attachment01Icon,
  CheckmarkCircle04Icon,
  InformationCircleIcon,
  LinkSquare02Icon,
  RefreshIcon,
  ShieldUserIcon,
} from "hugeicons-react";
import type { AttachmentMigrationReport } from "@/app/_types";
import { ATTACHMENTS_SCHEMA_VERSION } from "@/app/_consts/files";
import {
  forceUnblock,
  migrateAttachments,
  planAttachmentMigration,
} from "@/app/_server/actions/migration/index";
import { InfoCard, InfoCardVariant } from "@/app/_components/GlobalComponents/Cards/InfoCard";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Logo } from "@/app/_components/GlobalComponents/Layout/Logo/Logo";
import { cn } from "@/app/_utils/global-utils";
import { MigrationHeader } from "./MigrationHeader";
import { MigrationOverride } from "./MigrationOverride";
import { AttachmentReport, flatResidue } from "./AttachmentReport";

const inlineCode = (chunks: ReactNode) => (
  <code className="bg-muted px-1 rounded text-xs">{chunks}</code>
);

const Change = ({ icon, title, body }: { icon: ReactNode; title: string; body: ReactNode }) => (
  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-jotty">
    {icon}
    <div>
      <p className="text-md lg:text-sm font-medium">{title}</p>
      <p className="text-md lg:text-xs text-muted-foreground">{body}</p>
    </div>
  </div>
);

export const AttachmentMigrationView = () => {
  const t = useTranslations();
  const [plan, setPlan] = useState<AttachmentMigrationReport | null>(null);
  const [result, setResult] = useState<AttachmentMigrationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasBackedUp, setHasBackedUp] = useState(false);
  const [isPlanning, setIsPlanning] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isOverriding, setIsOverriding] = useState(false);

  const rehearse = useCallback(async () => {
    setIsPlanning(true);
    setError(null);
    try {
      const outcome = await planAttachmentMigration();
      if (outcome.success && outcome.data) setPlan(outcome.data);
      else setError(outcome.error || t("migration.migrationFailed"));
    } catch (err) {
      console.error("Attachments dry run failed:", err);
      setError(t("encryption.unexpectedError"));
    } finally {
      setIsPlanning(false);
    }
  }, [t]);

  useEffect(() => {
    void rehearse();
  }, [rehearse]);

  const handleMigrate = async () => {
    setIsMigrating(true);
    setError(null);
    try {
      const outcome = await migrateAttachments();
      if (outcome.success && outcome.data) setResult(outcome.data);
      else setError(outcome.error || t("migration.migrationFailed"));
    } catch (err) {
      console.error("Attachments migration failed:", err);
      setError(t("encryption.unexpectedError"));
    } finally {
      setIsMigrating(false);
    }
  };

  const handleOverride = async () => {
    setIsOverriding(true);
    try {
      const outcome = await forceUnblock(plan ? flatResidue(plan) : [], ATTACHMENTS_SCHEMA_VERSION);
      if (!outcome.success) throw new Error(outcome.error || t("migration.overrideFailed"));
      window.location.href = "/";
    } catch (err) {
      console.error("Error overriding the migration gate:", err);
      setError(err instanceof Error ? err.message : t("encryption.unexpectedError"));
      setIsOverriding(false);
    }
  };

  const done = result !== null;
  const residueCount = done ? flatResidue(result).length : 0;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-3xl w-full space-y-6">
        <MigrationHeader
          icon={<Attachment01Icon className="h-12 w-12 text-primary" />}
          title={done ? t("migration.migrationComplete") : t("migration.attachments.title")}
          description={done ? t("migration.attachments.doneBody") : t("migration.attachments.description")}
        />

        {!done && (
          <>
            <InfoCard
              icon={<InformationCircleIcon className="h-5 w-5 text-primary" />}
              title={t("migration.whatsHappening")}
            >
              <p className="text-md lg:text-sm">
                {t.rich("migration.attachments.whatsHappeningBody", { code: inlineCode })}
              </p>
            </InfoCard>

            <div className="bg-card border border-border rounded-jotty p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                {t("migration.migrationChanges")}
              </h2>
              <div className="space-y-3">
                <Change
                  icon={<ShieldUserIcon className="h-5 w-5 text-primary mt-0.5" />}
                  title={t("migration.attachments.followsItemTitle")}
                  body={t("migration.attachments.followsItemBody")}
                />
                <Change
                  icon={<LinkSquare02Icon className="h-5 w-5 text-primary mt-0.5" />}
                  title={t("migration.attachments.noCopiesTitle")}
                  body={t("migration.attachments.noCopiesBody")}
                />
                <Change
                  icon={<Alert02Icon className="h-5 w-5 text-primary mt-0.5" />}
                  title={t("migration.attachments.encryptedTitle")}
                  body={t("migration.attachments.encryptedBody")}
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-jotty p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                {t("migration.attachments.dryRunTitle")}
              </h2>
              {isPlanning ? (
                <div className="text-center py-6">
                  <Logo className="h-6 w-6 animate-pulse" />
                </div>
              ) : plan ? (
                <AttachmentReport report={plan} />
              ) : null}
            </div>

            <InfoCard
              icon={<Alert02Icon className="h-5 w-5 text-amber-600" />}
              title={t("migration.importantBackupData")}
              variant={InfoCardVariant.WARNING}
            >
              <p>{t.rich("migration.attachments.backupBody", { code: inlineCode })}</p>
            </InfoCard>

            {error && (
              <>
                <InfoCard
                  icon={<Alert02Icon className="h-4 w-4 text-destructive" />}
                  title={t("migration.migrationFailed")}
                  variant={InfoCardVariant.DESTRUCTIVE}
                >
                  <p>{error}</p>
                </InfoCard>
                <MigrationOverride
                  residue={plan ? flatResidue(plan) : []}
                  onOverride={handleOverride}
                  isOverriding={isOverriding}
                />
              </>
            )}

            <div className="bg-card border border-border rounded-jotty p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="attachments-backup-confirmation"
                  checked={hasBackedUp}
                  onChange={(e) => setHasBackedUp(e.target.checked)}
                  className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label
                  htmlFor="attachments-backup-confirmation"
                  className="text-md lg:text-sm font-medium text-foreground cursor-pointer"
                >
                  {t("migration.backupConfirmLabel")}
                  <span className="text-md lg:text-xs text-muted-foreground block">
                    {t("migration.backupConfirmHint")}
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <Button
                onClick={handleMigrate}
                disabled={isMigrating || isPlanning || !plan || !hasBackedUp}
                size="lg"
                className="min-w-48"
              >
                <RefreshIcon className={cn("h-4 w-4 mr-2", isMigrating && "animate-spin")} />
                {isMigrating ? t("migration.migrating") : t("migration.startMigration")}
              </Button>
            </div>
          </>
        )}

        {done && (
          <div className="space-y-4">
            <InfoCard
              icon={<CheckmarkCircle04Icon className="h-5 w-5 text-green-600" />}
              title={residueCount > 0 ? t("migration.migrationPartial") : t("migration.migrationSuccessful")}
            >
              <p className="text-md lg:text-sm">
                {residueCount > 0
                  ? t("migration.attachments.leftAlone", { count: residueCount })
                  : t("migration.attachments.allMoved")}
              </p>
            </InfoCard>

            <div className="bg-card border border-border rounded-jotty p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                {t("migration.whatWasChanged")}
              </h3>
              <AttachmentReport report={result} />
            </div>

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

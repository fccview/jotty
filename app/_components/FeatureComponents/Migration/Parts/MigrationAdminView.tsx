import { MigrationHeader } from "./MigrationHeader";
import { InfoCard } from "@/app/_components/GlobalComponents/Cards/InfoCard";
import { InfoCardVariant } from "@/app/_components/GlobalComponents/Cards/InfoCard";
import { Info } from "lucide-react";
import { Settings } from "lucide-react";
import { Folder } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { FileText } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/app/_utils/global-utils";
import { useTranslations } from "next-intl";

interface MigrationAdminViewProps {
    onMigrate: () => void;
    isMigrating: boolean;
    error: string | null;
}

export const MigrationAdminView = ({ onMigrate, isMigrating, error }: MigrationAdminViewProps) => {
    const [hasBackedUp, setHasBackedUp] = useState(false);
    const t = useTranslations();

    return (
        <div className="min-h-screen bg-background-secondary flex items-center justify-center p-4">
            <div className="max-w-3xl w-full space-y-6">
                <MigrationHeader
                    icon={<Settings className="h-12 w-12 text-primary" />}
                    title={t("migration.quick_setup_required")}
                    description={t("migration.improved_organization")}
                />

                <InfoCard icon={<Info className="h-5 w-5 text-primary" />} title={t("migration.whats_happening")}>
                    <p className="text-sm">{t("migration.rename_folder")}</p>
                </InfoCard>

                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("migration.migration_steps")}</h2>
                    <div className="flex items-center gap-2 sm:gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2"><Folder className="h-4 w-4 text-primary" /><span className="text-sm font-mono">data/docs</span></div>
                        <ArrowRight className="h-4 w-4 text-primary" />
                        <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><span className="text-sm font-mono">data/notes</span></div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3"><strong>{t("migration.all_users_logged_out")}</strong> {t("migration.fresh_session")}</p>
                </div>

                <InfoCard icon={<AlertTriangle className="h-5 w-5 text-amber-600" />} title={t("migration.backup_data")} variant={InfoCardVariant.WARNING}>
                    <p>{t("migration.backup_message")} <code className="bg-amber-200 text-amber-900 px-1 rounded text-xs">{t("migration.folder")}</code> {t("migration.migration_safe")}</p>
                </InfoCard>

                {error && (
                    <InfoCard icon={<Info className="h-4 w-4 text-destructive" />} title={t("migration.migration_failed")} variant={InfoCardVariant.DESTRUCTIVE}>
                        <p>{error}</p>
                    </InfoCard>
                )}

                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-start gap-3">
                        <input type="checkbox" id="backup-confirmation" checked={hasBackedUp} onChange={(e) => setHasBackedUp(e.target.checked)} className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" />
                        <div>
                            <label htmlFor="backup-confirmation" className="text-sm font-medium text-foreground cursor-pointer">{t("migration.backed_up_confirm")}</label>
                            <p className="text-xs text-muted-foreground mt-1">{t("migration.confirm_backup")}</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center pt-2">
                    <Button onClick={onMigrate} disabled={isMigrating || !hasBackedUp} size="lg" className="min-w-48">
                        <RefreshCw className={cn("h-4 w-4 mr-2", isMigrating && "animate-spin")} />
                        {isMigrating ? t("migration.migrating") : t("migration.start_migration")}
                    </Button>
                </div>
            </div>
        </div>
    );
};
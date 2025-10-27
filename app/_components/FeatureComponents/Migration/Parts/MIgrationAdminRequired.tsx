import { Info, Shield } from "lucide-react";
import { MigrationHeader } from "./MigrationHeader";
import { InfoCard } from "@/app/_components/GlobalComponents/Cards/InfoCard";
import { InfoCardVariant } from "@/app/_components/GlobalComponents/Cards/InfoCard";
import { useTranslations } from "next-intl";

export const AdminRequiredView = () => {
    const t = useTranslations();

    return (
        <div className="min-h-screen bg-background-secondary flex items-center justify-center p-4">
            <div className="max-w-2xl w-full space-y-6">
                <MigrationHeader
                    icon={<Shield className="h-12 w-12 text-amber-600" />}
                    title={t("migration.admin_access_required")}
                    description={t("migration.requires_admin")}
                />
                <InfoCard
                    icon={<Info className="h-5 w-5 text-amber-600" />}
                    title={t("migration.whats_happening")}
                    variant={InfoCardVariant.WARNING}
                >
                    <p>{t("migration.system_needs_migrate")}</p>
                </InfoCard>
            </div>
        </div>
    );
};
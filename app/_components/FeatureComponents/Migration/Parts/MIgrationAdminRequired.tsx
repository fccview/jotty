import { Alert02Icon, ShieldUserIcon } from "hugeicons-react";
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
          icon={<ShieldUserIcon className="h-12 w-12 text-amber-600" />}
          title={t("migration.adminAccessRequired")}
          description={t("migration.adminAccessDescription")}
        />
        <InfoCard
          icon={<Alert02Icon className="h-5 w-5 text-amber-600" />}
          title={t("migration.whatsHappening")}
          variant={InfoCardVariant.WARNING}
        >
          <p>
            {t("migration.sharingDataMigrationDescription")}
          </p>
        </InfoCard>
      </div>
    </div>
  );
};

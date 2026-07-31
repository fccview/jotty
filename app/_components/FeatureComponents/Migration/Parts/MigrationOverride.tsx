import { useState } from "react";
import { Alert02Icon, ArrowRight02Icon } from "hugeicons-react";
import {
  InfoCard,
  InfoCardVariant,
} from "@/app/_components/GlobalComponents/Cards/InfoCard";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useTranslations } from "next-intl";

interface MigrationOverrideProps {
  residue: string[];
  onOverride: () => void;
  isOverriding: boolean;
}

export const MigrationOverride = ({
  residue,
  onOverride,
  isOverriding,
}: MigrationOverrideProps) => {
  const t = useTranslations();
  const [hasAccepted, setHasAccepted] = useState(false);

  return (
    <div className="space-y-4">
      <InfoCard
        icon={<Alert02Icon className="h-5 w-5 text-amber-600" />}
        title={t("migration.leftoversTitle")}
        variant={InfoCardVariant.WARNING}
      >
        <p className="text-md lg:text-sm">{t("migration.leftoversBody")}</p>

        {residue.length > 0 && (
          <ul className="mt-3 space-y-1">
            {residue.map((entry, index) => (
              <li
                key={index}
                className="text-md lg:text-xs font-mono text-muted-foreground"
              >
                {entry}
              </li>
            ))}
          </ul>
        )}
      </InfoCard>

      <div className="bg-card border border-border rounded-jotty p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="override-confirmation"
            checked={hasAccepted}
            onChange={(e) => setHasAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
          />
          <label
            htmlFor="override-confirmation"
            className="text-md lg:text-sm font-medium text-foreground cursor-pointer"
          >
            {t("migration.overrideConfirmLabel")}
            <span className="text-md lg:text-xs text-muted-foreground block">
              {t("migration.overrideConfirmHint")}
            </span>
          </label>
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={onOverride}
          disabled={isOverriding || !hasAccepted}
          variant="outline"
          size="lg"
          className="min-w-48"
        >
          <ArrowRight02Icon className="h-4 w-4 mr-2" />
          {isOverriding
            ? t("migration.overriding")
            : t("migration.continueAnyway")}
        </Button>
      </div>
    </div>
  );
};

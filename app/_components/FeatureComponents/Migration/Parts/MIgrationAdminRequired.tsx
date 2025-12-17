import { Alert02Icon, ShieldUserIcon } from "hugeicons-react";
import { MigrationHeader } from "./MigrationHeader";
import { InfoCard } from "@/app/_components/GlobalComponents/Cards/InfoCard";
import { InfoCardVariant } from "@/app/_components/GlobalComponents/Cards/InfoCard";

export const AdminRequiredView = () => (
  <div className="min-h-screen bg-background-secondary flex items-center justify-center p-4">
    <div className="max-w-2xl w-full space-y-6">
      <MigrationHeader
        icon={<ShieldUserIcon className="h-12 w-12 text-amber-600" />}
        title="Admin Access Required"
        description="This migration requires administrator privileges. Please contact an administrator to perform the system migration."
      />
      <InfoCard
        icon={<Alert02Icon className="h-5 w-5 text-amber-600" />}
        title="What's happening?"
        variant={InfoCardVariant.WARNING}
      >
        <p>
          The system needs to migrate your sharing data. This is a one-time
          process that requires administrator access.
        </p>
      </InfoCard>
    </div>
  </div>
);

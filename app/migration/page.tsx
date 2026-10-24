import { redirect } from "next/navigation";
import { MigrationPage } from "@/app/_components/FeatureComponents/Migration/MigrationPage";
import { needsMigration, pendingMigrations } from "@/app/_server/actions/lib/migration-check";
import {
  MIGRATION_FORCE_PARAM,
  MIGRATION_FORCE_VALUE,
} from "@/app/_consts/files";
import { MigrationSteps } from "@/app/_consts/attachment-migration";

interface MigrationProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Migration({ searchParams }: MigrationProps) {
  const params = await searchParams;
  const forced = params[MIGRATION_FORCE_PARAM] === MIGRATION_FORCE_VALUE;

  if (!forced && !(await needsMigration())) {
    redirect("/");
  }

  const pending = await pendingMigrations();
  const step = pending.sharing ? MigrationSteps.SHARING : MigrationSteps.ATTACHMENTS;

  return <MigrationPage step={step} />;
}

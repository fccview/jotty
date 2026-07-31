import { redirect } from "next/navigation";
import { MigrationPage } from "@/app/_components/FeatureComponents/Migration/MigrationPage";
import { needsMigration } from "@/app/_server/actions/lib/migration-check";
import {
  MIGRATION_FORCE_PARAM,
  MIGRATION_FORCE_VALUE,
} from "@/app/_consts/files";

interface MigrationProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Migration({ searchParams }: MigrationProps) {
  const params = await searchParams;
  const forced = params[MIGRATION_FORCE_PARAM] === MIGRATION_FORCE_VALUE;

  if (!forced && !(await needsMigration())) {
    redirect("/");
  }

  return <MigrationPage />;
}

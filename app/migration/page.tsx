import { redirect } from "next/navigation";
import { MigrationPage } from "@/app/_components/FeatureComponents/Migration/MigrationPage";
import { needsMigration } from "@/app/_server/actions/lib/migration-check";

export default async function Migration() {
  if (!(await needsMigration())) {
    redirect("/");
  }

  return <MigrationPage />;
}

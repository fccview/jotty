import { MigrationPage } from "@/app/_components/FeatureComponents/Migration/MigrationPage";
import { existsSync } from "fs";
import { SHARED_ITEMS_FILE } from "@/app/_consts/files";
import { redirect } from "next/navigation";

export default function Migration() {
  if (!existsSync(SHARED_ITEMS_FILE)) {
    redirect("/");
  }

  return <MigrationPage />;
}

import { MigrationPage } from "@/app/_components/FeatureComponents/Migration/MigrationPage";
import { existsSync } from "fs";
import { SHARED_ITEMS_FILE } from "@/app/_consts/files";
import { redirect } from "next/navigation";

export default function Migration() {
  // Only show migration page if shared-items.json exists
  if (!existsSync(SHARED_ITEMS_FILE)) {
    redirect("/");
  }

  return <MigrationPage />;
}

import { permanentRedirect } from "next/navigation";
import { ARCHIVE_PATH } from "@/app/_consts/files";

export default function ArchiveSettingsPage() {
  permanentRedirect(ARCHIVE_PATH);
}

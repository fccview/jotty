import { permanentRedirect } from "next/navigation";
import { BRAIN_PATH } from "@/app/_consts/relations";

export default function ConnectionsPage() {
  permanentRedirect(BRAIN_PATH);
}

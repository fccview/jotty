import { permanentRedirect } from "next/navigation";
import { BRAIN_PATH } from "@/app/_consts/relations";

/**
 * Permanently redirect the retired connections settings route to the Brain.
 */
export default function ConnectionsPage() {
  permanentRedirect(BRAIN_PATH);
}

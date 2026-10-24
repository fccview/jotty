import { NextRequest } from "next/server";
import { AttachmentKinds } from "@/app/_consts/attachments";
import { serveLegacy, type LegacyParams } from "@/app/_server/actions/attachments/legacy";

export const dynamic = "force-dynamic";

/**
 * @deprecated Pre-v3 attachment URL. Once the attachments migration has run
 * only the owner and admins can fetch it, everyone else goes through
 * /api/attachment/<itemUuid>/<name>.
 */
export const GET = async (
  request: NextRequest,
  props: { params: Promise<LegacyParams> },
) => serveLegacy(request, AttachmentKinds.IMAGE, await props.params);

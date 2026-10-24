import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { ATTACHMENTS_SCHEMA_VERSION, DATA_DIR } from "@/app/_consts/files";
import { NOTES_FOLDER } from "@/app/_consts/notes";
import {
  AttachmentKinds,
  LEGACY_DIRS,
  RETIRED_PUBLIC_ENV,
} from "@/app/_consts/attachments";
import { canAccessAllContent, getCurrentUser } from "@/app/_server/actions/users";
import { sharedFrom } from "@/app/_server/actions/share/queries";
import { storedSchema } from "@/app/_server/actions/lib/migration-check";
import { isEnvEnabled } from "@/app/_utils/env-utils";
import { resolvePath } from "@/app/_utils/path-utils";
import { CachePolicies, safeDecode, sendFile } from "./serve";

export interface LegacyParams {
  username: string;
  filename: string;
}

const _badSegment = (value: string): boolean =>
  !value || value.startsWith(".") || /[\\/\0]/.test(value);

const _refusal = async (
  kind: AttachmentKinds,
  owner: string,
): Promise<NextResponse | null> => {
  const user = await getCurrentUser();
  const migrated = (await storedSchema()) >= ATTACHMENTS_SCHEMA_VERSION;

  if (!user) {
    const servedPublicly = !migrated && isEnvEnabled(process.env[RETIRED_PUBLIC_ENV[kind]]);
    return servedPublicly ? null : new NextResponse("Unauthorized", { status: 401 });
  }

  if (owner === user.username || (await canAccessAllContent())) return null;
  if (!migrated && (await sharedFrom(owner, user.username))) return null;

  return new NextResponse("Forbidden", { status: 403 });
};

export const serveLegacy = async (
  request: NextRequest,
  kind: AttachmentKinds,
  params: LegacyParams,
): Promise<NextResponse> => {
  try {
    const owner = safeDecode(params.username);
    const filename = safeDecode(params.filename);

    if (_badSegment(owner) || _badSegment(filename)) {
      return new NextResponse("Invalid filename", { status: 400 });
    }

    const refused = await _refusal(kind, owner);
    if (refused) return refused;

    const baseDir = path.resolve(process.cwd(), DATA_DIR, NOTES_FOLDER, owner, LEGACY_DIRS[kind]);
    const resolved = resolvePath(baseDir, filename);

    if (!resolved.ok || path.dirname(resolved.absolutePath) !== baseDir) {
      return new NextResponse("Invalid filename", { status: 400 });
    }

    return await sendFile(request, resolved.absolutePath, filename, CachePolicies.PRIVATE);
  } catch (error) {
    console.error(`Error serving legacy ${kind}:`, error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};

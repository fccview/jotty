import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/app/_server/actions/api";
import { getAppSettings } from "@/app/_server/actions/config";
import { getCurrentUser } from "@/app/_server/actions/users";
import { resolveApiId } from "@/app/_server/actions/lib/legacy-lookup";
import { canReach } from "@/app/_server/actions/share/queries";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import { User } from "@/app/_types";

export type ApiCaller = Pick<User, "username" | "isAdmin" | "isSuperAdmin">;

export const API_KEY_HEADER = "x-api-key";

/**
 * @deprecated Legacy category+id fallback for checklist-family API routes
 * (checklists, tasks, kanban). Returns the param when it is already a uuid,
 * otherwise resolves it via the deprecated category+slug lookup, which logs a
 * WARNING on every use. Will be removed once slug lookups are dropped.
 */
export const listUuid = async (
  request: NextRequest,
  param: string,
  username: string
): Promise<string | null> =>
  resolveApiId(
    Modes.CHECKLISTS,
    param,
    request.nextUrl.searchParams.get("category"),
    username
  );

export const withApiAuth = async (
  request: NextRequest,
  handler: (user: any, request: NextRequest) => Promise<NextResponse>
) => {
  try {
    const apiKey = request.headers.get(API_KEY_HEADER);
    const user = await authenticateApiKey(apiKey || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handler(user, request);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};


export const turnAway = async (
  username: string,
  uuid: string,
  permission: PermissionTypes,
): Promise<NextResponse | null> =>
  (await canReach(uuid, ItemTypes.CHECKLIST, username, permission))
    ? null
    : NextResponse.json({ error: "Forbidden" }, { status: 403 });

export const whoGoesThere = async (
  request: NextRequest,
): Promise<ApiCaller | null> =>
  (await getCurrentUser()) ??
  (await authenticateApiKey(request.headers.get(API_KEY_HEADER) || ""));

export const seesAllContent = async (user: ApiCaller): Promise<boolean> => {
  if (user.isSuperAdmin) return true;
  if (!user.isAdmin) return false;

  const settingsResult = await getAppSettings();
  if (!settingsResult.success || !settingsResult.data) {
    return true;
  }

  return settingsResult.data.adminContentAccess !== "no";
};

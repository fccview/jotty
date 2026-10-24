import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { whoGoesThere } from "@/app/_utils/api-utils";
import { fileOf } from "@/app/_server/actions/attachments/store";
import { locateItem, mayView } from "@/app/_server/actions/attachments/access";
import { CachePolicies, safeDecode, sendFile } from "@/app/_server/actions/attachments/serve";

export const dynamic = "force-dynamic";

const _turnAway = (viewer: string | null): NextResponse =>
  viewer
    ? new NextResponse("Not found", { status: 404 })
    : new NextResponse("Unauthorized", { status: 401 });

const _isFile = (filePath: string): Promise<boolean> =>
  fs.lstat(filePath).then(
    (stats) => stats.isFile(),
    () => false,
  );

export const GET = async (
  request: NextRequest,
  props: { params: Promise<{ itemUuid: string; name: string }> },
) => {
  try {
    const { itemUuid, name } = await props.params;
    const decoded = safeDecode(name);
    const filePath = fileOf(itemUuid, decoded);
    if (!filePath) return new NextResponse("Invalid attachment", { status: 400 });

    const viewer = (await whoGoesThere(request))?.username ?? null;
    if (!(await _isFile(filePath))) return _turnAway(viewer);

    const item = await locateItem(itemUuid);
    if (!item || !(await mayView(item, viewer))) return _turnAway(viewer);

    return await sendFile(request, filePath, decoded, CachePolicies.PRIVATE);
  } catch (error) {
    console.error("Error serving attachment:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};

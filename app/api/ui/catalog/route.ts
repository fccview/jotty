import { NextRequest, NextResponse } from "next/server";
import { CatalogOps } from "@/app/_consts/ui-api";
import {
  findItems,
  getAdjacentNotes,
  getItemsByUuid,
  getTaggedItems,
  resolveWikiTargets,
} from "@/app/_server/actions/catalog";

export const dynamic = "force-dynamic";

const NOT_SIGNED_IN = "Not authenticated";

const _answer = (body: Record<string, unknown>) => {
  switch (body.op) {
    case CatalogOps.FIND:
      return findItems(body.query, body.limit, body.byCategory);
    case CatalogOps.BY_UUID:
      return getItemsByUuid(body.uuids);
    case CatalogOps.TAGGED:
      return getTaggedItems(body.tag);
    case CatalogOps.WIKIS:
      return resolveWikiTargets(body.asks);
    case CatalogOps.ADJACENT:
      return getAdjacentNotes(body.uuid, body.filter);
    default:
      return Promise.resolve({ success: false, error: "Unknown catalog request" });
  }
};

export const POST = async (request: NextRequest) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Invalid catalog request" }, { status: 400 });
  }

  const result = await _answer(body as Record<string, unknown>);
  const status = result.success ? 200 : result.error === NOT_SIGNED_IN ? 401 : 400;
  return NextResponse.json(result, { status });
};

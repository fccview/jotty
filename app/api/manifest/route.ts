import { NextRequest, NextResponse } from "next/server";
import { readJsonFile } from "@/app/_server/actions/file";
import path from "path";

export async function GET() {
  const manifest = await readJsonFile(path.join("data", "site.webmanifest"));
  return NextResponse.json(manifest);
}

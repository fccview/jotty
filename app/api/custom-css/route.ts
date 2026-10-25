import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { CUSTOM_CSS } from "@/app/_server/actions/config/palettes";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cssPath = path.join(process.cwd(), CUSTOM_CSS);
    const cssContent = await fs.readFile(cssPath, "utf-8");

    return new NextResponse(cssContent, {
      headers: {
        "Content-Type": "text/css",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    return new NextResponse("", {
      headers: {
        "Content-Type": "text/css",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  }
}

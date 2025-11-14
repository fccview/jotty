import { NextResponse } from "next/server";
import { readJsonFile } from "@/app/_server/actions/file";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const overrideManifest = await readJsonFile(
    path.join("config", "site.webmanifest")
  );

  if (overrideManifest !== null) {
    return NextResponse.json(overrideManifest);
  }

  const manifest = await readJsonFile(path.join("data", "site.webmanifest"));

  if (manifest !== null) {
    return NextResponse.json(manifest);
  }

  return NextResponse.json(
    {
      name: "jotty·page",
      short_name: "jotty·page",
      description:
        "A simple, fast, and lightweight checklist and notes application",
      start_url: "/",
      display: "standalone",
      background_color: "#f0fdfa",
      theme_color: "#f0fdfa",
      orientation: "portrait-primary",
      icons: [
        {
          src: "/app-icons/android-chrome-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable",
        },
        {
          src: "/app-icons/android-chrome-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
        {
          src: "/app-icons/favicon-16x16.png",
          sizes: "16x16",
          type: "image/png",
        },
        {
          src: "/app-icons/favicon-32x32.png",
          sizes: "32x32",
          type: "image/png",
        },
        {
          src: "/app-icons/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
      version: "1762164104517",
    },
    { status: 200 }
  );
}

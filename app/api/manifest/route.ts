import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/app/_server/actions/config";
import { getCurrentUser } from "@/app/_server/actions/users";
import { BUILT_IN_THEMES } from "@/app/_consts/themes";
import { getThemeColors } from "@/app/_consts/colors";

export async function GET(request: NextRequest) {
  try {
    const settings = await getSettings();
    const user = await getCurrentUser();

    const appName =
      settings?.appName ||
      (settings?.isRwMarkable ? "rwMarkable" : "jotty·page");
    const appDescription =
      settings?.appDescription ||
      "A simple, fast, and lightweight checklist and notes application";

    let themeToUse = "system";

    if (user?.preferredTheme && user.preferredTheme !== "system") {
      themeToUse = user.preferredTheme;
    } else if (settings?.isRwMarkable) {
      themeToUse = "rwmarkable-dark";
    }

    const { background: backgroundColor, primary: themeColor } =
      await getThemeColors(themeToUse);

    const manifest = {
      name: appName,
      short_name: settings?.isRwMarkable ? "rwMarkable" : "jotty",
      description: appDescription,
      start_url: "/",
      display: "standalone",
      background_color: backgroundColor,
      theme_color: themeColor,
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
      ],
    };

    console.log("manifest", manifest);

    return new Response(JSON.stringify(manifest), {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error generating manifest:", error);

    const { background: fallbackBg, primary: fallbackTheme } =
      await getThemeColors("dark");
    const fallbackManifest = {
      name: "jotty·page",
      short_name: "jotty",
      description:
        "A simple, fast, and lightweight checklist and notes application",
      start_url: "/",
      display: "standalone",
      background_color: fallbackBg,
      theme_color: fallbackTheme,
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
      ],
    };

    return new Response(JSON.stringify(fallbackManifest), {
      headers: {
        "Content-Type": "application/manifest+json",
      },
    });
  }
}

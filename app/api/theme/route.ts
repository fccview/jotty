import { NextResponse } from "next/server";
import { defineRoute } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { themeSchema } from "@/app/_schemas/api/theme";
import { getSettings } from "@/app/_server/actions/config/settings";
import { loadCustomThemes } from "@/app/_server/actions/config/themes";
import { hasCustomCss, themeFor } from "@/app/_server/actions/config/effective-theme";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "getTheme",
    method: HttpMethod.GET,
    path: "/theme",
    tag: ApiTag.USERS,
    summary: "Get the API key owner's theme",
    description:
      "The colours the owner sees in Jotty, as CSS custom properties, for built-in and custom themes alike. A theme that no longer exists falls back to system. Custom CSS is not included, fetch /api/custom-css when customCss is true.",
    responses: {
      200: { description: "Effective theme", schema: themeSchema },
      401: ERRORS[401],
      500: ERRORS[500],
    },
  },
  async ({ user }) => {
    const [settings, themes, customCss] = await Promise.all([getSettings(), loadCustomThemes(), hasCustomCss()]);
    const theme = await themeFor({
      user,
      customThemes: themes?.["custom-themes"] ?? {},
      isRwMarkable: settings?.isRwMarkable,
      adminRadius: settings?.borderRadius,
      customCss,
    });
    return NextResponse.json({ success: true, data: theme });
  },
);

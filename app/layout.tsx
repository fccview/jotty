import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@/app/_styles/globals.css";
import { ThemeProvider } from "@/app/_providers/ThemeProvider";
import { ChecklistProvider } from "@/app/_providers/ChecklistProvider";
import { AppModeProvider } from "@/app/_providers/AppModeProvider";
import { ToastProvider } from "@/app/_providers/ToastProvider";
import { NavigationGuardProvider } from "@/app/_providers/NavigationGuardProvider";
import { InstallPrompt } from "@/app/_components/GlobalComponents/Prompts/InstallPrompt";
import { UpdatePrompt } from "@/app/_components/GlobalComponents/Pwa/UpdatePrompt";
import { getSettings } from "@/app/_server/actions/config";
import { DynamicFavicon } from "@/app/_components/GlobalComponents/Layout/Logo/DynamicFavicon";
import { ShortcutProvider } from "@/app/_providers/ShortcutsProvider";
import { getCategories } from "@/app/_server/actions/category";
import { Modes } from "./_types/enums";
import { getCurrentUser, getUsers } from "./_server/actions/users";
import { readPackageVersion } from "@/app/_server/actions/config";
import { headers } from "next/headers";
import { themeInitScript } from "./_consts/themes";
import { getThemeColors } from "./_consts/colors";

const inter = Inter({ subsets: ["latin"] });

export const generateMetadata = async (): Promise<Metadata> => {
  const settings = await getSettings();
  const ogName = settings?.isRwMarkable ? "rwMarkable" : "jotty·page";
  const appName = settings?.appName || ogName;
  const appDescription =
    settings?.appDescription ||
    "A simple, fast, and lightweight checklist and notes application";
  const app16x16Icon =
    settings?.["16x16Icon"] || "/app-icons/favicon-16x16.png";
  const app32x32Icon =
    settings?.["32x32Icon"] || "/app-icons/favicon-32x32.png";
  const app180x180Icon =
    settings?.["180x180Icon"] || "/app-icons/apple-touch-icon.png";

  return {
    title: appName,
    description: appDescription,
    manifest: "/api/manifest",
    icons: {
      icon: [
        {
          url: app16x16Icon,
          sizes: "16x16",
          type: "image/png",
        },
        {
          url: app32x32Icon,
          sizes: "32x32",
          type: "image/png",
        },
      ],
      apple: [
        {
          url: app180x180Icon,
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: appName,
    },
  };
};

export async function generateViewport(): Promise<Viewport> {
  const settings = await getSettings();
  const user = await getCurrentUser();

  let themeToUse = "system";

  if (user?.preferredTheme && user.preferredTheme !== "system") {
    themeToUse = user.preferredTheme;
  } else if (settings?.isRwMarkable) {
    themeToUse = "rwmarkable-dark";
  }

  const { primary: themeColor } = await getThemeColors(themeToUse);

  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    themeColor,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = headers().get("x-pathname");
  const settings = await getSettings();
  const appName = settings.appName || "rwMarkable";
  const noteCategories = await getCategories(Modes.NOTES);
  const checklistCategories = await getCategories(Modes.CHECKLISTS);
  const user = await getCurrentUser();
  const appVersion = await readPackageVersion();
  const stopCheckUpdates = process.env.STOP_CHECK_UPDATES?.toLowerCase();
  const users = await getUsers();

  let serveUpdates = true;

  if (
    (stopCheckUpdates &&
      (stopCheckUpdates.toLowerCase() !== "no" ||
        stopCheckUpdates.toLowerCase() !== "false")) ||
    settings?.notifyNewUpdates === "no"
  ) {
    serveUpdates = false;
  }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-rwmarkable={settings?.rwmarkable ? "true" : "false"}
      data-user-theme={user?.preferredTheme || ""}
    >
      <head>
        <link rel="icon" href="/app-icons/favicon.ico" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={appName} />
        <meta name="mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.className} jotty-body`}>
        <AppModeProvider
          isDemoMode={settings?.isDemo || false}
          isRwMarkable={settings?.rwmarkable || false}
          user={user}
          appVersion={appVersion.data || ""}
          pathname={pathname || ""}
          initialSettings={settings}
          usersPublicData={users}
        >
          <ThemeProvider user={user || {}}>
            <ChecklistProvider>
              <NavigationGuardProvider>
                <ToastProvider>
                  <ShortcutProvider
                    user={user}
                    noteCategories={noteCategories.data || []}
                    checklistCategories={checklistCategories.data || []}
                  >
                    <div className="min-h-screen bg-background text-foreground transition-colors jotty-page">
                      <DynamicFavicon />
                      {children}

                      {!pathname?.includes("/public") && <InstallPrompt />}

                      {serveUpdates && !pathname?.includes("/public") && (
                        <UpdatePrompt />
                      )}
                    </div>
                  </ShortcutProvider>
                </ToastProvider>
              </NavigationGuardProvider>
            </ChecklistProvider>
          </ThemeProvider>
        </AppModeProvider>
      </body>
    </html>
  );
}

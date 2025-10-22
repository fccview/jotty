import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@/app/_styles/globals.css";
import { ThemeProvider } from "@/app/_providers/ThemeProvider";
import { ChecklistProvider } from "@/app/_providers/ChecklistProvider";
import { AppModeProvider } from "@/app/_providers/AppModeProvider";
import { ToastProvider } from "@/app/_providers/ToastProvider";
import { NavigationGuardProvider } from "@/app/_providers/NavigationGuardProvider";
import { InstallPrompt } from "@/app/_components/GlobalComponents/Pwa/InstallPrompt";
import { getSettings } from "@/app/_server/actions/config";
import { DynamicFavicon } from "@/app/_components/GlobalComponents/Layout/Logo/DynamicFavicon";
import { redirectGuards } from "./_server/actions/guards";
import { ShortcutProvider } from "@/app/_providers/ShortcutsProvider";
import { getCategories } from "@/app/_server/actions/category";
import { Modes } from "./_types/enums";
import { getCurrentUser } from "./_server/actions/users";

const inter = Inter({ subsets: ["latin"] });

export const generateMetadata = async (): Promise<Metadata> => {
  const settings = await getSettings();
  const ogName = settings?.isRwMarkable
    ? "rwMarkable"
    : "jotty·page";
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
    manifest: "/site.webmanifest",
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  const appName = settings.appName || "rwMarkable";
  const noteCategories = await getCategories(Modes.NOTES);
  const checklistCategories = await getCategories(Modes.CHECKLISTS);
  const user = await getCurrentUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/app-icons/favicon.ico" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={appName} />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className}>
        <AppModeProvider isDemoMode={settings?.isDemo || false} isRwMarkable={settings?.rwmarkable || false}>
          <ThemeProvider>
            <ChecklistProvider>
              <NavigationGuardProvider>
                <ToastProvider>
                  <ShortcutProvider
                    user={user}
                    noteCategories={noteCategories.data || []}
                    checklistCategories={checklistCategories.data || []}
                  >
                    <div className="min-h-screen bg-background text-foreground transition-colors">
                      <DynamicFavicon />
                      {children}
                      <InstallPrompt />
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

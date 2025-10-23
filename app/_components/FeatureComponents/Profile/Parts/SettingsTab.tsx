"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { getAllThemes } from "@/app/_consts/themes";
import { updateUserSettings } from "@/app/_server/actions/users";
import { User, ImageSyntax, TableSyntax, LandingPage } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { Label } from "@/app/_components/GlobalComponents/FormElements/label";
import { useToast } from "@/app/_providers/ToastProvider";

interface SettingsTabProps {
  setShowDeleteModal: (show: boolean) => void;
}

export const SettingsTab = ({ setShowDeleteModal }: SettingsTabProps) => {
  const { isDemoMode, user, setUser } = useAppMode();
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [allThemes, setAllThemes] = useState<
    Array<{ id: string; name: string; icon: any }>
  >([]);
  const [preferredTheme, setPreferredTheme] = useState<string>("");
  const [imageSyntax, setImageSyntax] = useState<ImageSyntax>("markdown");
  const [tableSyntax, setTableSyntax] = useState<TableSyntax>("html");
  const [landingPage, setLandingPage] = useState<LandingPage>(Modes.CHECKLISTS);
  const [initialSettings, setInitialSettings] = useState<Partial<User>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      const themes = await getAllThemes();
      setAllThemes(themes);

      if (user) {
        setPreferredTheme(user.preferredTheme || "system");
        setImageSyntax(user.imageSyntax || "markdown");
        setTableSyntax(user.tableSyntax || "html");
        setLandingPage(user.landingPage || Modes.CHECKLISTS);
        setInitialSettings({
          preferredTheme: user.preferredTheme || "system",
          imageSyntax: user.imageSyntax || "markdown",
          tableSyntax: user.tableSyntax || "html",
          landingPage: user.landingPage || Modes.CHECKLISTS,
        });
      }
      setIsLoading(false);
    };
    loadSettings();
  }, [user]);

  useEffect(() => {
    const currentSettings = {
      preferredTheme,
      imageSyntax,
      tableSyntax,
      landingPage,
    };

    const changed = Object.keys(currentSettings).some(
      (key) =>
        currentSettings[key as keyof typeof currentSettings] !==
        initialSettings[key as keyof typeof initialSettings]
    );
    setHasChanges(changed);
  }, [preferredTheme, imageSyntax, tableSyntax, landingPage, initialSettings]);

  const handleSaveSettings = async () => {
    const result = await updateUserSettings({
      preferredTheme,
      imageSyntax,
      tableSyntax,
      landingPage,
    });
    if (result.success) {
      setInitialSettings({
        preferredTheme,
        imageSyntax,
        tableSyntax,
        landingPage,
      });
      setHasChanges(false);
      router.refresh();
      showToast({
        type: "success",
        title: "Settings saved!",
        message: "Your preferences have been updated.",
      });
    } else {
      console.error("Failed to save settings:", result.error);
      showToast({
        type: "error",
        title: "Failed to save settings",
        message: result.error || "An unknown error occurred.",
      });
    }

    setUser(result.data?.user || null);
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  const imageSyntaxOptions = [
    { id: "markdown", name: "Markdown (e.g., ![alt](url))" },
    { id: "html", name: 'HTML (e.g., <img src="url" alt="alt">)' },
  ];

  const tableSyntaxOptions = [
    { id: "markdown", name: "Markdown (e.g., | Header |)" },
    { id: "html", name: "HTML (e.g., <table><tr><td>)" },
  ];

  const landingPageOptions = [
    { id: "last-visited", name: "Last visited page" },
    { id: Modes.CHECKLISTS, name: "Checklists" },
    { id: Modes.NOTES, name: "Notes" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Account Settings</h2>
      </div>

      <div className="bg-background border border-border rounded-lg p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="preferred-theme">Preferred Theme</Label>
            <Dropdown
              value={preferredTheme}
              onChange={(value) => setPreferredTheme(value)}
              options={allThemes.map((theme) => ({
                id: theme.id,
                name: theme.name,
                icon: theme.icon,
              }))}
              placeholder="Select a theme"
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Choose your preferred theme across all devices.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="table-syntax">Table Syntax in Notes</Label>
            <Dropdown
              value={tableSyntax}
              onChange={(value) => setTableSyntax(value as TableSyntax)}
              options={tableSyntaxOptions}
              placeholder="Select table syntax"
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Choose how tables are rendered in your notes.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="landing-page">Initial Landing Page</Label>
            <Dropdown
              value={landingPage}
              onChange={(value) => setLandingPage(value as LandingPage)}
              options={landingPageOptions}
              placeholder="Select landing page"
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Select the default page to load after logging in.
            </p>
          </div>

          <Button onClick={handleSaveSettings} disabled={!hasChanges}>
            Save Settings
          </Button>
        </div>
      </div>

      <div className="bg-background border border-border rounded-lg p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <h3 className="font-medium">Delete Account</h3>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data
              </p>
            </div>
            {isDemoMode ? (
              <span className="text-sm text-muted-foreground">
                disabled in demo mode
              </span>
            ) : (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setShowDeleteModal(true)}
              >
                Delete Account
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { updateUserSettings } from "@/app/_server/actions/users";
import { User, TableSyntax, LandingPage, NotesDefaultEditor, NotesDefaultMode } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { Label } from "@/app/_components/GlobalComponents/FormElements/label";
import { FormWrapper } from "@/app/_components/GlobalComponents/FormElements/FormWrapper";
import { useToast } from "@/app/_providers/ToastProvider";
import { BUILT_IN_THEMES } from "@/app/_consts/themes";
import {
  themeSettingsSchema,
  editorSettingsSchema,
  navigationSettingsSchema,
} from "@/app/_schemas/user-schemas";

interface SettingsTabProps {
  setShowDeleteModal: (show: boolean) => void;
}

export const SettingsTab = ({ setShowDeleteModal }: SettingsTabProps) => {
  const { isDemoMode, user, setUser } = useAppMode();
  const router = useRouter();
  const { showToast } = useToast();
  const allThemes = BUILT_IN_THEMES;

  const [preferredTheme, setPreferredTheme] = useState<string>(user?.preferredTheme || "system");
  const [notesDefaultEditor, setNotesDefaultEditor] = useState<NotesDefaultEditor>(user?.notesDefaultEditor || "wysiwyg");
  const [tableSyntax, setTableSyntax] = useState<TableSyntax>(user?.tableSyntax || "html");
  const [landingPage, setLandingPage] = useState<LandingPage>(user?.landingPage || Modes.CHECKLISTS);
  const [notesDefaultMode, setNotesDefaultMode] = useState<NotesDefaultMode>(user?.notesDefaultMode || "view");
  const [initialSettings, setInitialSettings] = useState<Partial<User>>({
    preferredTheme: user?.preferredTheme || "system",
    tableSyntax: user?.tableSyntax || "html",
    landingPage: user?.landingPage || Modes.CHECKLISTS,
    notesDefaultEditor: user?.notesDefaultEditor || "wysiwyg",
    notesDefaultMode: user?.notesDefaultMode || "view",
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const hasThemeChanges = preferredTheme !== initialSettings.preferredTheme;
  const hasEditorChanges = notesDefaultEditor !== initialSettings.notesDefaultEditor || tableSyntax !== initialSettings.tableSyntax || notesDefaultMode !== initialSettings.notesDefaultMode;
  const hasNavigationChanges = landingPage !== initialSettings.landingPage;

  const validateAndSave = async <T extends Record<string, any>>(
    settings: T,
    schema: any,
    sectionName: string,
    updateInitialSettings: (prev: Partial<User>) => Partial<User>
  ) => {
    try {
      schema.parse(settings);
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        Object.keys(settings).forEach(key => {
          newErrors[key] = "";
        });
        return newErrors;
      });
    } catch (error: any) {
      if (error.errors) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          errors[err.path[0]] = err.message;
        });
        setValidationErrors(prev => ({ ...prev, ...errors }));
      }
      showToast({
        type: "error",
        title: "Validation Error",
        message: "Please fix the validation errors before saving.",
      });
      return;
    }

    const result = await updateUserSettings(settings);
    if (result.success) {
      setInitialSettings(prev => updateInitialSettings(prev));
      router.refresh();
      showToast({
        type: "success",
        title: `${sectionName} settings saved!`,
        message: `Your ${sectionName.toLowerCase()} preferences have been updated.`,
      });
    } else {
      console.error(`Failed to save ${sectionName.toLowerCase()} settings:`, result.error);
      showToast({
        type: "error",
        title: `Failed to save ${sectionName.toLowerCase()} settings`,
        message: result.error || "An unknown error occurred.",
      });
    }

    setUser(result.data?.user || null);
    router.refresh();
  };

  const handleSaveThemeSettings = () => validateAndSave(
    { preferredTheme },
    themeSettingsSchema,
    "Theme",
    (prev) => ({ ...prev, preferredTheme })
  );

  const handleSaveEditorSettings = () => validateAndSave(
    { notesDefaultEditor, tableSyntax, notesDefaultMode },
    editorSettingsSchema,
    "Notes Preferences",
    (prev) => ({ ...prev, notesDefaultEditor, tableSyntax, notesDefaultMode })
  );

  const handleSaveNavigationSettings = () => validateAndSave(
    { landingPage },
    navigationSettingsSchema,
    "Navigation",
    (prev) => ({ ...prev, landingPage })
  );

  const tableSyntaxOptions = [
    { id: "markdown", name: "Markdown (e.g., | Header |)" },
    { id: "html", name: "HTML (e.g., <table><tr><td>)" },
  ];

  const notesDefaultEditorOptions = [
    { id: "wysiwyg", name: "Rich Text Editor" },
    { id: "markdown", name: "Markdown" },
  ];

  const notesDefaultModeOptions = [
    { id: "edit", name: "Edit" },
    { id: "view", name: "View" },
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

      <FormWrapper
        title="Appearance"
        action={
          <Button
            onClick={handleSaveThemeSettings}
            disabled={!hasThemeChanges}
            size="sm"
          >
            Save Theme
          </Button>
        }
      >
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
          {validationErrors.preferredTheme && (
            <p className="text-sm text-destructive">{validationErrors.preferredTheme}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Choose your preferred theme across all devices.
          </p>
        </div>
      </FormWrapper>

      <FormWrapper
        title="Notes Preferences"
        action={
          <Button
            onClick={handleSaveEditorSettings}
            disabled={!hasEditorChanges}
            size="sm"
          >
            Save Editor
          </Button>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="notes-default-editor">Default Mode</Label>
          <Dropdown
            value={notesDefaultMode}
            onChange={(value) => setNotesDefaultMode(value as NotesDefaultMode)}
            options={notesDefaultModeOptions}
            placeholder="Select notes default mode"
            className="w-full"
          />
          {validationErrors.notesDefaultMode && (
            <p className="text-sm text-destructive">{validationErrors.notesDefaultMode}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Choose if the note is automatically in edit mode or not {notesDefaultModeOptions.find(option => option.id !== notesDefaultMode)?.name} button in the note editor).
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes-default-editor">Default Editor</Label>
          <Dropdown
            value={notesDefaultEditor}
            onChange={(value) => setNotesDefaultEditor(value as NotesDefaultEditor)}
            options={notesDefaultEditorOptions}
            placeholder="Select notes default editor"
            className="w-full"
          />
          {validationErrors.notesDefaultEditor && (
            <p className="text-sm text-destructive">{validationErrors.notesDefaultEditor}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Choose the default editor for your notes - (you can always switch by clicking on the {notesDefaultEditorOptions.find(option => option.id !== notesDefaultEditor)?.name} button in the note editor).
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
          {validationErrors.tableSyntax && (
            <p className="text-sm text-destructive">{validationErrors.tableSyntax}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Choose how tables are rendered in your notes.
          </p>
        </div>
      </FormWrapper>

      <FormWrapper
        title="Navigation"
        action={
          <Button
            onClick={handleSaveNavigationSettings}
            disabled={!hasNavigationChanges}
            size="sm"
          >
            Save Navigation
          </Button>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="landing-page">Initial Landing Page</Label>
          <Dropdown
            value={landingPage}
            onChange={(value) => setLandingPage(value as LandingPage)}
            options={landingPageOptions}
            placeholder="Select landing page"
            className="w-full"
          />
          {validationErrors.landingPage && (
            <p className="text-sm text-destructive">{validationErrors.landingPage}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Select the default page to load after logging in.
          </p>
        </div>
      </FormWrapper>

      <FormWrapper title="Account Management">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <h4 className="font-medium">Delete Account</h4>
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
      </FormWrapper>
    </div>
  );
};

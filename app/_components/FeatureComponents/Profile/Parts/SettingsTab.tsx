"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { updateUserSettings } from "@/app/_server/actions/users";
import {
  User,
  EnableRecurrence,
  ShowCompletedSuggestions,
  TableSyntax,
  LandingPage,
  NotesDefaultEditor,
  NotesDefaultMode,
  NotesAutoSaveInterval,
  FileRenameMode,
  PreferredTimeFormat,
  PreferredDateFormat,
  DisableRichEditor,
  MarkdownTheme,
  DefaultChecklistFilter,
  DefaultNoteFilter,
} from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { Label } from "@/app/_components/GlobalComponents/FormElements/label";
import { FormWrapper } from "@/app/_components/GlobalComponents/FormElements/FormWrapper";
import { useToast } from "@/app/_providers/ToastProvider";
import { getAllThemes } from "@/app/_consts/themes";
import {
  editorSettingsSchema,
  checklistSettingsSchema,
  generalSettingsSchema,
} from "@/app/_schemas/user-schemas";

interface SettingsTabProps {
  setShowDeleteModal: (show: boolean) => void;
}

const getSettingsFromUser = (user: User | null): Partial<User> => ({
  preferredTheme: user?.preferredTheme || "system",
  tableSyntax: user?.tableSyntax || "html",
  landingPage: user?.landingPage || Modes.CHECKLISTS,
  notesDefaultEditor: user?.notesDefaultEditor || "wysiwyg",
  notesDefaultMode: user?.notesDefaultMode || "view",
  notesAutoSaveInterval: user?.notesAutoSaveInterval || 5000,
  enableRecurrence: user?.enableRecurrence || "disable",
  showCompletedSuggestions: user?.showCompletedSuggestions || "enable",
  fileRenameMode: user?.fileRenameMode || "dash-case",
  preferredDateFormat: user?.preferredDateFormat || "dd/mm/yyyy",
  preferredTimeFormat: user?.preferredTimeFormat || "12-hours",
  disableRichEditor: user?.disableRichEditor || "disable",
  markdownTheme: user?.markdownTheme || "prism",
  defaultChecklistFilter: user?.defaultChecklistFilter || "all",
  defaultNoteFilter: user?.defaultNoteFilter || "all",
});

const pick = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};

export const SettingsTab = ({ setShowDeleteModal }: SettingsTabProps) => {
  const { isDemoMode, user, setUser } = useAppMode();
  const router = useRouter();
  const { showToast } = useToast();
  const [allThemes, setAllThemes] = useState<any[]>([]);
  const [loadingThemes, setLoadingThemes] = useState(true);
  const [initialSettings, setInitialSettings] = useState<Partial<User>>(
    getSettingsFromUser(user)
  );
  const [currentSettings, setCurrentSettings] = useState<Partial<User>>(
    getSettingsFromUser(user)
  );
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    const newSettings = getSettingsFromUser(user);
    setInitialSettings(newSettings);
    setCurrentSettings(newSettings);
  }, [user]);

  useEffect(() => {
    const loadThemes = async () => {
      try {
        const themes = await getAllThemes();
        setAllThemes(themes);
      } catch (error) {
        console.error("Failed to load themes:", error);
      } finally {
        setLoadingThemes(false);
      }
    };
    loadThemes();
  }, []);

  const handleSettingChange = <K extends keyof User>(
    key: K,
    value: User[K]
  ) => {
    setCurrentSettings((prev) => ({ ...prev, [key]: value }));
  };

  const hasChanges = (keys: (keyof Partial<User>)[]) => {
    return keys.some((key) => currentSettings[key] !== initialSettings[key]);
  };

  const hasGeneralChanges = hasChanges([
    "preferredTheme",
    "landingPage",
    "fileRenameMode",
    "preferredDateFormat",
    "preferredTimeFormat",
  ]);
  const hasEditorChanges = hasChanges([
    "notesDefaultEditor",
    "tableSyntax",
    "notesDefaultMode",
    "notesAutoSaveInterval",
    "disableRichEditor",
    "defaultNoteFilter",
    "markdownTheme",
  ]);
  const hasChecklistsChanges = hasChanges([
    "enableRecurrence",
    "showCompletedSuggestions",
    "defaultChecklistFilter",
  ]);

  const validateAndSave = async <T extends Record<string, any>>(
    settings: T,
    schema: any,
    sectionName: string,
    updateInitialSettings: (prev: Partial<User>) => Partial<User>
  ) => {
    try {
      schema.parse(settings);
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        Object.keys(settings).forEach((key) => {
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
        setValidationErrors((prev) => ({ ...prev, ...errors }));
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
      setInitialSettings((prev) => updateInitialSettings(prev));
      router.refresh();
      showToast({
        type: "success",
        title: `${sectionName} settings saved!`,
        message: `Your ${sectionName.toLowerCase()} preferences have been updated.`,
      });
    } else {
      console.error(
        `Failed to save ${sectionName.toLowerCase()} settings:`,
        result.error
      );
      showToast({
        type: "error",
        title: `Failed to save ${sectionName.toLowerCase()} settings`,
        message: result.error || "An unknown error occurred.",
      });
    }

    setUser(result.data?.user || null);
    router.refresh();
  };

  const handleSaveSection = (
    keys: (keyof User)[],
    schema: any,
    sectionName: string
  ) => {
    const settingsToSave = pick(currentSettings, keys);

    validateAndSave(settingsToSave, schema, sectionName, (prev) => ({
      ...prev,
      ...settingsToSave,
    }));
  };

  const dateFormatOptions = [
    { id: "dd/mm/yyyy", name: "DD/MM/YYYY" },
    { id: "mm/dd/yyyy", name: "MM/DD/YYYY" },
  ];

  const timeFormatOptions = [
    { id: "12-hours", name: "12 hours" },
    { id: "24-hours", name: "24 hours" },
  ];

  const tableSyntaxOptions = [
    { id: "markdown", name: "Markdown (e.g., | Header |)" },
    { id: "html", name: "HTML (e.g., <table><tr><td>)" },
  ];

  const markdownThemeOptions = [
    { id: "prism", name: "Default" },
    { id: "prism-dark", name: "Dark" },
    { id: "prism-funky", name: "Funky" },
    { id: "prism-okaidia", name: "Okaidia" },
    { id: "prism-tomorrow", name: "Tomorrow" },
    { id: "prism-twilight", name: "Twilight" },
    { id: "prism-coy", name: "Coy" },
    { id: "prism-solarizedlight", name: "Solarized Light" },
  ];

  const autoSaveIntervalOptions = [
    { id: 0, name: "Disabled" },
    { id: 1000, name: "1 second" },
    { id: 5000, name: "5 seconds" },
    { id: 10000, name: "10 seconds" },
    { id: 15000, name: "15 seconds" },
    { id: 20000, name: "20 seconds" },
    { id: 25000, name: "25 seconds" },
    { id: 30000, name: "30 seconds" },
  ];

  const notesDefaultEditorOptions = [
    { id: "wysiwyg", name: "Rich Text Editor" },
    { id: "markdown", name: "Markdown" },
  ];

  const notesDefaultModeOptions = [
    { id: "edit", name: "Edit" },
    { id: "view", name: "View" },
  ];

  const enableRecurrenceOptions = [
    { id: "enable", name: "Enable" },
    { id: "disable", name: "Disable" },
  ];

  const showCompletedSuggestionsOptions = [
    { id: "enable", name: "Enable" },
    { id: "disable", name: "Disable" },
  ];

  const fileRenameModeOptions = [
    { id: "dash-case", name: "Dash case (e.g., my-file-name.md)" },
    { id: "minimal", name: "Minimal (remove invalid characters only)" },
    { id: "none", name: "No rename (keep original filename)" },
  ];

  const landingPageOptions = [
    { id: "last-visited", name: "Last visited page" },
    { id: Modes.CHECKLISTS, name: "Checklists" },
    { id: Modes.NOTES, name: "Notes" },
  ];

  const defaultChecklistFilterOptions = [
    { id: "all", name: "All Checklists" },
    { id: "completed", name: "Completed" },
    { id: "incomplete", name: "Incomplete" },
    { id: "pinned", name: "Pinned" },
    { id: "task", name: "Task Lists" },
    { id: "simple", name: "Simple Lists" },
  ];

  const defaultNoteFilterOptions = [
    { id: "all", name: "All Notes" },
    { id: "recent", name: "Recent" },
    { id: "pinned", name: "Pinned" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Account Settings</h2>
      </div>

      <FormWrapper
        title="General"
        action={
          <Button
            onClick={() =>
              handleSaveSection(
                [
                  "preferredTheme",
                  "landingPage",
                  "fileRenameMode",
                  "preferredDateFormat",
                  "preferredTimeFormat",
                ],
                generalSettingsSchema,
                "General"
              )
            }
            disabled={!hasGeneralChanges}
            size="sm"
          >
            Save General
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="preferred-theme">Preferred Theme</Label>
            {loadingThemes ? (
              <div className="text-sm text-muted-foreground">
                Loading themes...
              </div>
            ) : (
              <Dropdown
                value={currentSettings.preferredTheme || "system"}
                onChange={(value) =>
                  handleSettingChange("preferredTheme", value)
                }
                options={allThemes.map((theme) => ({
                  id: theme.id,
                  name: theme.name,
                  icon: theme.icon,
                }))}
                placeholder="Select a theme"
                className="w-full"
              />
            )}
            {validationErrors.preferredTheme && (
              <p className="text-sm text-destructive">
                {validationErrors.preferredTheme}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Choose your preferred theme across all devices.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="landing-page">Initial Landing Page</Label>
            <Dropdown
              value={currentSettings.landingPage || Modes.CHECKLISTS}
              onChange={(value) =>
                handleSettingChange("landingPage", value as LandingPage)
              }
              options={landingPageOptions}
              placeholder="Select landing page"
              className="w-full"
            />
            {validationErrors.landingPage && (
              <p className="text-sm text-destructive">
                {validationErrors.landingPage}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Select the default page to load after logging in.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-rename-mode">File Rename Mode</Label>
            <Dropdown
              value={currentSettings.fileRenameMode || "dash-case"}
              onChange={(value) =>
                handleSettingChange("fileRenameMode", value as FileRenameMode)
              }
              options={fileRenameModeOptions}
              placeholder="Select file rename mode"
              className="w-full"
            />
            {validationErrors.fileRenameMode && (
              <p className="text-sm text-destructive">
                {validationErrors.fileRenameMode}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Choose how files are renamed when saving notes and checklists.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferred-date-format">Preferred Date Format</Label>
            <Dropdown
              value={currentSettings.preferredDateFormat || "dd/mm/yyyy"}
              onChange={(value) =>
                handleSettingChange(
                  "preferredDateFormat",
                  value as PreferredDateFormat
                )
              }
              options={dateFormatOptions}
              placeholder="Select date format"
              className="w-full"
            />
            {validationErrors.preferredDateFormat && (
              <p className="text-sm text-destructive">
                {validationErrors.preferredDateFormat}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Choose your preferred date format.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferred-time-format">Preferred Time Format</Label>
            <Dropdown
              value={currentSettings.preferredTimeFormat || "12-hours"}
              onChange={(value) =>
                handleSettingChange(
                  "preferredTimeFormat",
                  value as PreferredTimeFormat
                )
              }
              options={timeFormatOptions}
              placeholder="Select time format"
              className="w-full"
            />
            {validationErrors.preferredTimeFormat && (
              <p className="text-sm text-destructive">
                {validationErrors.preferredTimeFormat}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Choose your preferred time format.
            </p>
          </div>
        </div>
      </FormWrapper>

      <FormWrapper
        title="Notes Preferences"
        action={
          <Button
            onClick={() =>
              handleSaveSection(
                [
                  "notesAutoSaveInterval",
                  "notesDefaultMode",
                  "notesDefaultEditor",
                  "tableSyntax",
                  "disableRichEditor",
                  "defaultNoteFilter",
                  "markdownTheme",
                ],
                editorSettingsSchema,
                "Notes Preferences"
              )
            }
            disabled={!hasEditorChanges}
            size="sm"
          >
            Save Editor
          </Button>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="auto-save-interval">Auto Save Interval</Label>
          <Dropdown
            value={currentSettings.notesAutoSaveInterval || 5000}
            onChange={(value) =>
              handleSettingChange(
                "notesAutoSaveInterval",
                parseInt(value) as NotesAutoSaveInterval
              )
            }
            options={autoSaveIntervalOptions}
            placeholder="Select auto save interval"
            className="w-full"
          />
          {validationErrors.notesAutoSaveInterval && (
            <p className="text-sm text-destructive">
              {validationErrors.notesAutoSaveInterval}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Choose the interval for automatic saving of your notes.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes-default-editor">Default Mode</Label>
          <Dropdown
            value={currentSettings.notesDefaultMode || "view"}
            onChange={(value) =>
              handleSettingChange("notesDefaultMode", value as NotesDefaultMode)
            }
            options={notesDefaultModeOptions}
            placeholder="Select notes default mode"
            className="w-full"
          />
          {validationErrors.notesDefaultMode && (
            <p className="text-sm text-destructive">
              {validationErrors.notesDefaultMode}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Choose if the note is automatically in edit mode or not{" "}
            {
              notesDefaultModeOptions.find(
                (option) => option.id !== currentSettings.notesDefaultMode
              )?.name
            }{" "}
            button in the note editor).
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes-default-editor">Default Editor</Label>
          <Dropdown
            value={currentSettings.notesDefaultEditor || "wysiwyg"}
            onChange={(value) =>
              handleSettingChange(
                "notesDefaultEditor",
                value as NotesDefaultEditor
              )
            }
            options={notesDefaultEditorOptions}
            placeholder="Select notes default editor"
            className="w-full"
          />
          {validationErrors.notesDefaultEditor && (
            <p className="text-sm text-destructive">
              {validationErrors.notesDefaultEditor}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Choose the default editor for your notes - (you can always switch by
            clicking on the{" "}
            {
              notesDefaultEditorOptions.find(
                (option) => option.id !== currentSettings.notesDefaultEditor
              )?.name
            }{" "}
            button in the note editor).
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="table-syntax">Table Syntax in Notes</Label>
          <Dropdown
            value={currentSettings.tableSyntax || "html"}
            onChange={(value) =>
              handleSettingChange("tableSyntax", value as TableSyntax)
            }
            options={tableSyntaxOptions}
            placeholder="Select table syntax"
            className="w-full"
          />
          {validationErrors.tableSyntax && (
            <p className="text-sm text-destructive">
              {validationErrors.tableSyntax}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Choose how tables are rendered in your notes.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="markdown-theme">Markdown Syntax Theme</Label>
          <Dropdown
            value={currentSettings.markdownTheme || "prism"}
            onChange={(value) =>
              handleSettingChange("markdownTheme", value as MarkdownTheme)
            }
            options={markdownThemeOptions}
            placeholder="Select syntax theme"
            className="w-full"
          />
          {validationErrors.markdownTheme && (
            <p className="text-sm text-destructive">
              {validationErrors.markdownTheme}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Choose the syntax highlighting theme for the markdown editor.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="disable-rich-editor">
            Minimal Mode (Disable Rich Text Editor)
          </Label>
          <Dropdown
            value={currentSettings.disableRichEditor || "disable"}
            onChange={(value) => {
              handleSettingChange(
                "disableRichEditor",
                value as DisableRichEditor
              );
            }}
            options={[
              { id: "disable", name: "Use Rich Text Editor" },
              { id: "enable", name: "Markdown Only" },
            ]}
            placeholder="Select minimal mode"
            className="w-full"
          />
          {validationErrors.disableRichEditor && (
            <p className="text-sm text-destructive">
              {validationErrors.disableRichEditor}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            When enabled, uses a simple markdown renderer instead of the rich
            text editor. Advanced features like bilateral linking will not work
            in this mode.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="default-note-filter">Default Note Filter</Label>
          <Dropdown
            value={currentSettings.defaultNoteFilter || "all"}
            onChange={(value) =>
              handleSettingChange(
                "defaultNoteFilter",
                value as DefaultNoteFilter
              )
            }
            options={defaultNoteFilterOptions}
            placeholder="Select default note filter"
            className="w-full"
          />
          {validationErrors.defaultNoteFilter && (
            <p className="text-sm text-destructive">
              {validationErrors.defaultNoteFilter}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Choose the default filter to apply when opening the Notes page.
          </p>
        </div>
      </FormWrapper>

      <FormWrapper
        title="Checklists Preferences"
        action={
          <Button
            onClick={() =>
              handleSaveSection(
                [
                  "enableRecurrence",
                  "showCompletedSuggestions",
                  "defaultChecklistFilter",
                ],
                checklistSettingsSchema,
                "Checklists"
              )
            }
            disabled={!hasChecklistsChanges}
            size="sm"
          >
            Save Checklists
          </Button>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="enable-recurrence">
            Recurring checklists{" "}
            <span className="text-sm text-muted-foreground">(Beta)</span>
          </Label>
          <Dropdown
            value={currentSettings.enableRecurrence || "disable"}
            onChange={(value) =>
              handleSettingChange("enableRecurrence", value as EnableRecurrence)
            }
            options={enableRecurrenceOptions}
            placeholder="Select enable to add recurring checklists"
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="show-completed-suggestions">
            Show completed tasks as suggestions
          </Label>
          <Dropdown
            value={currentSettings.showCompletedSuggestions || "enable"}
            onChange={(value) =>
              handleSettingChange(
                "showCompletedSuggestions",
                value as ShowCompletedSuggestions
              )
            }
            options={showCompletedSuggestionsOptions}
            placeholder="Select whether to show completed tasks as suggestions"
            className="w-full"
          />
          <p className="text-sm text-muted-foreground">
            When adding new tasks, show completed tasks as suggestions that can
            be re-enabled.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="default-checklist-filter">
            Default Checklist Filter
          </Label>
          <Dropdown
            value={currentSettings.defaultChecklistFilter || "all"}
            onChange={(value) =>
              handleSettingChange(
                "defaultChecklistFilter",
                value as DefaultChecklistFilter
              )
            }
            options={defaultChecklistFilterOptions}
            placeholder="Select default checklist filter"
            className="w-full"
          />
          {validationErrors.defaultChecklistFilter && (
            <p className="text-sm text-destructive">
              {validationErrors.defaultChecklistFilter}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Choose the default filter to apply when opening the Checklists page.
          </p>
        </div>
      </FormWrapper>

      <FormWrapper title="Account Management">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-jotty">
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
                variant="destructive"
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

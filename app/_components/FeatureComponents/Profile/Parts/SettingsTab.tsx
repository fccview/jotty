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
import { useTranslations } from "next-intl";

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
  const t = useTranslations();
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
  ]);
  const hasChecklistsChanges = hasChanges([
    "enableRecurrence",
    "showCompletedSuggestions",
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
        title: t("profile.validation_error"),
        message: t("profile.fix_validation_errors"),
      });
      return;
    }

    const result = await updateUserSettings(settings);
    if (result.success) {
      setInitialSettings((prev) => updateInitialSettings(prev));
      router.refresh();
      showToast({
        type: "success",
        title: t("profile.settings_saved", { section: sectionName }),
        message: t("profile.preferences_updated", {
          section: sectionName.toLowerCase(),
        }),
      });
    } else {
      console.error(
        `Failed to save ${sectionName.toLowerCase()} settings:`,
        result.error
      );
      showToast({
        type: "error",
        title: t("profile.failed_to_save_settings", {
          section: sectionName.toLowerCase(),
        }),
        message: result.error || t("profile.unknown_error"),
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
    { id: "markdown", name: t("profile.table_syntax_markdown") },
    { id: "html", name: t("profile.table_syntax_html") },
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
    { id: "wysiwyg", name: t("profile.editor_rich_text") },
    { id: "markdown", name: t("profile.editor_markdown") },
  ];

  const notesDefaultModeOptions = [
    { id: "edit", name: t("profile.mode_edit") },
    { id: "view", name: t("profile.mode_view") },
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
    { id: "last-visited", name: t("profile.landing_last_visited") },
    { id: Modes.CHECKLISTS, name: t("profile.landing_checklists") },
    { id: Modes.NOTES, name: t("profile.landing_notes") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("profile.account_settings")}</h2>
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
        title={t("profile.notes_preferences")}
        action={
          <Button
            onClick={() =>
              handleSaveSection(
                [
                  "notesAutoSaveInterval",
                  "notesDefaultMode",
                  "notesDefaultEditor",
                  "tableSyntax",
                ],
                editorSettingsSchema,
                "Notes Preferences"
              )
            }
            disabled={!hasEditorChanges}
            size="sm"
          >
            {t("profile.save_editor")}
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
            placeholder={t("profile.select_default_mode")}
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
          <Label htmlFor="notes-default-editor">
            {t("profile.default_editor")}
          </Label>
          <Dropdown
            value={currentSettings.notesDefaultEditor || "wysiwyg"}
            onChange={(value) =>
              handleSettingChange(
                "notesDefaultEditor",
                value as NotesDefaultEditor
              )
            }
            options={notesDefaultEditorOptions}
            placeholder={t("profile.select_default_editor")}
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
          <Label htmlFor="table-syntax">{t("profile.table_syntax")}</Label>
          <Dropdown
            value={currentSettings.tableSyntax || "html"}
            onChange={(value) =>
              handleSettingChange("tableSyntax", value as TableSyntax)
            }
            options={tableSyntaxOptions}
            placeholder={t("profile.select_table_syntax")}
            className="w-full"
          />
          {validationErrors.tableSyntax && (
            <p className="text-sm text-destructive">
              {validationErrors.tableSyntax}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {t("profile.table_syntax_description")}
          </p>
        </div>
      </FormWrapper>

      <FormWrapper
        title="Checklists Preferences"
        action={
          <Button
            onClick={() =>
              handleSaveSection(
                ["enableRecurrence", "showCompletedSuggestions"],
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
      </FormWrapper>

      <FormWrapper title={t("profile.account_management")}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <h4 className="font-medium">{t("profile.delete_account")}</h4>
              <p className="text-sm text-muted-foreground">
                {t("profile.delete_account_description")}
              </p>
            </div>
            {isDemoMode ? (
              <span className="text-sm text-muted-foreground">
                {t("profile.disabled_in_demo")}
              </span>
            ) : (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setShowDeleteModal(true)}
              >
                {t("profile.delete_account")}
              </Button>
            )}
          </div>
        </div>
      </FormWrapper>
    </div>
  );
};

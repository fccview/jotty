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
import { useTranslations } from "next-intl";

interface SettingsTabProps {
  setShowDeleteModal: (show: boolean) => void;
}

export const SettingsTab = ({ setShowDeleteModal }: SettingsTabProps) => {
  const { isDemoMode, user, setUser } = useAppMode();
  const router = useRouter();
  const { showToast } = useToast();
  const t = useTranslations();
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
        title: t("profile.validation_error"),
        message: t("profile.fix_validation_errors"),
      });
      return;
    }

    const result = await updateUserSettings(settings);
    if (result.success) {
      setInitialSettings(prev => updateInitialSettings(prev));
      router.refresh();
      showToast({
        type: "success",
        title: t("profile.settings_saved", { section: sectionName }),
        message: t("profile.preferences_updated", { section: sectionName.toLowerCase() }),
      });
    } else {
      console.error(`Failed to save ${sectionName.toLowerCase()} settings:`, result.error);
      showToast({
        type: "error",
        title: t("profile.failed_to_save_settings", { section: sectionName.toLowerCase() }),
        message: result.error || t("profile.unknown_error"),
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
    { id: "markdown", name: t("profile.table_syntax_markdown") },
    { id: "html", name: t("profile.table_syntax_html") },
  ];

  const notesDefaultEditorOptions = [
    { id: "wysiwyg", name: t("profile.editor_rich_text") },
    { id: "markdown", name: t("profile.editor_markdown") },
  ];

  const notesDefaultModeOptions = [
    { id: "edit", name: t("profile.mode_edit") },
    { id: "view", name: t("profile.mode_view") },
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
        title={t("profile.appearance")}
        action={
          <Button
            onClick={handleSaveThemeSettings}
            disabled={!hasThemeChanges}
            size="sm"
          >
            {t("profile.save_theme")}
          </Button>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="preferred-theme">{t("profile.preferred_theme")}</Label>
          <Dropdown
            value={preferredTheme}
            onChange={(value) => setPreferredTheme(value)}
            options={allThemes.map((theme) => ({
              id: theme.id,
              name: theme.name,
              icon: theme.icon,
            }))}
            placeholder={t("profile.select_theme")}
            className="w-full"
          />
          {validationErrors.preferredTheme && (
            <p className="text-sm text-destructive">{validationErrors.preferredTheme}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {t("profile.theme_description")}
          </p>
        </div>
      </FormWrapper>

      <FormWrapper
        title={t("profile.notes_preferences")}
        action={
          <Button
            onClick={handleSaveEditorSettings}
            disabled={!hasEditorChanges}
            size="sm"
          >
            {t("profile.save_editor")}
          </Button>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="notes-default-editor">{t("profile.default_mode")}</Label>
          <Dropdown
            value={notesDefaultMode}
            onChange={(value) => setNotesDefaultMode(value as NotesDefaultMode)}
            options={notesDefaultModeOptions}
            placeholder={t("profile.select_default_mode")}
            className="w-full"
          />
          {validationErrors.notesDefaultMode && (
            <p className="text-sm text-destructive">{validationErrors.notesDefaultMode}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {t("profile.default_mode_description", { mode: notesDefaultModeOptions.find(option => option.id !== notesDefaultMode)?.name || "" })}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes-default-editor">{t("profile.default_editor")}</Label>
          <Dropdown
            value={notesDefaultEditor}
            onChange={(value) => setNotesDefaultEditor(value as NotesDefaultEditor)}
            options={notesDefaultEditorOptions}
            placeholder={t("profile.select_default_editor")}
            className="w-full"
          />
          {validationErrors.notesDefaultEditor && (
            <p className="text-sm text-destructive">{validationErrors.notesDefaultEditor}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {t("profile.default_editor_description", { editor: notesDefaultEditorOptions.find(option => option.id !== notesDefaultEditor)?.name || "" })}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="table-syntax">{t("profile.table_syntax")}</Label>
          <Dropdown
            value={tableSyntax}
            onChange={(value) => setTableSyntax(value as TableSyntax)}
            options={tableSyntaxOptions}
            placeholder={t("profile.select_table_syntax")}
            className="w-full"
          />
          {validationErrors.tableSyntax && (
            <p className="text-sm text-destructive">{validationErrors.tableSyntax}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {t("profile.table_syntax_description")}
          </p>
        </div>
      </FormWrapper>

      <FormWrapper
        title={t("profile.navigation")}
        action={
          <Button
            onClick={handleSaveNavigationSettings}
            disabled={!hasNavigationChanges}
            size="sm"
          >
            {t("profile.save_navigation")}
          </Button>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="landing-page">{t("profile.initial_landing_page")}</Label>
          <Dropdown
            value={landingPage}
            onChange={(value) => setLandingPage(value as LandingPage)}
            options={landingPageOptions}
            placeholder={t("profile.select_landing_page")}
            className="w-full"
          />
          {validationErrors.landingPage && (
            <p className="text-sm text-destructive">{validationErrors.landingPage}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {t("profile.landing_page_description")}
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

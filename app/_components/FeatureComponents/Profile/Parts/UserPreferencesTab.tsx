"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { updateUserSettings } from "@/app/_server/actions/users";
import { useTranslations } from "next-intl";
import {
  User,
  Category,
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
  QuickCreateNotes,
} from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { CategoryTreeSelector } from "@/app/_components/GlobalComponents/Dropdowns/CategoryTreeSelector";
import { Label } from "@/app/_components/GlobalComponents/FormElements/label";
import { FormWrapper } from "@/app/_components/GlobalComponents/FormElements/FormWrapper";
import { useToast } from "@/app/_providers/ToastProvider";
import { getAllThemes } from "@/app/_consts/themes";
import {
  editorSettingsSchema,
  checklistSettingsSchema,
  generalSettingsSchema,
} from "@/app/_schemas/user-schemas";
import { DeleteAccountModal } from "@/app/_components/GlobalComponents/Modals/UserModals/DeleteAccountModal";

interface SettingsTabProps {
  noteCategories: Category[];
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
  quickCreateNotes: user?.quickCreateNotes || "disable",
  quickCreateNotesCategory: user?.quickCreateNotesCategory || "",
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

export const UserPreferencesTab = ({ noteCategories }: SettingsTabProps) => {
  const t = useTranslations();
  const { isDemoMode, user, setUser } = useAppMode();
  const router = useRouter();
  const { showToast } = useToast();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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
    "quickCreateNotes",
    "quickCreateNotesCategory",
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
        title: t("errors.validationError"),
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
    { id: "12-hours", name: t('settings.hours12') },
    { id: "24-hours", name: t('settings.hours24') },
  ];

  const tableSyntaxOptions = [
    { id: "markdown", name: t('settings.markdownTableSyntax') },
    { id: "html", name: t('settings.htmlTableSyntax') },
  ];

  const markdownThemeOptions = [
    { id: "prism", name: t('settings.default') },
    { id: "prism-dark", name: t('settings.dark') },
    { id: "prism-funky", name: t('settings.funky') },
    { id: "prism-okaidia", name: t('settings.okaidia') },
    { id: "prism-tomorrow", name: t('settings.tomorrow') },
    { id: "prism-twilight", name: t('settings.twilight') },
    { id: "prism-coy", name: t('settings.coy') },
    { id: "prism-solarizedlight", name: t('settings.solarizedLight') },
  ];

  const autoSaveIntervalOptions = [
    { id: 0, name: t('settings.disabled') },
    { id: 1000, name: t('settings.seconds', { count: 1 }) },
    { id: 5000, name: t('settings.seconds', { count: 5 }) },
    { id: 10000, name: t('settings.seconds', { count: 10 }) },
    { id: 15000, name: t('settings.seconds', { count: 15 }) },
    { id: 20000, name: t('settings.seconds', { count: 20 }) },
    { id: 25000, name: t('settings.seconds', { count: 25 }) },
    { id: 30000, name: t('settings.seconds', { count: 30 }) },
  ];

  const notesDefaultEditorOptions = [
    { id: "wysiwyg", name: t('settings.richTextEditor') },
    { id: "markdown", name: t('settings.markdown') },
  ];

  const notesDefaultModeOptions = [
    { id: "edit", name: t('settings.edit') },
    { id: "view", name: t('settings.view') },
  ];

  const enableRecurrenceOptions = [
    { id: "enable", name: t('settings.enable') },
    { id: "disable", name: t('settings.disable') },
  ];

  const showCompletedSuggestionsOptions = [
    { id: "enable", name: t('settings.enable') },
    { id: "disable", name: t('settings.disable') },
  ];

  const fileRenameModeOptions = [
    { id: "dash-case", name: t('settings.dashCase') },
    { id: "minimal", name: t('settings.minimal') },
    { id: "none", name: t('settings.noRename') },
  ];

  const landingPageOptions = [
    { id: "last-visited", name: t('settings.lastVisitedPage') },
    { id: Modes.CHECKLISTS, name: t('checklists.title') },
    { id: Modes.NOTES, name: t('notes.title') },
  ];

  const defaultChecklistFilterOptions = [
    { id: "all", name: t('checklists.allChecklists') },
    { id: "completed", name: t('checklists.completed') },
    { id: "incomplete", name: t('checklists.incomplete') },
    { id: "pinned", name: t('common.pinned') },
    { id: "task", name: t('checklists.taskLists') },
    { id: "simple", name: t('checklists.simpleLists') },
  ];

  const defaultNoteFilterOptions = [
    { id: "all", name: t('notes.allNotes') },
    { id: "recent", name: t('notes.recent') },
    { id: "pinned", name: t('common.pinned') },
  ];

  return (
    <div className="space-y-6">
      <FormWrapper
        title={t('settings.general')}
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
            {t('settings.saveGeneral')}
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="preferred-theme">{t('settings.preferredTheme')}</Label>
            {loadingThemes ? (
              <div className="text-sm text-muted-foreground">
                {t('settings.loadingThemes')}
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
                placeholder={t('settings.selectTheme')}
                className="w-full"
              />
            )}
            {validationErrors.preferredTheme && (
              <p className="text-sm text-destructive">
                {validationErrors.preferredTheme}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {t('settings.choosePreferredTheme')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="landing-page">{t('settings.initialLandingPage')}</Label>
            <Dropdown
              value={currentSettings.landingPage || Modes.CHECKLISTS}
              onChange={(value) =>
                handleSettingChange("landingPage", value as LandingPage)
              }
              options={landingPageOptions}
              placeholder={t('settings.selectLandingPage')}
              className="w-full"
            />
            {validationErrors.landingPage && (
              <p className="text-sm text-destructive">
                {validationErrors.landingPage}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {t('settings.selectDefaultPageAfterLogin')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-rename-mode">{t('settings.fileRenameMode')}</Label>
            <Dropdown
              value={currentSettings.fileRenameMode || "dash-case"}
              onChange={(value) =>
                handleSettingChange("fileRenameMode", value as FileRenameMode)
              }
              options={fileRenameModeOptions}
              placeholder={t('settings.selectFileRenameMode')}
              className="w-full"
            />
            {validationErrors.fileRenameMode && (
              <p className="text-sm text-destructive">
                {validationErrors.fileRenameMode}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {t('settings.chooseFileRenameMode')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferred-date-format">{t('settings.preferredDateFormat')}</Label>
            <Dropdown
              value={currentSettings.preferredDateFormat || "dd/mm/yyyy"}
              onChange={(value) =>
                handleSettingChange(
                  "preferredDateFormat",
                  value as PreferredDateFormat
                )
              }
              options={dateFormatOptions}
              placeholder={t('settings.selectDateFormat')}
              className="w-full"
            />
            {validationErrors.preferredDateFormat && (
              <p className="text-sm text-destructive">
                {validationErrors.preferredDateFormat}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {t('settings.choosePreferredDateFormat')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferred-time-format">{t('settings.preferredTimeFormat')}</Label>
            <Dropdown
              value={currentSettings.preferredTimeFormat || "12-hours"}
              onChange={(value) =>
                handleSettingChange(
                  "preferredTimeFormat",
                  value as PreferredTimeFormat
                )
              }
              options={timeFormatOptions}
              placeholder={t('settings.selectTimeFormat')}
              className="w-full"
            />
            {validationErrors.preferredTimeFormat && (
              <p className="text-sm text-destructive">
                {validationErrors.preferredTimeFormat}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {t('settings.choosePreferredTimeFormat')}
            </p>
          </div>
        </div>
      </FormWrapper>

      <FormWrapper
        title={t('settings.notesPreferences')}
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
                  "quickCreateNotes",
                  "quickCreateNotesCategory",
                ],
                editorSettingsSchema,
                "Notes Preferences"
              )
            }
            disabled={!hasEditorChanges}
            size="sm"
          >
            {t('settings.saveEditor')}
          </Button>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="auto-save-interval">{t('settings.autoSaveInterval')}</Label>
          <Dropdown
            value={currentSettings.notesAutoSaveInterval || 5000}
            onChange={(value) =>
              handleSettingChange(
                "notesAutoSaveInterval",
                parseInt(value) as NotesAutoSaveInterval
              )
            }
            options={autoSaveIntervalOptions}
            placeholder={t('settings.selectAutoSaveInterval')}
            className="w-full"
          />
          {validationErrors.notesAutoSaveInterval && (
            <p className="text-sm text-destructive">
              {validationErrors.notesAutoSaveInterval}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {t('settings.chooseAutoSaveInterval')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes-default-editor">{t('settings.defaultMode')}</Label>
          <Dropdown
            value={currentSettings.notesDefaultMode || "view"}
            onChange={(value) =>
              handleSettingChange("notesDefaultMode", value as NotesDefaultMode)
            }
            options={notesDefaultModeOptions}
            placeholder={t('settings.selectNotesDefaultMode')}
            className="w-full"
          />
          {validationErrors.notesDefaultMode && (
            <p className="text-sm text-destructive">
              {validationErrors.notesDefaultMode}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {t('settings.chooseNotesDefaultMode', {
              mode: notesDefaultModeOptions.find(
                (option) => option.id !== currentSettings.notesDefaultMode
              )?.name || ""
            })}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes-default-editor">{t('settings.defaultEditor')}</Label>
          <Dropdown
            value={currentSettings.notesDefaultEditor || "wysiwyg"}
            onChange={(value) =>
              handleSettingChange(
                "notesDefaultEditor",
                value as NotesDefaultEditor
              )
            }
            options={notesDefaultEditorOptions}
            placeholder={t('settings.selectNotesDefaultEditor')}
            className="w-full"
          />
          {validationErrors.notesDefaultEditor && (
            <p className="text-sm text-destructive">
              {validationErrors.notesDefaultEditor}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {t('settings.chooseDefaultEditor', {
              editor: notesDefaultEditorOptions.find(
                (option) => option.id !== currentSettings.notesDefaultEditor
              )?.name || ""
            })}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="table-syntax">{t('settings.tableSyntaxInNotes')}</Label>
          <Dropdown
            value={currentSettings.tableSyntax || "html"}
            onChange={(value) =>
              handleSettingChange("tableSyntax", value as TableSyntax)
            }
            options={tableSyntaxOptions}
            placeholder={t('settings.selectTableSyntax')}
            className="w-full"
          />
          {validationErrors.tableSyntax && (
            <p className="text-sm text-destructive">
              {validationErrors.tableSyntax}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {t('settings.chooseTableSyntax')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="markdown-theme">{t('settings.markdownSyntaxTheme')}</Label>
          <Dropdown
            value={currentSettings.markdownTheme || "prism"}
            onChange={(value) =>
              handleSettingChange("markdownTheme", value as MarkdownTheme)
            }
            options={markdownThemeOptions}
            placeholder={t('settings.selectSyntaxTheme')}
            className="w-full"
          />
          {validationErrors.markdownTheme && (
            <p className="text-sm text-destructive">
              {validationErrors.markdownTheme}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {t('settings.chooseSyntaxTheme')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="disable-rich-editor">
            {t('settings.minimalMode')}
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
              { id: "disable", name: t('settings.useRichTextEditor') },
              { id: "enable", name: t('settings.markdownOnly') },
            ]}
            placeholder={t('settings.selectMinimalMode')}
            className="w-full"
          />
          {validationErrors.disableRichEditor && (
            <p className="text-sm text-destructive">
              {validationErrors.disableRichEditor}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {t('settings.minimalModeDescription')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="default-note-filter">{t('settings.defaultNoteFilter')}</Label>
          <Dropdown
            value={currentSettings.defaultNoteFilter || "all"}
            onChange={(value) =>
              handleSettingChange(
                "defaultNoteFilter",
                value as DefaultNoteFilter
              )
            }
            options={defaultNoteFilterOptions}
            placeholder={t('settings.selectDefaultNoteFilter')}
            className="w-full"
          />
          {validationErrors.defaultNoteFilter && (
            <p className="text-sm text-destructive">
              {validationErrors.defaultNoteFilter}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {t('settings.chooseDefaultNoteFilter')}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="quick-create-notes">{t('settings.quickCreateNotes')}</Label>
          <Dropdown
            value={currentSettings.quickCreateNotes || "disable"}
            onChange={(value) =>
              handleSettingChange("quickCreateNotes", value as QuickCreateNotes)
            }
            options={[
              { id: "disable", name: t('settings.quickCreateNotesShowModal') },
              { id: "enable", name: t('settings.quickCreateNotesSkipModal') },
            ]}
            placeholder={t('settings.selectQuickCreateNotes')}
            className="w-full"
          />
          {validationErrors.quickCreateNotes && (
            <p className="text-sm text-destructive">
              {validationErrors.quickCreateNotes}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {t('settings.quickCreateNotesDescription')}
          </p>
        </div>

        {currentSettings.quickCreateNotes === "enable" && (
          <div className="space-y-2">
            <Label htmlFor="quick-create-notes-category">
              {t('settings.defaultCategory')}
            </Label>
            <CategoryTreeSelector
              categories={noteCategories}
              selectedCategory={currentSettings.quickCreateNotesCategory || ""}
              onCategorySelect={(value) =>
                handleSettingChange("quickCreateNotesCategory", value)
              }
              placeholder={t('settings.selectDefaultCategory')}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              {t('settings.defaultCategoryDescription')}
            </p>
          </div>
        )}

      </FormWrapper>

      <FormWrapper
        title={t('settings.checklistsPreferences')}
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
            {t('settings.saveChecklists')}
          </Button>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="enable-recurrence">
            {t('settings.recurringChecklists')}{" "}
            <span className="text-sm text-muted-foreground">{t('settings.beta')}</span>
          </Label>
          <Dropdown
            value={currentSettings.enableRecurrence || "disable"}
            onChange={(value) =>
              handleSettingChange("enableRecurrence", value as EnableRecurrence)
            }
            options={enableRecurrenceOptions}
            placeholder={t('settings.selectEnableRecurring')}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="show-completed-suggestions">
            {t('settings.showCompletedSuggestions')}
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
            placeholder={t('settings.selectShowCompletedSuggestions')}
            className="w-full"
          />
          <p className="text-sm text-muted-foreground">
            {t('settings.completedSuggestionsDescription')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="default-checklist-filter">
            {t('settings.defaultChecklistFilter')}
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
            placeholder={t('settings.selectDefaultChecklistFilter')}
            className="w-full"
          />
          {validationErrors.defaultChecklistFilter && (
            <p className="text-sm text-destructive">
              {validationErrors.defaultChecklistFilter}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {t('settings.chooseDefaultChecklistFilter')}
          </p>
        </div>
      </FormWrapper>

      <FormWrapper title={t('settings.accountManagement')}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-jotty">
            <div>
              <h4 className="font-medium">{t('settings.deleteAccount')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('settings.deleteAccountDescription')}
              </p>
            </div>
            {isDemoMode ? (
              <span className="text-sm text-muted-foreground">
                {t('settings.disabledInDemoMode')}
              </span>
            ) : (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteModal(true)}
              >
                {t('settings.deleteAccount')}
              </Button>
            )}
          </div>
        </div>
      </FormWrapper>

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />
    </div>
  );
};

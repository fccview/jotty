"use client";
import { useEffect, useRef, useState, type JSX } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { updateUserSettings } from "@/app/_server/actions/users";
import { useTranslations } from "next-intl";
import {
  User,
  SanitisedUser,
  Category,
  EnableRecurrence,
  ShowCompletedSuggestions,
  ShowChecklistEmojis,
  TableSyntax,
  LandingPage,
  NotesDefaultEditor,
  NotesDefaultMode,
  NotesAutoSaveInterval,
  FileRenameMode,
  PreferredTimeFormat,
  PreferredDateFormat,
  FirstDayOfWeek,
  Handedness,
  DisableRichEditor,
  MarkdownTheme,
  DefaultChecklistFilter,
  ChecklistItemClickAction,
  DefaultNoteFilter,
  QuickCreateNotes,
  HideConnectionIndicator,
  HideStatusOnCards,
  HideMobileStatusDropdown,
  HideTimeTrackingOnCards,
  CodeBlockStyle,
  NewItemInsertion,
} from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { DEFAULT_WEEK_START, WeekDay } from "@/app/_consts/calendar";
import { DEFAULT_SEARCH_MODE, SearchModes } from "@/app/_consts/search";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { CategoryTreeSelector } from "@/app/_components/GlobalComponents/Dropdowns/CategoryTreeSelector";
import { Label } from "@/app/_components/GlobalComponents/FormElements/label";
import { FormWrapper } from "@/app/_components/GlobalComponents/FormElements/FormWrapper";
import { useToast } from "@/app/_providers/ToastProvider";
import { getAllThemes } from "@/app/_consts/themes";
import {
  editorSettingsSchema,
  checklistSettingsSchema,
  kanbanSettingsSchema,
  generalSettingsSchema,
} from "@/app/_schemas/user-schemas";
import { DeleteAccountModal } from "@/app/_components/GlobalComponents/Modals/UserModals/DeleteAccountModal";

type SettingsSchema =
  | typeof generalSettingsSchema
  | typeof editorSettingsSchema
  | typeof checklistSettingsSchema
  | typeof kanbanSettingsSchema;

interface SettingsTabProps {
  noteCategories: Category[];
  localeOptions: Array<{ id: string, name: JSX.Element }>;
}

const getSettingsFromUser = (user: SanitisedUser | null): Partial<SanitisedUser> => ({
  preferredLocale: user?.preferredLocale || "en",
  preferredTheme: user?.preferredTheme || "system",
  tableSyntax: user?.tableSyntax || "html",
  landingPage: user?.landingPage || "last-visited",
  notesDefaultEditor: user?.notesDefaultEditor || "wysiwyg",
  notesDefaultMode: user?.notesDefaultMode || "view",
  notesAutoSaveInterval: user?.notesAutoSaveInterval || 5000,
  enableRecurrence: user?.enableRecurrence || "disable",
  showCompletedSuggestions: user?.showCompletedSuggestions || "enable",
  showChecklistEmojis: user?.showChecklistEmojis || "enable",
  fileRenameMode: user?.fileRenameMode || "minimal",
  preferredDateFormat: user?.preferredDateFormat || "system",
  preferredTimeFormat: user?.preferredTimeFormat || "system",
  firstDayOfWeek: user?.firstDayOfWeek || DEFAULT_WEEK_START,
  handedness: user?.handedness || "right-handed",
  disableRichEditor: user?.disableRichEditor || "disable",
  markdownTheme: user?.markdownTheme || "prism",
  defaultChecklistFilter: user?.defaultChecklistFilter || "all",
  checklistItemClickAction: user?.checklistItemClickAction || "toggle",
  newItemInsertion: user?.newItemInsertion || "top",
  defaultNoteFilter: user?.defaultNoteFilter || "all",
  quickCreateNotes: user?.quickCreateNotes || "disable",
  quickCreateNotesCategory: user?.quickCreateNotesCategory || "",
  hideConnectionIndicator: user?.hideConnectionIndicator || "disable",
  hideStatusOnCards: user?.hideStatusOnCards || "disable",
  hideMobileStatusDropdown: user?.hideMobileStatusDropdown || "disable",
  hideTimeTrackingOnCards: user?.hideTimeTrackingOnCards || "disable",
  codeBlockStyle: user?.codeBlockStyle || "default",
  searchMode: user?.searchMode || DEFAULT_SEARCH_MODE,
});

const sectionSchema = (
  keys: (keyof User)[],
  schema: SettingsSchema
): Partial<Record<keyof User, SettingsSchema>> =>
  Object.fromEntries(keys.map((key) => [key, schema]));

const SETTING_SCHEMAS: Partial<Record<keyof User, SettingsSchema>> = {
  ...sectionSchema(
    [
      "preferredLocale",
      "preferredTheme",
      "landingPage",
      "fileRenameMode",
      "preferredDateFormat",
      "preferredTimeFormat",
      "firstDayOfWeek",
      "handedness",
      "hideConnectionIndicator",
      "searchMode",
    ],
    generalSettingsSchema
  ),
  ...sectionSchema(
    [
      "notesAutoSaveInterval",
      "notesDefaultMode",
      "notesDefaultEditor",
      "tableSyntax",
      "disableRichEditor",
      "defaultNoteFilter",
      "markdownTheme",
      "codeBlockStyle",
      "quickCreateNotes",
      "quickCreateNotesCategory",
    ],
    editorSettingsSchema
  ),
  ...sectionSchema(
    [
      "enableRecurrence",
      "showCompletedSuggestions",
      "showChecklistEmojis",
      "defaultChecklistFilter",
      "checklistItemClickAction",
      "newItemInsertion",
    ],
    checklistSettingsSchema
  ),
  ...sectionSchema(
    ["hideStatusOnCards", "hideMobileStatusDropdown", "hideTimeTrackingOnCards"],
    kanbanSettingsSchema
  ),
};

export const UserPreferencesTab = ({ noteCategories, localeOptions }: SettingsTabProps) => {
  const t = useTranslations();
  const { isDemoMode, user, setUser } = useAppMode();
  const router = useRouter();
  const { showToast } = useToast();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [allThemes, setAllThemes] = useState<any[]>([]);
  const [loadingThemes, setLoadingThemes] = useState(true);
  const [currentSettings, setCurrentSettings] = useState<Partial<User>>(
    getSettingsFromUser(user)
  );
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const savedSettings = useRef<Partial<User>>(getSettingsFromUser(user));
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const newSettings = getSettingsFromUser(user);
    savedSettings.current = newSettings;
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

  const revertSetting = (key: keyof User) =>
    setCurrentSettings((prev) => ({ ...prev, [key]: savedSettings.current[key] }));

  const saveSetting = async (key: keyof User, value: User[keyof User]) => {
    const schema = SETTING_SCHEMAS[key];
    const parsed = schema?.partial().safeParse({ [key]: value });

    if (parsed && !parsed.success) {
      const message = parsed.error.issues[0]?.message || "";
      setValidationErrors((prev) => ({ ...prev, [key]: message }));
      revertSetting(key);
      showToast({
        type: "error",
        title: t("errors.validationError"),
        message,
      });
      return;
    }

    setValidationErrors((prev) => ({ ...prev, [key]: "" }));

    const result = await updateUserSettings({ [key]: value });
    if (!result.success || !result.data?.user) {
      console.error(`Failed to save setting ${String(key)}:`, result.error);
      revertSetting(key);
      showToast({
        type: "error",
        title: t("settings.settingsSaveFailed"),
        message: result.error || t("settings.settingsSaveFailedDescription"),
      });
      return;
    }

    savedSettings.current = { ...savedSettings.current, [key]: value };
    setUser(result.data.user);
    router.refresh();
    showToast({
      type: "success",
      title: t("settings.settingsSaved"),
    });
  };

  const handleSettingChange = <K extends keyof User>(
    key: K,
    value: User[K]
  ) => {
    if (currentSettings[key] === value) return;
    setCurrentSettings((prev) => ({ ...prev, [key]: value }));
    saveQueue.current = saveQueue.current.then(() => saveSetting(key, value));
  };

  const dateFormatOptions = [
    { id: "system", name: t('settings.useSystemDefault') },
    { id: "dd/mm/yyyy", name: "DD/MM/YYYY" },
    { id: "mm/dd/yyyy", name: "MM/DD/YYYY" },
    { id: "yyyy/mm/dd", name: "YYYY/MM/DD" },
  ];

  const firstDayOfWeekOptions = [
    { id: WeekDay.SUNDAY, name: t('settings.sunday') },
    { id: WeekDay.MONDAY, name: t('settings.monday') },
    { id: WeekDay.SATURDAY, name: t('settings.saturday') },
  ];

  const timeFormatOptions = [
    { id: "system", name: t('settings.useSystemDefault') },
    { id: "12-hours", name: t('settings.hours12') },
    { id: "24-hours", name: t('settings.hours24') },
  ];

  const handednessOptions = [
    { id: "right-handed", name: t('settings.rightHanded') },
    { id: "left-handed", name: t('settings.leftHanded') },
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

  const showChecklistEmojisOptions = [
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

  const checklistItemClickActionOptions = [
    { id: "toggle", name: t('settings.checklistItemClickActionToggle') },
    { id: "edit", name: t('settings.checklistItemClickActionEdit') },
  ];

  const searchModeOptions = [
    { id: SearchModes.SMART, name: t('settings.searchModeSmart') },
    { id: SearchModes.RANKED, name: t('settings.searchModeRanked') },
    { id: SearchModes.SUBSTRING, name: t('settings.searchModeSubstring') },
  ];

  const newItemInsertionOptions = [
    { id: "top", name: t('settings.newItemInsertionTop') },
    { id: "bottom", name: t('settings.newItemInsertionBottom') },
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
      <FormWrapper title={t('settings.general')} collapsible>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="preferred-locale">{t('settings.preferredLanguage')}</Label>
            <Dropdown
              value={currentSettings.preferredLocale || "en"}
              onChange={(value) => handleSettingChange("preferredLocale", value)}
              options={localeOptions}
              placeholder={t('settings.selectLanguage')}
              className="w-full"
            />
            {validationErrors.preferredLocale && (
              <p className="text-md lg:text-sm text-destructive">
                {validationErrors.preferredLocale}
              </p>
            )}
            <p className="text-md lg:text-sm text-muted-foreground">
              {t('settings.choosePreferredLanguage')}
            </p>
            <p className="text-md lg:text-xs text-muted-foreground mt-2">
              <a
                href="https://github.com/fccview/jotty/blob/main/howto/TRANSLATIONS.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {t('settings.customTranslationsInfo')}
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferred-theme">{t('settings.preferredTheme')}</Label>
            {loadingThemes ? (
              <div className="text-md lg:text-sm text-muted-foreground">
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
                  colors: theme.colors,
                }))}
                placeholder={t('settings.selectTheme')}
                className="w-full"
              />
            )}
            {validationErrors.preferredTheme && (
              <p className="text-md lg:text-sm text-destructive">
                {validationErrors.preferredTheme}
              </p>
            )}
            <p className="text-md lg:text-sm text-muted-foreground">
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
              <p className="text-md lg:text-sm text-destructive">
                {validationErrors.landingPage}
              </p>
            )}
            <p className="text-md lg:text-sm text-muted-foreground">
              {t('settings.selectDefaultPageAfterLogin')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-rename-mode">{t('settings.fileRenameMode')}</Label>
            <Dropdown
              value={currentSettings.fileRenameMode || "minimal"}
              onChange={(value) =>
                handleSettingChange("fileRenameMode", value as FileRenameMode)
              }
              options={fileRenameModeOptions}
              placeholder={t('settings.selectFileRenameMode')}
              className="w-full"
            />
            {validationErrors.fileRenameMode && (
              <p className="text-md lg:text-sm text-destructive">
                {validationErrors.fileRenameMode}
              </p>
            )}
            <p className="text-md lg:text-sm text-muted-foreground">
              {t('settings.chooseFileRenameMode')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferred-date-format">{t('settings.preferredDateFormat')}</Label>
            <Dropdown
              value={currentSettings.preferredDateFormat || "system"}
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
              <p className="text-md lg:text-sm text-destructive">
                {validationErrors.preferredDateFormat}
              </p>
            )}
            <p className="text-md lg:text-sm text-muted-foreground">
              {t('settings.choosePreferredDateFormat')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferred-time-format">{t('settings.preferredTimeFormat')}</Label>
            <Dropdown
              value={currentSettings.preferredTimeFormat || "system"}
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
              <p className="text-md lg:text-sm text-destructive">
                {validationErrors.preferredTimeFormat}
              </p>
            )}
            <p className="text-md lg:text-sm text-muted-foreground">
              {t('settings.choosePreferredTimeFormat')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="first-day-of-week">{t('settings.firstDayOfWeek')}</Label>
            <Dropdown
              value={currentSettings.firstDayOfWeek || DEFAULT_WEEK_START}
              onChange={(value) =>
                handleSettingChange("firstDayOfWeek", value as FirstDayOfWeek)
              }
              options={firstDayOfWeekOptions}
              placeholder={t('settings.selectFirstDayOfWeek')}
              className="w-full"
            />
            {validationErrors.firstDayOfWeek && (
              <p className="text-md lg:text-sm text-destructive">
                {validationErrors.firstDayOfWeek}
              </p>
            )}
            <p className="text-md lg:text-sm text-muted-foreground">
              {t('settings.chooseFirstDayOfWeek')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="handedness">{t('settings.handedness')}</Label>
            <Dropdown
              value={currentSettings.handedness || "right-handed"}
              onChange={(value) =>
                handleSettingChange(
                  "handedness",
                  value as Handedness
                )
              }
              options={handednessOptions}
              placeholder={t('settings.selectHandedness')}
              className="w-full"
            />
            {validationErrors.handedness && (
              <p className="text-md lg:text-sm text-destructive">
                {validationErrors.handedness}
              </p>
            )}
            <p className="text-md lg:text-sm text-muted-foreground">
              {t('settings.chooseHandedness')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hide-connection-indicator">{t('settings.hideConnectionIndicator')}</Label>
            <Dropdown
              value={currentSettings.hideConnectionIndicator || "disable"}
              onChange={(value) =>
                handleSettingChange(
                  "hideConnectionIndicator",
                  value as HideConnectionIndicator
                )
              }
              options={[
                { id: "disable", name: t('settings.showIndicator') },
                { id: "enable", name: t('settings.hideIndicator') },
              ]}
              placeholder={t('settings.selectConnectionIndicator')}
              className="w-full"
            />
            <p className="text-md lg:text-sm text-muted-foreground">
              {t('settings.hideConnectionIndicatorDescription')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="search-mode">{t('settings.searchMode')}</Label>
            <Dropdown
              id="search-mode"
              value={currentSettings.searchMode || DEFAULT_SEARCH_MODE}
              onChange={(value) => handleSettingChange("searchMode", value as SearchModes)}
              options={searchModeOptions}
              placeholder={t('settings.selectSearchMode')}
              className="w-full"
            />
            <p className="text-md lg:text-sm text-muted-foreground">
              {t('settings.searchModeDescription')}
            </p>
          </div>
        </div>
      </FormWrapper>

      <FormWrapper
        title={t('settings.notesPreferences')}
        collapsible
        defaultOpen={false}
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
            <p className="text-md lg:text-sm text-destructive">
              {validationErrors.notesAutoSaveInterval}
            </p>
          )}
          <p className="text-md lg:text-sm text-muted-foreground">
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
            <p className="text-md lg:text-sm text-destructive">
              {validationErrors.notesDefaultMode}
            </p>
          )}
          <p className="text-md lg:text-sm text-muted-foreground">
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
            <p className="text-md lg:text-sm text-destructive">
              {validationErrors.notesDefaultEditor}
            </p>
          )}
          <p className="text-md lg:text-sm text-muted-foreground">
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
            <p className="text-md lg:text-sm text-destructive">
              {validationErrors.tableSyntax}
            </p>
          )}
          <p className="text-md lg:text-sm text-muted-foreground">
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
            <p className="text-md lg:text-sm text-destructive">
              {validationErrors.markdownTheme}
            </p>
          )}
          <p className="text-md lg:text-sm text-muted-foreground">
            {t('settings.chooseSyntaxTheme')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="code-block-style">{t('settings.codeBlockChoice')}</Label>
          <Dropdown
            value={currentSettings.codeBlockStyle || "default"}
            onChange={(value) =>
              handleSettingChange("codeBlockStyle", value as CodeBlockStyle)
            }
            options={[
              { id: "default", name: t('settings.defaultCodeBlock') },
              { id: "themed", name: t('settings.themedCodeBlock') },
            ]}
            placeholder={t('settings.codeBlockChoice')}
            className="w-full"
          />
          {validationErrors.codeBlockStyle && (
            <p className="text-md lg:text-sm text-destructive">
              {validationErrors.codeBlockStyle}
            </p>
          )}
          <p className="text-md lg:text-sm text-muted-foreground">
            {t('settings.codeBlockChoiceDescription')}
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
            <p className="text-md lg:text-sm text-destructive">
              {validationErrors.disableRichEditor}
            </p>
          )}
          <p className="text-md lg:text-sm text-muted-foreground">
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
            <p className="text-md lg:text-sm text-destructive">
              {validationErrors.defaultNoteFilter}
            </p>
          )}
          <p className="text-md lg:text-sm text-muted-foreground">
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
            <p className="text-md lg:text-sm text-destructive">
              {validationErrors.quickCreateNotes}
            </p>
          )}
          <p className="text-md lg:text-sm text-muted-foreground">
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
            <p className="text-md lg:text-sm text-muted-foreground">
              {t('settings.defaultCategoryDescription')}
            </p>
          </div>
        )}

      </FormWrapper>

      <FormWrapper
        title={t('settings.checklistsPreferences')}
        collapsible
        defaultOpen={false}
      >
        <div className="space-y-2">
          <Label htmlFor="enable-recurrence">
            {t('settings.recurringChecklists')}{" "}
            <span className="text-md lg:text-sm text-muted-foreground">{t('settings.beta')}</span>
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
          <p className="text-md lg:text-sm text-muted-foreground">
            {t('settings.completedSuggestionsDescription')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="show-checklist-emojis">
            {t('settingsModal.showEmojis')}
          </Label>
          <Dropdown
            value={currentSettings.showChecklistEmojis || "enable"}
            onChange={(value) =>
              handleSettingChange(
                "showChecklistEmojis",
                value as ShowChecklistEmojis
              )
            }
            options={showChecklistEmojisOptions}
            placeholder={t('settings.selectShowChecklistEmojis')}
            className="w-full"
          />
          <p className="text-md lg:text-sm text-muted-foreground">
            {t('settings.showChecklistEmojisDescription')}
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
            <p className="text-md lg:text-sm text-destructive">
              {validationErrors.defaultChecklistFilter}
            </p>
          )}
          <p className="text-md lg:text-sm text-muted-foreground">
            {t('settings.chooseDefaultChecklistFilter')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="checklist-item-click-action">
            {t('settings.checklistItemClickAction')}
          </Label>
          <Dropdown
            value={currentSettings.checklistItemClickAction || "toggle"}
            onChange={(value) =>
              handleSettingChange(
                "checklistItemClickAction",
                value as ChecklistItemClickAction
              )
            }
            options={checklistItemClickActionOptions}
            placeholder={t('settings.selectChecklistItemClickAction')}
            className="w-full"
          />
          <p className="text-md lg:text-sm text-muted-foreground">
            {t('settings.checklistItemClickActionDescription')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-item-insertion">
            {t('settings.newItemInsertion')}
          </Label>
          <Dropdown
            id="new-item-insertion"
            value={currentSettings.newItemInsertion || "top"}
            onChange={(value) =>
              handleSettingChange(
                "newItemInsertion",
                value as NewItemInsertion
              )
            }
            options={newItemInsertionOptions}
            placeholder={t('settings.selectNewItemInsertion')}
            className="w-full"
          />
          <p className="text-md lg:text-sm text-muted-foreground">
            {t('settings.newItemInsertionDescription')}
          </p>
        </div>
      </FormWrapper>

      <FormWrapper
        title={t('settings.kanbanSection')}
        collapsible
        defaultOpen={false}
      >
        <div className="space-y-2">
          <Label htmlFor="hide-status-on-cards">
            {t('settings.hideStatusOnCardsLabel')}
          </Label>
          <Dropdown
            value={currentSettings.hideStatusOnCards || "disable"}
            onChange={(value) =>
              handleSettingChange("hideStatusOnCards", value as HideStatusOnCards)
            }
            options={[
              { id: "disable", name: t('settings.showStatusOnCards') },
              { id: "enable", name: t('settings.hideStatusOnCards') },
            ]}
            placeholder={t('settings.selectStatusOnCards')}
            className="w-full"
          />
          <p className="text-md lg:text-sm text-muted-foreground">
            {t('settings.hideStatusOnCardsDescription')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hide-mobile-status-dropdown">
            {t('settings.hideMobileStatusDropdownLabel')}
          </Label>
          <Dropdown
            value={currentSettings.hideMobileStatusDropdown || "disable"}
            onChange={(value) =>
              handleSettingChange(
                "hideMobileStatusDropdown",
                value as HideMobileStatusDropdown
              )
            }
            options={[
              { id: "disable", name: t('settings.showMobileStatusDropdown') },
              { id: "enable", name: t('settings.hideMobileStatusDropdown') },
            ]}
            placeholder={t('settings.selectMobileStatusDropdown')}
            className="w-full"
          />
          <p className="text-md lg:text-sm text-muted-foreground">
            {t('settings.hideMobileStatusDropdownDescription')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hide-time-tracking-on-cards">
            {t('settings.hideTimeTrackingOnCardsLabel')}
          </Label>
          <Dropdown
            value={currentSettings.hideTimeTrackingOnCards || "disable"}
            onChange={(value) =>
              handleSettingChange(
                "hideTimeTrackingOnCards",
                value as HideTimeTrackingOnCards
              )
            }
            options={[
              { id: "disable", name: t('settings.showTimeTrackingOnCards') },
              { id: "enable", name: t('settings.hideTimeTrackingOnCards') },
            ]}
            placeholder={t('settings.selectTimeTrackingOnCards')}
            className="w-full"
          />
          <p className="text-md lg:text-sm text-muted-foreground">
            {t('settings.hideTimeTrackingOnCardsDescription')}
          </p>
        </div>
      </FormWrapper>

      <FormWrapper title={t('settings.accountManagement')} collapsible defaultOpen={false}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-jotty">
            <div>
              <h4 className="font-medium">{t('settings.deleteAccount')}</h4>
              <p className="text-md lg:text-sm text-muted-foreground">
                {t('settings.deleteAccountDescription')}
              </p>
            </div>
            {isDemoMode ? (
              <span className="text-md lg:text-sm text-muted-foreground">
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

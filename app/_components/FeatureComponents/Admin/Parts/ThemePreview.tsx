import React, { useMemo } from "react";
import { DynamicLogo } from "@/app/_components/GlobalComponents/Layout/Logo/DynamicLogo";
import { NoteCard } from "@/app/_components/GlobalComponents/Cards/NoteCard";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { useTranslations } from "next-intl";
import {
  CheckmarkCircle04Icon,
  Clock01Icon,
  Settings01Icon,
} from "hugeicons-react";

interface ThemePreviewProps {
  colors: { [key: string]: string };
  focusedColor?: string | null;
}



export const ThemePreview: React.FC<ThemePreviewProps> = ({
  colors,
  focusedColor,
}) => {
  const t = useTranslations();

  const sampleNote = useMemo(() => ({
    id: "preview-note",
    title: t('settings.customTheme.sampleNoteTitle'),
    content: t('settings.customTheme.sampleNoteContent'),
    category: t('settings.customTheme.sampleNoteCategory'),
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  }), [t]);

  const themeStyles = useMemo(() => {
    const cssVars: { [key: string]: string } = {};
    Object.entries(colors).forEach(([key, value]) => {
      if (value && value.includes(" ")) {
        cssVars[key] = value;
      }
    });
    return cssVars;
  }, [colors]);

  const getHighlightClass = (colorVar: string) => {
    if (focusedColor === colorVar) {
      return "ring-2 ring-blue-500 ring-offset-1 ring-offset-background";
    }
    return "";
  };

  return (
    <div
      className={`space-y-4 max-h-[680px] rounded-jotty overflow-y-auto bg-background ${getHighlightClass(
        "--background"
      )}`}
      style={themeStyles as React.CSSProperties}
    >
      <div
        className={`flex items-center justify-between p-3 border-b border-border bg-card rounded ${getHighlightClass(
          "--card"
        )} ${getHighlightClass("--border")}`}
      >
        <DynamicLogo className="h-6 w-6" />
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline">
            <Settings01Icon
              className={`h-3 w-3 text-muted-foreground ${getHighlightClass(
                "--muted-foreground"
              )}`}
            />
          </Button>
        </div>
      </div>

      <div className="px-3">
        <Input
          id="preview-search"
          type="text"
          placeholder={t('settings.customTheme.searchPlaceholder')}
          className={`w-full ${getHighlightClass(
            "--input"
          )} ${getHighlightClass("--border")}`}
          label={t('common.search')}
        />
      </div>

      <div className="px-3 space-y-3">
        <NoteCard
          note={sampleNote}
          onSelect={() => { }}
          isPinned={false}
          onTogglePin={() => { }}
        />

        <div
          className={`bg-card border border-border rounded-jotty p-4 ${getHighlightClass(
            "--card"
          )} ${getHighlightClass("--border")}`}
        >
          <div className="flex items-center justify-between mb-2">
            <h4
              className={`font-medium text-foreground ${getHighlightClass(
                "--foreground"
              )}`}
            >
              {t('settings.customTheme.weeklyProgress')}
            </h4>
            <span
              className={`text-sm text-muted-foreground ${getHighlightClass(
                "--muted-foreground"
              )}`}
            >
              {t('settings.customTheme.tasksProgress')}
            </span>
          </div>
          <div
            className={`w-full bg-muted rounded-full h-2 mb-3 ${getHighlightClass(
              "--muted"
            )}`}
          >
            <div
              className={`bg-primary rounded-full h-2 transition-all duration-300 ${getHighlightClass(
                "--primary"
              )}`}
              style={{ width: "70%" }}
            />
          </div>
          <div
            className={`flex items-center justify-between text-xs text-muted-foreground ${getHighlightClass(
              "--muted-foreground"
            )}`}
          >
            <div className="flex items-center gap-1">
              <CheckmarkCircle04Icon className="h-3 w-3" />
              <span>{t('settings.customTheme.tasksCompleted')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock01Icon className="h-3 w-3" />
              <span>{t('settings.customTheme.tasksRemaining')}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="default"
            size="sm"
            className={getHighlightClass("--primary")}
          >
            {t('settings.customTheme.primaryAction')}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className={getHighlightClass("--destructive")}
          >
            {t('settings.customTheme.destructiveAction')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`${getHighlightClass("--border")} ${getHighlightClass(
              "--secondary"
            )}`}
          >
            {t('settings.customTheme.secondaryAction')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={getHighlightClass("--accent")}
          >
            {t('settings.customTheme.ghostAction')}
          </Button>
          <Button
            variant="link"
            size="sm"
            className={getHighlightClass("--primary")}
          >{t('editor.link')}</Button>
        </div>

        <div className="space-y-3">
          <div
            className={`bg-primary/10 border border-primary/20 rounded-jotty p-3 ${getHighlightClass(
              "--primary"
            )}`}
          >
            <div className="flex items-center gap-2">
              <CheckmarkCircle04Icon className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary font-medium">
                {t('settings.customTheme.successMessage')}
              </span>
            </div>
          </div>

          <div
            className={`bg-destructive/10 border border-destructive/20 rounded-jotty p-3 ${getHighlightClass(
              "--destructive"
            )}`}
          >
            <div className="flex items-center gap-2">
              <CheckmarkCircle04Icon className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive font-medium">
                {t('settings.customTheme.errorMessage')}
              </span>
            </div>
          </div>

          <div className="flex border-b border-border">
            <button
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 border-primary bg-primary/5 text-primary transition-colors ${getHighlightClass(
                "--primary"
              )} ${getHighlightClass("--border")}`}
            >
              {t('settings.customTheme.activeTab')}
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 border-transparent text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 ${getHighlightClass(
                "--muted-foreground"
              )} ${getHighlightClass("--foreground")} ${getHighlightClass(
                "--muted"
              )}`}
            >
              {t('settings.customTheme.inactiveTab')}
            </button>
          </div>

          <div
            className={`bg-popover border border-border rounded-jotty p-3 ${getHighlightClass(
              "--popover"
            )} ${getHighlightClass("--border")}`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-popover-foreground text-sm ${getHighlightClass(
                  "--popover-foreground"
                )}`}
              >
                {t('settings.customTheme.calendarDay')}
              </span>
              <span className="text-xs text-muted-foreground">15</span>
            </div>
          </div>

          <div
            className={`bg-card border border-border rounded-jotty p-3 ${getHighlightClass(
              "--card"
            )} ${getHighlightClass("--border")}`}
          >
            <h4
              className={`text-card-foreground font-medium ${getHighlightClass(
                "--card-foreground"
              )}`}
            >
              {t('settings.customTheme.cardTitle')}
            </h4>
            <p className="text-muted-foreground text-sm mt-1">
              {t('settings.customTheme.cardForegroundColor')}
            </p>
          </div>
        </div>

        <div
          className={`bg-card border border-border rounded-jotty p-4 space-y-3 ${getHighlightClass(
            "--card"
          )} ${getHighlightClass("--border")}`}
        >
          <Input
            id="preview-sample-input"
            type="text"
            label={t('settings.customTheme.sampleInputLabel')}
            placeholder={t('settings.customTheme.sampleInputPlaceholder')}
            className={`${getHighlightClass("--input")} ${getHighlightClass(
              "--border"
            )}`}
          />

          <div className="space-y-2">
            <label
              className={`text-sm font-medium text-foreground ${getHighlightClass(
                "--foreground"
              )}`}
            >
              {t('settings.customTheme.focusToSeeRingColor')}
            </label>
            <input
              type="text"
              className={`w-full px-3 py-2 text-sm border border-input bg-background rounded-jotty focus:outline-none focus:ring-none focus:ring-ring focus:ring-offset-2 ${getHighlightClass(
                "--input"
              )} ${getHighlightClass("--border")} ${getHighlightClass(
                "--ring"
              )}`}
            />
          </div>

          <div className="flex gap-2">
            <Button size="sm" className={getHighlightClass("--primary")}>{t('common.save')}</Button>
            <Button
              variant="outline"
              size="sm"
              className={`${getHighlightClass("--border")} ${getHighlightClass(
                "--secondary"
              )}`}
            >{t('common.cancel')}</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

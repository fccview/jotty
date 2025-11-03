import React, { useMemo } from "react";
import { DynamicLogo } from "@/app/_components/GlobalComponents/Layout/Logo/DynamicLogo";
import { ChecklistCard } from "@/app/_components/GlobalComponents/Cards/ChecklistCard";
import { NoteCard } from "@/app/_components/GlobalComponents/Cards/NoteCard";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { CheckCircle, Clock, SettingsIcon } from "lucide-react";

interface ThemePreviewProps {
  colors: { [key: string]: string };
  focusedColor?: string | null;
}

const sampleNote = {
  id: "preview-note",
  title: "Project Ideas",
  content: `# Project Brainstorm

## Mobile App Features
- **Dark mode toggle** with smooth transitions
- **Offline support** for critical features
- **Push notifications** for reminders

## Backend Improvements
- **API rate limiting** to prevent abuse
- **Database optimization** for faster queries
- **Caching layer** for improved performance

*This is just a preview of the note content...*`,
  category: "work/projects",
  createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
};

export const ThemePreview: React.FC<ThemePreviewProps> = ({ colors, focusedColor }) => {
  const themeStyles = useMemo(() => {
    const cssVars: { [key: string]: string } = {};
    Object.entries(colors).forEach(([key, value]) => {
      if (value && value.includes(" ")) {
        cssVars[key] = value;
      }
    });
    return cssVars;
  }, [colors]);

  const colorMappings: { [key: string]: string[] } = {
    "--background": ["bg-background"],
    "--foreground": ["text-foreground"],
    "--card": ["bg-card"],
    "--card-foreground": ["text-card-foreground"],
    "--popover": ["bg-popover"],
    "--popover-foreground": ["text-popover-foreground"],
    "--primary": ["bg-primary", "text-primary"],
    "--primary-foreground": ["text-primary-foreground"],
    "--secondary": ["bg-secondary"],
    "--secondary-foreground": ["text-secondary-foreground"],
    "--muted": ["bg-muted"],
    "--muted-foreground": ["text-muted-foreground"],
    "--accent": ["bg-accent"],
    "--accent-foreground": ["text-accent-foreground"],
    "--destructive": ["bg-destructive"],
    "--destructive-foreground": ["text-destructive-foreground"],
    "--border": ["border-border"],
    "--input": ["bg-input", "border-input"],
    "--ring": ["ring-ring"],
  };

  const getHighlightClass = (colorVar: string) => {
    if (focusedColor === colorVar) {
      return "ring-2 ring-blue-500 ring-offset-1 ring-offset-background";
    }
    return "";
  };

  return (
    <div
      className={`space-y-4 max-h-[680px] rounded-lg overflow-y-auto bg-background ${getHighlightClass("--background")}`}
      style={themeStyles as React.CSSProperties}
    >
      <div className={`flex items-center justify-between p-3 border-b border-border bg-card rounded ${getHighlightClass("--card")} ${getHighlightClass("--border")}`}>
        <DynamicLogo className="h-6 w-6" />
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline">
            <SettingsIcon className={`h-3 w-3 text-muted-foreground ${getHighlightClass("--muted-foreground")}`} />
          </Button>
        </div>
      </div>

      <div className="px-3">
        <Input
          id="preview-search"
          type="text"
          placeholder="Search notes and checklists..."
          className={`w-full ${getHighlightClass("--input")} ${getHighlightClass("--border")}`}
          label="Search"
        />
      </div>

      <div className="px-3 space-y-3">
        <NoteCard
          note={sampleNote}
          onSelect={() => { }}
          isPinned={false}
          onTogglePin={() => { }}
        />

        <div className={`bg-card border border-border rounded-lg p-4 ${getHighlightClass("--card")} ${getHighlightClass("--border")}`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className={`font-medium text-foreground ${getHighlightClass("--foreground")}`}>Weekly Progress</h4>
            <span className={`text-sm text-muted-foreground ${getHighlightClass("--muted-foreground")}`}>7/10 tasks</span>
          </div>
          <div className={`w-full bg-muted rounded-full h-2 mb-3 ${getHighlightClass("--muted")}`}>
            <div
              className={`bg-primary rounded-full h-2 transition-all duration-300 ${getHighlightClass("--primary")}`}
              style={{ width: "70%" }}
            />
          </div>
          <div className={`flex items-center justify-between text-xs text-muted-foreground ${getHighlightClass("--muted-foreground")}`}>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              <span>7 completed</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>3 remaining</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="default" size="sm" className={getHighlightClass("--primary")}>
            Primary Action
          </Button>
          <Button variant="destructive" size="sm" className={getHighlightClass("--destructive")}>
            Destructive
          </Button>
          <Button variant="outline" size="sm" className={`${getHighlightClass("--border")} ${getHighlightClass("--secondary")}`}>
            Secondary
          </Button>
          <Button variant="ghost" size="sm" className={getHighlightClass("--accent")}>
            Ghost
          </Button>
          <Button variant="link" size="sm" className={getHighlightClass("--primary")}>
            Link
          </Button>
        </div>

        <div className="space-y-3">
          <div className={`bg-primary/10 border border-primary/20 rounded-lg p-3 ${getHighlightClass("--primary")}`}>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary font-medium">Success message</span>
            </div>
          </div>

          <div className={`bg-destructive/10 border border-destructive/20 rounded-lg p-3 ${getHighlightClass("--destructive")}`}>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive font-medium">Error message</span>
            </div>
          </div>

          <div className="flex border-b border-border">
            <button className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 border-primary bg-primary/5 text-primary transition-colors ${getHighlightClass("--primary")} ${getHighlightClass("--border")}`}>
              Active Tab
            </button>
            <button className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 border-transparent text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 ${getHighlightClass("--muted-foreground")} ${getHighlightClass("--foreground")} ${getHighlightClass("--muted")}`}>
              Inactive Tab
            </button>
          </div>

          <div className={`bg-popover border border-border rounded-lg p-3 ${getHighlightClass("--popover")} ${getHighlightClass("--border")}`}>
            <div className="flex items-center justify-between">
              <span className={`text-popover-foreground text-sm ${getHighlightClass("--popover-foreground")}`}>Calendar day</span>
              <span className="text-xs text-muted-foreground">15</span>
            </div>
          </div>

          <div className={`bg-card border border-border rounded-lg p-3 ${getHighlightClass("--card")} ${getHighlightClass("--border")}`}>
            <h4 className={`text-card-foreground font-medium ${getHighlightClass("--card-foreground")}`}>Card Title</h4>
            <p className="text-muted-foreground text-sm mt-1">This text uses card-foreground color</p>
          </div>
        </div>

        <div className={`bg-card border border-border rounded-lg p-4 space-y-3 ${getHighlightClass("--card")} ${getHighlightClass("--border")}`}>
          <Input
            id="preview-sample-input"
            type="text"
            label="Sample Input"
            placeholder="Enter some text..."
            className={`${getHighlightClass("--input")} ${getHighlightClass("--border")}`}
          />

          <div className="space-y-2">
            <label className={`text-sm font-medium text-foreground ${getHighlightClass("--foreground")}`}>Focus to see ring color</label>
            <input
              type="text"
              placeholder="Focus me to see ring-ring color"
              className={`w-full px-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${getHighlightClass("--input")} ${getHighlightClass("--border")} ${getHighlightClass("--ring")}`}
            />
          </div>

          <div className="flex gap-2">
            <Button size="sm" className={getHighlightClass("--primary")}>Save</Button>
            <Button variant="outline" size="sm" className={`${getHighlightClass("--border")} ${getHighlightClass("--secondary")}`}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

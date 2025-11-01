import React, { useMemo } from "react";
import { DynamicLogo } from "@/app/_components/GlobalComponents/Layout/Logo/DynamicLogo";
import { ChecklistCard } from "@/app/_components/GlobalComponents/Cards/ChecklistCard";
import { NoteCard } from "@/app/_components/GlobalComponents/Cards/NoteCard";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { CheckCircle, Clock, CogIcon, Plus, SettingsIcon } from "lucide-react";

interface ThemePreviewProps {
  colors: { [key: string]: string };
}

// Sample data for preview
const sampleChecklist = {
  id: "preview-checklist",
  title: "Daily Tasks",
  category: "personal/daily",
  type: "simple" as const,
  items: [
    {
      id: "1",
      text: "Morning workout",
      completed: true,
      type: "simple",
      order: 1,
    },
    {
      id: "2",
      text: "Review emails",
      completed: false,
      type: "simple",
      order: 2,
    },
    {
      id: "3",
      text: "Team meeting",
      completed: true,
      type: "simple",
      order: 3,
    },
    {
      id: "4",
      text: "Code review",
      completed: false,
      type: "simple",
      order: 4,
    },
  ],
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
};

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
  createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
  updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
};

export const ThemePreview: React.FC<ThemePreviewProps> = ({ colors }) => {
  // Create CSS custom properties from the colors
  const themeStyles = useMemo(() => {
    const cssVars: { [key: string]: string } = {};
    Object.entries(colors).forEach(([key, value]) => {
      if (value && value.includes(" ")) {
        // RGB format like "255 255 255"
        cssVars[key] = value;
      }
    });
    return cssVars;
  }, [colors]);

  return (
    <div
      className="space-y-4 max-h-[680px] rounded-lg overflow-y-auto bg-background"
      style={themeStyles as React.CSSProperties}
    >
      <div className="flex items-center justify-between p-3 border-b border-border bg-card rounded">
        <DynamicLogo className="h-6 w-6" />
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline">
            <SettingsIcon className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <div className="px-3">
        <Input
          id="preview-search"
          type="text"
          placeholder="Search notes and checklists..."
          className="w-full"
        />
      </div>

      <div className="px-3 space-y-3">
        <ChecklistCard
          list={sampleChecklist}
          onSelect={() => {}}
          isPinned={true}
          onTogglePin={() => {}}
        />

        <NoteCard
          note={sampleNote}
          onSelect={() => {}}
          isPinned={false}
          onTogglePin={() => {}}
        />

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Weekly Progress</h4>
            <span className="text-sm text-muted-foreground">7/10 tasks</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 mb-3">
            <div
              className="bg-primary rounded-full h-2 transition-all duration-300"
              style={{ width: "70%" }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
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

        <div className="flex gap-2">
          <Button variant="default" size="sm">
            Primary Action
          </Button>
          <Button variant="outline" size="sm">
            Secondary
          </Button>
          <Button variant="ghost" size="sm">
            Ghost
          </Button>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <Input
            id="preview-sample-input"
            type="text"
            label="Sample Input"
            placeholder="Enter some text..."
          />
          <div className="flex gap-2">
            <Button size="sm">Save</Button>
            <Button variant="outline" size="sm">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

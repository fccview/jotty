export enum Modes {
  CHECKLISTS = "checklists",
  NOTES = "notes",
  TAGS = "tags",
  DEPRECATED_DOCS = "docs",
}

export enum ItemTypes {
  CHECKLIST = "checklist",
  NOTE = "note",
}

export enum ChecklistsTypes {
  SIMPLE = "simple",
  TASK = "task",
  KANBAN = "kanban",
}

/**
 * @fccview here, we need to @deprecate "task" eventually, it's unused in all create/edit operations but it's still used
 * in read operation for backward compatibility with old kanban data.
 */
export const isKanbanType = (type?: string): boolean =>
  type === "kanban" || type === "task";

export enum KanbanPriorityLevel {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  NONE = "none",
}

export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  PAUSED = "paused",
}

export enum TaskStatusLabels {
  TODO = "To Do",
  IN_PROGRESS = "In Progress",
  COMPLETED = "Completed",
  PAUSED = "Paused",
}

export enum PermissionTypes {
  READ = "canRead",
  EDIT = "canEdit",
  DELETE = "canDelete",
}

export enum AdminTabs {
  OVERVIEW = "overview",
  USERS = "users",
  CONTENT = "content",
  SHARING = "sharing",
  AUDIT_LOGS = "audit_logs",
  SETTINGS = "settings",
  EDITOR = "editor",
  STYLING = "styling",
}

export enum ProfileTabs {
  PROFILE = "profile",
  SESSIONS = "sessions",
  ARCHIVE = "archive",
  CONNECTIONS = "connections",
  ENCRYPTION = "encryption",
  USER_PREFERENCES = "userPreferences",
  AUDIT_LOGS = "audit_logs",
}

export enum Modes {
  CHECKLISTS = "checklists",
  NOTES = "notes",
  DEPRECATED_DOCS = "docs",
}

export enum ItemTypes {
  CHECKLIST = "checklist",
  NOTE = "note",
}

export enum ChecklistsTypes {
  SIMPLE = "simple",
  TASK = "task",
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
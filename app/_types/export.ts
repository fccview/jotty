export interface ExportProgress {
  progress: number;
  message: string;
}

export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
}

export enum ExportKind {
  ALL_CONTENT = "all_checklists_notes",
  USER_CONTENT = "user_checklists_notes",
  ALL_USERS = "all_users_data",
  WHOLE_DATA = "whole_data_folder",
}

export type ExportType = `${ExportKind}`;

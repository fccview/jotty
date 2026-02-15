export interface ExportProgress {
  progress: number;
  message: string;
}

export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
}

export type ExportType =
  | "all_checklists_notes"
  | "user_checklists_notes"
  | "all_users_data"
  | "whole_data_folder";

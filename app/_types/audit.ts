export type AuditLogLevel = "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export type AuditCategory =
  | "auth"
  | "user"
  | "checklist"
  | "note"
  | "sharing"
  | "settings"
  | "encryption"
  | "api"
  | "system"
  | "file"
  | "upload"
  | "security";

export type AuditAction =
  | "login"
  | "logout"
  | "register"
  | "session_terminated"
  | "user_created"
  | "user_updated"
  | "user_deleted"
  | "profile_updated"
  | "checklist_created"
  | "checklist_updated"
  | "checklist_deleted"
  | "checklist_item_checked"
  | "checklist_item_unchecked"
  | "checklist_archived"
  | "checklist_restored"
  | "note_created"
  | "note_updated"
  | "note_deleted"
  | "note_archived"
  | "note_restored"
  | "note_encrypted"
  | "note_decrypted"
  | "note_edited_encrypted"
  | "note_saved_encrypted"
  | "item_shared"
  | "item_unshared"
  | "share_permissions_updated"
  | "settings_updated"
  | "app_settings_updated"
  | "user_settings_updated"
  | "theme_changed"
  | "custom_theme_saved"
  | "custom_emoji_saved"
  | "custom_css_saved"
  | "preferences_updated"
  | "category_created"
  | "category_deleted"
  | "category_renamed"
  | "category_moved"
  | "encryption_keys_generated"
  | "encryption_keys_imported"
  | "encryption_keys_deleted"
  | "encryption_key_path_changed"
  | "api_key_generated"
  | "api_request"
  | "export_created"
  | "logs_cleaned"
  | "file_delete"
  | "dir_delete"
  | "migration_check"
  | "key_load"
  | "file_scan"
  | "user_item_check"
  | "mfa_secret_generated"
  | "mfa_enabled"
  | "mfa_disabled"
  | "mfa_enable_failed"
  | "mfa_verification_success"
  | "mfa_verification_failed"
  | "mfa_backup_code_used"
  | "mfa_backup_code_failed"
  | "mfa_backup_codes_regenerated";

export interface AuditMetadata {
  [key: string]: any;
  oldValue?: any;
  newValue?: any;
  changes?: string[];
  targetUser?: string;
}

export interface AuditLogEntry {
  id: string;
  uuid: string;
  timestamp: string;
  level: AuditLogLevel;
  username: string;
  action: AuditAction;
  category: AuditCategory;
  resourceType?: string;
  resourceId?: string;
  resourceTitle?: string;
  metadata?: AuditMetadata;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
  duration?: number;
}

export interface AuditLogFilters {
  username?: string;
  action?: AuditAction;
  category?: AuditCategory;
  level?: AuditLogLevel;
  startDate?: string;
  endDate?: string;
  success?: boolean;
  limit?: number;
  offset?: number;
}

export interface AuditLogStats {
  totalLogs: number;
  logsByLevel: Record<AuditLogLevel, number>;
  logsByCategory: Record<AuditCategory, number>;
  topActions: { action: string; count: number }[];
  topUsers: { username: string; count: number }[];
  recentActivity: AuditLogEntry[];
}

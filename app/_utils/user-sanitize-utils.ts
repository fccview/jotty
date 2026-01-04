import { User, SanitisedUser } from "@/app/_types";

export type PublicUser = {
  username: string;
  avatarUrl?: string;
};

export function sanitizeUserForClient(user: User | null): SanitisedUser | null {
  if (!user) return null;

  return {
    username: user.username,
    isAdmin: user.isAdmin,
    isSuperAdmin: user.isSuperAdmin,
    avatarUrl: user.avatarUrl,
    preferredTheme: user.preferredTheme,
    imageSyntax: user.imageSyntax,
    tableSyntax: user.tableSyntax,
    landingPage: user.landingPage,
    notesAutoSaveInterval: user.notesAutoSaveInterval,
    notesDefaultEditor: user.notesDefaultEditor,
    notesDefaultMode: user.notesDefaultMode,
    pinnedLists: user.pinnedLists,
    pinnedNotes: user.pinnedNotes,
    enableRecurrence: user.enableRecurrence,
    showCompletedSuggestions: user.showCompletedSuggestions,
    fileRenameMode: user.fileRenameMode,
    preferredDateFormat: user.preferredDateFormat,
    preferredTimeFormat: user.preferredTimeFormat,
    disableRichEditor: user.disableRichEditor,
    markdownTheme: user.markdownTheme,
    encryptionSettings: user.encryptionSettings,
    defaultChecklistFilter: user.defaultChecklistFilter,
    defaultNoteFilter: user.defaultNoteFilter,
    mfaEnabled: user.mfaEnabled,
    createdAt: user.createdAt,
    preferredLocale: user.preferredLocale,
  };
}

export function sanitizeUserForPublic(user: User | null, includeAvatar: boolean = false): PublicUser | null {
  if (!user) return null;

  return {
    username: user.username,
    ...(includeAvatar && user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
  };
}

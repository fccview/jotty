"use server";

import { ExportProgress, ExportResult } from "@/app/_types";
import {
  getCurrentUser,
  canAccessAllContent,
} from "@/app/_server/actions/users";
import {
  buildAllContent,
  buildAllUsers,
  buildUserContent,
  buildWholeData,
  readExportProgress,
} from "./builders";

const ADMIN_ONLY = "Forbidden: Admin access with content permissions required";
const OWN_ONLY = "Forbidden: You can only export your own data";

const _asAdmin = async (build: () => Promise<ExportResult>): Promise<ExportResult> =>
  (await canAccessAllContent()) ? build() : { success: false, error: ADMIN_ONLY };

export const getExportProgress = async (): Promise<ExportProgress> =>
  (await getCurrentUser()) ? readExportProgress() : { progress: 0, message: "" };

export const exportAllChecklistsNotes = async (): Promise<ExportResult> =>
  _asAdmin(buildAllContent);

export const exportAllUsersData = async (): Promise<ExportResult> =>
  _asAdmin(buildAllUsers);

export const exportWholeDataFolder = async (): Promise<ExportResult> =>
  _asAdmin(buildWholeData);

export const exportUserChecklistsNotes = async (
  username: string,
): Promise<ExportResult> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  if (username !== currentUser.username && !(await canAccessAllContent())) {
    return { success: false, error: OWN_ONLY };
  }

  return buildUserContent(username);
};

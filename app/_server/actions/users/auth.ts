"use server";

import { getCurrentUser } from "./queries";

export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return user !== null;
};

export const isAdmin = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return user?.isAdmin || false;
};

export const canAccessAllContent = async (): Promise<boolean> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return false;

    if (currentUser.isSuperAdmin) return true;

    if (!currentUser.isAdmin) return false;

    const { getAppSettings } = await import("@/app/_server/actions/config");
    const settingsResult = await getAppSettings();

    if (!settingsResult.success || !settingsResult.data) {
      return true;
    }

    return settingsResult.data.adminContentAccess !== "no";
  } catch (error) {
    console.error("Error checking content access:", error);
    return true;
  }
};

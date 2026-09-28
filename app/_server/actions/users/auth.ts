"use server";

import { getCurrentUser } from "./queries";
import { adminPeek } from "@/app/_server/actions/lib/admin-peek";

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
    return await adminPeek(await getCurrentUser());
  } catch (error) {
    console.error("Error checking content access:", error);
    return false;
  }
};

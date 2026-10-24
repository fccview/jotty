import type { SanitisedUser } from "@/app/_types";

export const adminPeek = async (
  user: Pick<SanitisedUser, "isAdmin" | "isSuperAdmin"> | null | undefined,
): Promise<boolean> => {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  if (!user.isAdmin) return false;

  try {
    const { getAppSettings } = await import("@/app/_server/actions/config");
    const settings = await getAppSettings();
    if (!settings.success || !settings.data) {
      console.error("Content access settings unreadable, refusing admin peek");
      return false;
    }
    return settings.data.adminContentAccess !== "no";
  } catch (error) {
    console.error("Error checking content access:", error);
    return false;
  }
};

import { SanitisedUser } from "@/app/_types";
import { getCurrentUser } from "@/app/_server/actions/users";

/**
 * Client callers still ship a serialised user blob in their FormData. It is
 * never an identity source, only something we refuse when it disagrees with
 * the authenticated session.
 */
export const claimedName = (formData: FormData): string | null => {
  const raw = formData.get("user");

  if (typeof raw !== "string" || !raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { username?: unknown };
    return typeof parsed.username === "string" ? parsed.username : null;
  } catch (error) {
    console.warn("Ignoring unparseable user field on create request:", error);
    return null;
  }
};

export const sessionActor = async (
  claimed?: string | null,
): Promise<SanitisedUser | { error: string }> => {
  const actor = await getCurrentUser();

  if (!actor?.username) {
    return { error: "Not authenticated" };
  }

  if (claimed && claimed !== actor.username) {
    console.error(
      "Refusing change, claimed identity does not match session:",
      actor.username,
    );
    return { error: "Identity mismatch" };
  }

  return actor;
};

import { User, SanitisedUser } from "@/app/_types";

export type PublicUser = {
  username: string;
  avatarUrl?: string;
};

export function sanitizeUserForClient(user: User | null): SanitisedUser | null {
  if (!user) return null;

  const { passwordHash, apiKey, lastLogin, mfaSecret, mfaRecoveryCode, ...sanitisedUser } = user;

  return sanitisedUser as SanitisedUser;
}

export function sanitizeUserForPublic(user: User | null, includeAvatar: boolean = false): PublicUser | null {
  if (!user) return null;

  return {
    username: user.username,
    ...(includeAvatar && user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
  };
}

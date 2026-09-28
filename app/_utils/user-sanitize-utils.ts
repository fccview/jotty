import { User, SanitisedUser, PublicUserInfo } from "@/app/_types";

export type PublicUser = {
  username: string;
  avatarUrl?: string;
};

export function sanitizeUserForClient(user: User | null): SanitisedUser | null {
  if (!user) return null;

  const { passwordHash, apiKey, lastLogin, mfaSecret, mfaRecoveryCode, ...sanitisedUser } = user;

  return sanitisedUser as SanitisedUser;
}

export const toPublicUser = (user: User | null): PublicUserInfo | null => {
  if (!user) return null;

  return {
    username: user.username,
    isAdmin: user.isAdmin,
    isSuperAdmin: user.isSuperAdmin,
    avatarUrl: user.avatarUrl,
  };
};

export function sanitizeUserForPublic(user: User | null, includeAvatar: boolean = false): PublicUser | null {
  if (!user) return null;

  return {
    username: user.username,
    ...(includeAvatar && user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
  };
}

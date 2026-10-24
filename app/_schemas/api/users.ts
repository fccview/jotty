import { z } from "zod";
import { apiNames } from "@/app/_schemas/api/names";
import { timestamp } from "./common";

export const userProfileSchema = z
  .object({
    username: z.string(),
    isAdmin: z.boolean(),
    isSuperAdmin: z.boolean().optional(),
    createdAt: timestamp.optional(),
    avatarUrl: z.string().optional(),
    preferredTheme: z.string().optional(),
    preferredLocale: z.string().optional(),
    mfaEnabled: z.boolean().optional(),
    pinnedLists: z.array(z.string()).optional(),
    pinnedNotes: z.array(z.string()).optional(),
  })
  .loose()
  .describe("The user record with every secret removed, plus the user's preferences")
  .register(apiNames, { id: "UserProfile" });

export const publicProfileSchema = z
  .object({
    username: z.string(),
    avatarUrl: z.string().optional(),
    preferredTheme: z.string().optional(),
  })
  .register(apiNames, { id: "PublicUserProfile" });

export const currentUserSchema = z.object({
  user: userProfileSchema.and(z.object({ lastLogin: timestamp.optional() })),
});

export const userLookupSchema = z.object({
  user: z.union([userProfileSchema, publicProfileSchema]),
});

export const usernameParams = z.object({ username: z.string().describe("Username") });

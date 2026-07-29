import { z } from "zod";
import { SHARED_WITH_NONE } from "@/app/_consts/sharing";
import { SharePerms } from "@/app/_types/enums";

export const sharingPermsSchema = z.object({
  canRead: z.boolean(),
  canEdit: z.boolean(),
  canDelete: z.boolean(),
});

export const categorySharingSchema = z.object({
  users: z.record(z.string(), sharingPermsSchema).default({}),
  inherit: z.boolean().default(true),
});

export const categoryOrderSchema = z.object({
  categories: z.array(z.string()).optional(),
  items: z.array(z.string()).optional(),
});

export const categoryInfoSchema = z.object({
  uuid: z.string().optional(),
  sharing: categorySharingSchema.optional(),
  order: categoryOrderSchema.optional(),
});

export const shareCodeSchema = z.enum([
  SharePerms.READ,
  SharePerms.WRITE,
  SharePerms.DELETE,
]);

export const sharedWithSchema = z.union([z.string(), z.array(z.string())]);

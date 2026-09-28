import { z } from "zod";
import { apiNames } from "@/app/_schemas/api/names";
import { ItemTypes } from "@/app/_types/enums";
import { required } from "./common";

export const rebuildIndexBody = z.object({
  username: z
    .string()
    .trim()
    .optional()
    .describe("Whose index to rebuild, yours when left out. Only admins can name somebody else"),
});

export const rebuiltSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

const clashUser = z
  .string()
  .optional()
  .describe("Whose files to check, yours when left out. Naming somebody else needs an admin allowed to see other users' content");

export const clashQuery = z.object({ username: clashUser });

const clashFileSchema = z.object({
  type: z.enum(ItemTypes),
  path: z.string().describe("Where the file sits, like notes/Home/plan.md. Pass it to repairDuplicateUuid to pick this file"),
  title: z.string(),
  createdAt: z.string().optional().describe("From frontmatter. A file without one counts as the newest"),
  keeps: z.boolean().describe("True for the file that owns the uuid now. Gets, links and the brain all open this one"),
});

export const clashListSchema = z.object({
  duplicates: z.array(
    z
      .object({
        uuid: z.string(),
        owner: z.string(),
        files: z.array(clashFileSchema).describe("Oldest createdAt first, the first one keeps the uuid"),
      })
      .register(apiNames, { id: "DuplicateUuid" }),
  ),
  total: z.number(),
});

export const clashRepairBody = z.object({
  uuid: required("uuid").describe("The duplicated uuid"),
  path: z
    .string()
    .optional()
    .describe("The file that gets a fresh uuid, as listed. Every file but the keeper when left out"),
  username: clashUser,
});

export const clashRepairSchema = z.object({
  success: z.literal(true),
  uuid: z.string(),
  rekeyed: z
    .array(z.object({ path: z.string(), uuid: z.string().describe("Its new uuid"), title: z.string() }))
    .describe("Files that got a fresh uuid"),
  relinked: z.array(z.string()).describe("Files whose links to the old uuid now point at the new one"),
  ambiguous: z
    .array(z.string())
    .describe("Files with links to the old uuid whose text doesn't say which file they meant, left pointing at the keeper"),
  skipped: z.array(z.string()).describe("Encrypted files that mention the old uuid, left untouched"),
});

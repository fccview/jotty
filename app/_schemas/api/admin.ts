import { z } from "zod";

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

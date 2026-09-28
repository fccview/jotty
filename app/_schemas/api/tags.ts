import { z } from "zod";
import { apiNames } from "@/app/_schemas/api/names";

export const tagCountSchema = z
  .object({
    tag: z.string().describe("Tag name without the #, nested tags use /"),
    notes: z.number().describe("Notes carrying this exact tag"),
    checklists: z.number().describe("Checklists carrying this exact tag"),
  })
  .register(apiNames, { id: "TagCount" });

export const tagListSchema = z.object({
  tags: z.array(tagCountSchema),
  total: z.number(),
});

export const taggedNoteSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string().describe("Note uuid"),
    title: z.string(),
    tags: z.array(z.string()),
    changed: z.boolean().describe("False when the note already had those tags, so Jotty wrote nothing"),
  }),
  warning: z.string().optional().describe("Set when a script manages the note and may overwrite the change"),
});

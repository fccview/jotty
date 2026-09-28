import { z } from "zod";
import { apiNames } from "@/app/_schemas/api/names";
import { ListView, categoryField, pageFields, required, searchQuery, timestamp, uuidParam } from "./common";

export const noteSchema = z
  .object({
    id: z.string().describe("Note uuid"),
    title: z.string(),
    category: z.string(),
    content: z.string().optional(),
    excerpt: z.string().optional().describe("Plain-text start of the content, in the summary view. Left out for encrypted notes"),
    encrypted: z.boolean().optional().describe("The content is ciphertext and can't be read without the passphrase or key"),
    owner: z.string().optional(),
    createdAt: timestamp.optional(),
    updatedAt: timestamp.optional(),
  })
  .register(apiNames, { id: "Note" });

export const noteListQuery = z.object({
  category: z.string().optional().describe("Only notes in this folder"),
  q: searchQuery,
  view: z
    .enum(ListView)
    .default(ListView.FULL)
    .describe("full returns each note's content, summary returns an excerpt instead"),
  ...pageFields,
});

export const noteCreateBody = z.object({
  title: required("Title"),
  content: z.string().default(""),
  category: categoryField,
});

export const noteUpdateBody = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  category: z.string().optional(),
});

export const noteParams = uuidParam("noteId", "Note");

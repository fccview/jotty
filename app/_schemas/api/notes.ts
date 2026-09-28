import { z } from "zod";
import { apiNames } from "@/app/_schemas/api/names";
import {
  ListView,
  categoryField,
  envelope,
  pageFields,
  required,
  searchQuery,
  sliceQuery,
  timestamp,
  uuidParam,
} from "./common";

export const noteSchema = z
  .object({
    id: z.string().describe("Note uuid"),
    title: z.string(),
    category: z.string(),
    content: z.string().optional(),
    excerpt: z.string().optional().describe("Plain-text start of the content, in the summary view. Left out for encrypted notes"),
    encrypted: z.boolean().optional().describe("The content is ciphertext and can't be read without the passphrase or key"),
    owner: z.string().optional(),
    tags: z.array(z.string()).optional().describe("Tags come from #hashtags in the content, like #work or #home/garden"),
    managed: z.boolean().optional().describe("True when frontmatter says managed: true, meaning a script rewrites this note and may drop manual edits"),
    contentLength: z.number().optional().describe("Characters in the whole content, on a single note or a batch"),
    nextOffset: z.number().optional().describe("Pass this as offset to read the rest when limit cut the content"),
    createdAt: timestamp.optional(),
    updatedAt: timestamp.optional(),
  })
  .register(apiNames, { id: "Note" });

export const noteListQuery = z.object({
  category: z.string().optional().describe("Only notes in this folder"),
  q: searchQuery,
  tag: z.string().optional().describe("Only notes with this tag or one nested under it, like work or home/garden"),
  view: z
    .enum(ListView)
    .default(ListView.FULL)
    .describe("full returns each note's content, summary returns an excerpt instead"),
  ...pageFields,
});

export const NOTES_BATCH_MAX = 50;

export const noteIdList = (ids: string): string[] =>
  Array.from(new Set(ids.split(",").map((id) => id.trim().toLowerCase()).filter(Boolean)));

export const noteBatchQuery = z.object({
  ids: required("ids")
    .describe(`Comma-separated note uuids, ${NOTES_BATCH_MAX} at most`)
    .refine((ids) => noteIdList(ids).length <= NOTES_BATCH_MAX, {
      error: `Pass ${NOTES_BATCH_MAX} ids at most`,
    }),
});

export const noteBatchSchema = z.object({
  notes: z.array(noteSchema).describe("The notes found, in the order asked, each with its whole content and contentLength"),
  missing: z.array(z.string()).describe("Ids that match no note you can read, or whose file couldn't be read"),
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

export const noteReadQuery = sliceQuery;

export const notePatchBody = z.object({
  find: required("find").describe("Exact text to replace, it must appear exactly once in the note"),
  replace: z.string().describe("Text to put in its place, empty to delete it"),
});

export const noteTagBody = z
  .object({
    add: z.array(z.string()).optional().describe("Tags to add as #hashtags at the end of the note"),
    remove: z.array(z.string()).optional().describe("Tags to take off. Their #hashtags come out of the content and the frontmatter drops them"),
  })
  .refine((body) => Boolean(body.add?.length || body.remove?.length), {
    error: "Pass add or remove",
  });

export const warnedNote = envelope(noteSchema).extend({
  warning: z.string().optional().describe("Set when a script manages the note and may overwrite the change"),
});

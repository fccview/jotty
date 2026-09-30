import { z } from "zod";
import { apiNames } from "@/app/_schemas/api/names";
import { HowtoSections } from "@/app/_utils/howto-utils";

export const docParams = z.object({
  docId: z.string().describe("Guide id from listDocs, like mcp, api or markdown"),
});

export const docListSchema = z.object({
  docs: z.array(
    z
      .object({
        id: z.string(),
        title: z.string(),
        section: z.enum(HowtoSections).describe("jotty for guides about Jotty itself, mcp for the MCP server guides"),
      })
      .register(apiNames, { id: "DocSummary" }),
  ),
  total: z.number(),
});

export const docSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().describe("The guide as markdown"),
  contentLength: z.number().describe("Characters in the whole guide"),
  nextOffset: z.number().optional().describe("Pass this as offset to read the rest when limit cut the guide"),
});

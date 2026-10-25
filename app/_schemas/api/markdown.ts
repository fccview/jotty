import { z } from "zod";
import { apiNames } from "@/app/_schemas/api/names";
import { envelope, required } from "./common";

export const HTML_LIMIT = 5 * 1024 * 1024;
const JSON_ESCAPE_WORST = 6;
const BODY_SLACK = 64 * 1024;
export const HTML_BODY_LIMIT = HTML_LIMIT * JSON_ESCAPE_WORST + BODY_SLACK;

export const fromHtmlBody = z
  .object({
    html: required("html")
      .max(HTML_LIMIT, "html is larger than 5 MB")
      .describe("HTML to convert, a fragment or a whole page"),
    baseUrl: z
      .url("baseUrl must be a full URL")
      .optional()
      .describe("Page address that relative href and src values are resolved against"),
  })
  .register(apiNames, { id: "MarkdownFromHtml" });

export const fromHtmlSchema = envelope(
  z.object({
    markdown: z.string().describe("Markdown exactly as the note editor would save it, empty when nothing survived"),
  }),
);

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { registerTools } from "../tools/register.ts";
import type { ToolContext } from "../tools/context.ts";
import manifest from "../../package.json" with { type: "json" };

export const SERVER_NAME = "jotty-mcp";
export const SERVER_VERSION = manifest.version;

export const SERVER_INSTRUCTIONS = [
  "Tools for a Jotty instance: notes, checklists and Kanban boards, acting as the user who owns the API key.",
  "Ids are uuids, so list or search first to get one. Checklist items are addressed by tree index, like 0 or 2.1.",
  "Search ranks the best matches first and finds the words in any order.",
  "Every tool takes maxChars to raise or lower how much output it returns. get_note reports contentLength and takes offset and limit, so read a long note in slices until nextOffset is gone.",
  "update_note replaces the whole content, so only send it after reading all of the note. For a small change use patch_note, which swaps one exact piece of text and leaves the rest untouched.",
  "Tags are #hashtags in the content, and #parent/child nests. list_tags shows them, list_notes filters by tag, tag_note adds or removes them without resending the note.",
  "Notes link to each other. After finding an item, get_related lists what links to it and what it links to, so you can follow the links and read only what matters. get_brain maps the items around one, or the most linked ones.",
  "Link items with connect_items only when they relate to each other, and remove a link with disconnect_items. An item with no links is fine, so don't add links just to empty list_orphans.",
  "A script rewrites any note with managed: true, so edits to it may not last. Write tools say so in a warning.",
  "list_docs and read_doc return Jotty's own guides. Read the api guide before writing a note file or its frontmatter by hand.",
  "The dedicated tools cover search, links, tags, shares, notes, checklists and boards. Use discover and call_operation for everything else the instance offers.",
].join(" ");

export const createMcpServer = (ctx: ToolContext): Server => {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} }, instructions: SERVER_INSTRUCTIONS },
  );
  registerTools(server, ctx);
  return server;
};

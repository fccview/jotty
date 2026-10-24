import { NextResponse } from "next/server";
import { getUserNotes } from "@/app/_server/actions/note/queries";
import { getUserChecklists } from "@/app/_server/actions/checklist/queries";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { tagListSchema } from "@/app/_schemas/api/tags";
import { normalizeTag } from "@/app/_utils/tag-utils";

export const dynamic = "force-dynamic";

interface Tally {
  notes: number;
  checklists: number;
}

type Counted = keyof Tally;

const _tally = (counts: Map<string, Tally>, tags: string[] | undefined, kind: Counted) =>
  new Set((tags || []).map(normalizeTag).filter(Boolean)).forEach((tag) => {
    const entry = counts.get(tag) || { notes: 0, checklists: 0 };
    entry[kind] += 1;
    counts.set(tag, entry);
  });

export const GET = defineRoute(
  {
    id: "listTags",
    method: HttpMethod.GET,
    path: "/tags",
    tag: ApiTag.DISCOVERY,
    summary: "List tags",
    description:
      "Every tag on the notes and checklists the API key owner can read, with how many carry it. Tags are #hashtags written in the content, and #parent/child nests. Filter notes by one with listNotes tag=.",
    responses: {
      200: { description: "Tags", schema: tagListSchema },
      401: ERRORS[401],
      500: ERRORS[500],
    },
  },
  async ({ user }) => {
    const [notes, lists] = await Promise.all([
      getUserNotes({ username: user.username, metadataOnly: true }),
      getUserChecklists({ username: user.username, metadataOnly: true }),
    ]);
    if (!notes.success || !lists.success) return refuse("Failed to read tags", 500);

    const counts = new Map<string, Tally>();
    (notes.data || []).forEach((note) => _tally(counts, note.tags, "notes"));
    (lists.data || []).forEach((list) => _tally(counts, list.tags, "checklists"));

    const tags = Array.from(counts, ([tag, tally]) => ({ tag, ...tally })).sort((a, b) =>
      a.tag.localeCompare(b.tag),
    );
    return NextResponse.json({ tags, total: tags.length });
  },
);

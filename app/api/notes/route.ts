import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getUserNotes, createNote } from "@/app/_server/actions/note";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiAuth(request, async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const category = searchParams.get("category");
      const search = searchParams.get("q");

      const notes = await getUserNotes({ username: user.username });
      if (!notes.success || !notes.data) {
        return NextResponse.json(
          { error: notes.error || "Failed to fetch notes" },
          { status: 500 }
        );
      }

      let filteredNotes = notes.data;

      if (category) {
        filteredNotes = filteredNotes.filter(
          (note) => note.category === category
        );
      }
      if (search) {
        const searchLower = search.toLowerCase();
        filteredNotes = filteredNotes.filter(
          (note) =>
            note.title?.toLowerCase().includes(searchLower) ||
            note.content?.toLowerCase().includes(searchLower)
        );
      }

      const transformedNotes = filteredNotes.map((note) => ({
        id: note.uuid || note.id,
        title: note.title,
        category: note.category || "Uncategorized",
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      }));

      return NextResponse.json({ notes: transformedNotes });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const {
        title,
        content = "",
        category = "Uncategorized",
      } = body;

      if (!title) {
        return NextResponse.json(
          { error: "Title is required" },
          { status: 400 }
        );
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("rawContent", content);
      formData.append("category", category);
      formData.append("user", JSON.stringify(user));

      const result = await createNote(formData);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      const transformedNote = {
        id: result.data?.uuid || result.data?.id,
        title: result.data?.title,
        category: result.data?.category || "Uncategorized",
        content: result.data?.content || content,
        createdAt: result.data?.createdAt,
        updatedAt: result.data?.updatedAt,
        owner: result.data?.owner,
      };

      return NextResponse.json({ success: true, data: transformedNote });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}

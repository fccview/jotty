import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getNotes, createNote } from "@/app/_server/actions/note";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiAuth(request, async (user) => {
    try {
      const docs = await getNotes(user.username);
      if (!docs.success || !docs.data) {
        return NextResponse.json(
          { error: docs.error || "Failed to fetch notes" },
          { status: 500 }
        );
      }

      return NextResponse.json({ notes: docs.data });
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
      const { title, content = "", category = "Uncategorized" } = body;

      if (!title) {
        return NextResponse.json(
          { error: "Title is required" },
          { status: 400 }
        );
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      formData.append("category", category);

      const result = await createNote(formData);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, data: result.data });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}

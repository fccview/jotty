import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { createItem } from "@/app/_server/actions/checklist-item";
import { getListById } from "@/app/_server/actions/checklist";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { listId: string } }
) {
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { text, status, time } = body;

      if (!text) {
        return NextResponse.json(
          { error: "Text is required" },
          { status: 400 }
        );
      }

      const list = await getListById(params.listId, user.username);
      if (!list) {
        return NextResponse.json({ error: "List not found" }, { status: 404 });
      }

      const formData = new FormData();
      formData.append("listId", params.listId);
      formData.append("text", text);
      formData.append("category", list.category || "Uncategorized");

      if (status) {
        formData.append("status", status);
      }
      if (time !== undefined) {
        formData.append(
          "time",
          typeof time === "string" ? time : JSON.stringify(time)
        );
      }

      const result = await createItem(formData, user.username, true);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to create item" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}

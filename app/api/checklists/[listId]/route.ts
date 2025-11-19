import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getListById, updateList, deleteList } from "@/app/_server/actions/checklist";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: { listId: string } }
) {
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { title, category } = body;

      const list = await getListById(params.listId, user.username);
      if (!list) {
        return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
      }

      const formData = new FormData();
      formData.append("id", list.id);
      formData.append("title", title ?? list.title);
      formData.append("category", category ?? list.category ?? "Uncategorized");
      formData.append("originalCategory", list.category || "Uncategorized");
      formData.append("apiUser", JSON.stringify(user));

      const result = await updateList(formData);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      const transformedChecklist = {
        id: result.data?.uuid || result.data?.id,
        title: result.data?.title,
        category: result.data?.category || "Uncategorized",
        type: result.data?.type || "simple",
        createdAt: result.data?.createdAt,
        updatedAt: result.data?.updatedAt,
      };

      return NextResponse.json({ success: true, data: transformedChecklist });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { listId: string } }
) {
  return withApiAuth(request, async (user) => {
    try {
      const list = await getListById(params.listId, user.username);
      if (!list) {
        return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
      }

      const formData = new FormData();
      formData.append("id", list.id);
      formData.append("category", list.category || "Uncategorized");
      formData.append("apiUser", JSON.stringify(user));

      const result = await deleteList(formData);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
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

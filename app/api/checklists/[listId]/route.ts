import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, listUuid } from "@/app/_utils/api-utils";
import { getListById } from "@/app/_server/actions/checklist/queries";
import { dropList, editList } from "@/app/_server/actions/checklist/editor";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, props: { params: Promise<{ listId: string }> }) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { title, category } = body;

      const uuid = await listUuid(request, params.listId, user.username);
      const list = uuid ? await getListById(uuid, user.username) : undefined;
      if (!list) {
        return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
      }

      const formData = new FormData();
      formData.append("uuid", list.uuid!);
      formData.append("title", title ?? list.title);
      formData.append("category", category ?? list.category ?? "Uncategorized");
      const result = await editList(user, formData);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      const transformedChecklist = {
        id: result.data?.uuid,
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

export async function DELETE(request: NextRequest, props: { params: Promise<{ listId: string }> }) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const uuid = await listUuid(request, params.listId, user.username);
      const list = uuid ? await getListById(uuid, user.username) : undefined;
      if (!list) {
        return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
      }

      const formData = new FormData();
      formData.append("uuid", list.uuid!);
      const result = await dropList(user, formData);
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

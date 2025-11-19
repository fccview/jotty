import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { updateItem } from "@/app/_server/actions/checklist-item";
import { getListById } from "@/app/_server/actions/checklist";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: { listId: string; itemIndex: string } }
) {
  return withApiAuth(request, async (user) => {
    try {
      const itemIndex = parseInt(params.itemIndex);
      if (isNaN(itemIndex) || itemIndex < 0) {
        return NextResponse.json(
          { error: "Invalid item index" },
          { status: 400 }
        );
      }

      const list = await getListById(params.listId, user.username);
      if (!list) {
        return NextResponse.json({ error: "List not found" }, { status: 404 });
      }

      if (itemIndex >= list.items.length) {
        return NextResponse.json(
          { error: "Item index out of range" },
          { status: 400 }
        );
      }

      const item = list.items[itemIndex];

      const formData = new FormData();
      formData.append("listId", list.id);
      formData.append("itemId", item.id);
      formData.append("completed", "true");
      formData.append("category", list.category || "Uncategorized");

      const result = await updateItem(list, formData, user.username, true);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to check item" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "List not found") {
          return NextResponse.json(
            { error: "List not found" },
            { status: 404 }
          );
        }
        if (error.message === "Item index out of range") {
          return NextResponse.json(
            { error: "Item index out of range" },
            { status: 400 }
          );
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}

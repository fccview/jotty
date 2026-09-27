import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, listUuid, turnAway } from "@/app/_utils/api-utils";
import { addItem } from "@/app/_server/actions/checklist-item/editor";
import { graftItem } from "@/app/_server/actions/checklist-item/grafter";
import { getListById } from "@/app/_server/actions/checklist/queries";
import { PermissionTypes } from "@/app/_types/enums";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ listId: string }> },
) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { text, status, time, parentIndex } = body;

      if (!text) {
        return NextResponse.json(
          { error: "Text is required" },
          { status: 400 },
        );
      }

      const uuid = await listUuid(request, params.listId, user.username);
      const list = uuid ? await getListById(uuid, user.username) : undefined;
      if (!list) {
        return NextResponse.json({ error: "List not found" }, { status: 404 });
      }

      const refused = await turnAway(
        user.username,
        list.uuid!,
        PermissionTypes.EDIT,
      );
      if (refused) return refused;

      const formData = new FormData();
      formData.append("text", text);

      if (parentIndex !== undefined) {
        const indexPath = parentIndex
          .toString()
          .split(".")
          .map((i: string) => parseInt(i));
        let parentItem: any = null;
        let currentItems = list.items;

        for (const idx of indexPath) {
          if (idx >= currentItems.length) {
            return NextResponse.json(
              { error: "Parent item not found" },
              { status: 404 },
            );
          }
          parentItem = currentItems[idx];
          currentItems = parentItem.children || [];
        }

        if (!parentItem) {
          return NextResponse.json(
            { error: "Parent item not found" },
            { status: 404 },
          );
        }

        const graft = new FormData();
        graft.append("uuid", list.uuid!);
        graft.append("parentId", parentItem.id);
        graft.append("text", text);

        const grafted = await graftItem(user, graft);

        if (!grafted.success) {
          return NextResponse.json(
            { error: grafted.error || "Failed to add sub-item" },
            { status: 500 },
          );
        }

        return NextResponse.json({ success: true });
      }
      if (status) {
        formData.append("status", status);
      }
      if (time !== undefined) {
        formData.append(
          "time",
          typeof time === "string" ? time : JSON.stringify(time),
        );
      }

      const result = await addItem(user, list, formData, true);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to create item" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        data: { id: result.data?.id },
      });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  });
}

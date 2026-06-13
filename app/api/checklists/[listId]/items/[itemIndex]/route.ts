import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getListById } from "@/app/_server/actions/checklist";
import { updateItem } from "@/app/_server/actions/checklist-item";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { serverWriteFile } from "@/app/_server/actions/file";
import path from "path";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ listId: string; itemIndex: string }> },
) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { text, description } = body;

      if (!text && description === undefined) {
        return NextResponse.json(
          { error: "Provide at least 'text' or 'description' to update" },
          { status: 400 },
        );
      }

      if (text !== undefined && typeof text !== "string") {
        return NextResponse.json(
          { error: "'text' must be a string" },
          { status: 400 },
        );
      }

      if (
        description !== undefined &&
        description !== null &&
        typeof description !== "string"
      ) {
        return NextResponse.json(
          { error: "'description' must be a string" },
          { status: 400 },
        );
      }

      const list = await getListById(params.listId, user.username);
      if (!list) {
        return NextResponse.json({ error: "List not found" }, { status: 404 });
      }

      const indexPath = params.itemIndex.split(".").map((i) => parseInt(i));

      for (const idx of indexPath) {
        if (isNaN(idx) || idx < 0) {
          return NextResponse.json({ error: "Invalid item index" }, { status: 400 });
        }
      }

      let item: any = null;
      let currentItems = list.items;

      for (const idx of indexPath) {
        if (idx >= currentItems.length) {
          return NextResponse.json({ error: "Item index out of range" }, { status: 400 });
        }
        item = currentItems[idx];
        currentItems = item.children || [];
      }

      if (!item) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      const formData = new FormData();
      formData.append("listId", list.id);
      formData.append("itemId", item.id);
      formData.append("category", list.category || "Uncategorized");
      if (text) formData.append("text", text);
      if (description !== undefined) formData.append("description", description ?? "");

      const result = await updateItem(list, formData, user.username, true);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to update item" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ listId: string; itemIndex: string }> },
) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const list = await getListById(params.listId, user.username);
      if (!list) {
        return NextResponse.json({ error: "List not found" }, { status: 404 });
      }

      const indexPath = params.itemIndex.split(".").map((i) => parseInt(i));

      for (const idx of indexPath) {
        if (isNaN(idx) || idx < 0) {
          return NextResponse.json(
            { error: "Invalid item index" },
            { status: 400 },
          );
        }
      }

      let item: any = null;
      let currentItems = list.items;

      for (const idx of indexPath) {
        if (idx >= currentItems.length) {
          return NextResponse.json(
            { error: "Item index out of range" },
            { status: 400 },
          );
        }
        item = currentItems[idx];
        currentItems = item.children || [];
      }

      if (!item) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      const filterOutItem = (items: any[], itemId: string): any[] => {
        return items
          .filter((item) => item.id !== itemId)
          .map((item) => {
            const filteredChildren = item.children
              ? filterOutItem(item.children, itemId)
              : undefined;
            return {
              ...item,
              children:
                filteredChildren && filteredChildren.length > 0
                  ? filteredChildren
                  : undefined,
            };
          });
      };

      const updatedList = {
        ...list,
        items: filterOutItem(list.items || [], item.id),
        updatedAt: new Date().toISOString(),
      };

      const ownerDir = path.join(
        process.cwd(),
        "data",
        CHECKLISTS_FOLDER,
        list.owner!,
      );
      const filePath = path.join(
        ownerDir,
        list.category || "Uncategorized",
        `${list.id}.md`,
      );

      await serverWriteFile(filePath, listToMarkdown(updatedList as any));

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  });
}

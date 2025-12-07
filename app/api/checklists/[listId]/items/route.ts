import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { createItem } from "@/app/_server/actions/checklist-item";
import { getListById } from "@/app/_server/actions/checklist";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { serverWriteFile } from "@/app/_server/actions/file";
import path from "path";

const CHECKLISTS_FOLDER = "checklists";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { listId: string } }
) {
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { text, status, time, parentIndex } = body;

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
      formData.append("listId", list.id);
      formData.append("text", text);
      formData.append("category", list.category || "Uncategorized");

      if (parentIndex !== undefined) {
        const indexPath = parentIndex.toString().split('.').map((i: string) => parseInt(i));
        let parentItem: any = null;
        let currentItems = list.items;

        for (const idx of indexPath) {
          if (idx >= currentItems.length) {
            return NextResponse.json(
              { error: "Parent item not found" },
              { status: 404 }
            );
          }
          parentItem = currentItems[idx];
          currentItems = parentItem.children || [];
        }

        if (!parentItem) {
          return NextResponse.json(
            { error: "Parent item not found" },
            { status: 404 }
          );
        }

        const newSubItem: any = {
          id: `${list.id}-sub-${Date.now()}`,
          text,
          completed: false,
          order: 0,
        };

        const addSubItemToParent = (items: any[], parentId: string): boolean => {
          for (let item of items) {
            if (item.id === parentId) {
              if (!item.children) {
                item.children = [];
              }
              item.children.push(newSubItem);
              return true;
            }
            if (item.children && addSubItemToParent(item.children, parentId)) {
              return true;
            }
          }
          return false;
        };

        const updatedItems = JSON.parse(JSON.stringify(list.items));
        if (!addSubItemToParent(updatedItems, parentItem.id)) {
          return NextResponse.json(
            { error: "Failed to add sub-item" },
            { status: 500 }
          );
        }

        const updatedList = {
          ...list,
          items: updatedItems,
          updatedAt: new Date().toISOString(),
        };

        const ownerDir = path.join(
          process.cwd(),
          "data",
          CHECKLISTS_FOLDER,
          list.owner!
        );
        const filePath = path.join(
          ownerDir,
          list.category || "Uncategorized",
          `${list.id}.md`
        );

        await serverWriteFile(filePath, listToMarkdown(updatedList as any));

        return NextResponse.json({ success: true });
      }
      if (status) {
        formData.append("status", status);
      }
      if (time !== undefined) {
        formData.append(
          "time",
          typeof time === "string" ? time : JSON.stringify(time)
        );
      }

      const result = await createItem(list, formData, user.username, true);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to create item" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data: { id: result.data?.id } });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}

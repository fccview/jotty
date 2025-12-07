import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getListById } from "@/app/_server/actions/checklist";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { serverWriteFile } from "@/app/_server/actions/file";
import path from "path";

const CHECKLISTS_FOLDER = "checklists";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { listId: string; itemIndex: string } }
) {
  return withApiAuth(request, async (user) => {
    try {
      const list = await getListById(params.listId, user.username);
      if (!list) {
        return NextResponse.json({ error: "List not found" }, { status: 404 });
      }

      const indexPath = params.itemIndex.split('.').map(i => parseInt(i));

      for (const idx of indexPath) {
        if (isNaN(idx) || idx < 0) {
          return NextResponse.json(
            { error: "Invalid item index" },
            { status: 400 }
          );
        }
      }

      let item: any = null;
      let currentItems = list.items;

      for (const idx of indexPath) {
        if (idx >= currentItems.length) {
          return NextResponse.json(
            { error: "Item index out of range" },
            { status: 400 }
          );
        }
        item = currentItems[idx];
        currentItems = item.children || [];
      }

      if (!item) {
        return NextResponse.json(
          { error: "Item not found" },
          { status: 404 }
        );
      }

      const filterOutItem = (items: any[], itemId: string): any[] => {
        return items
          .filter((item) => item.id !== itemId)
          .map((item) => {
            const filteredChildren = item.children ? filterOutItem(item.children, itemId) : undefined;
            return {
              ...item,
              children: filteredChildren && filteredChildren.length > 0 ? filteredChildren : undefined,
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
        list.owner!
      );
      const filePath = path.join(
        ownerDir,
        list.category || "Uncategorized",
        `${list.id}.md`
      );

      await serverWriteFile(filePath, listToMarkdown(updatedList as any));

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

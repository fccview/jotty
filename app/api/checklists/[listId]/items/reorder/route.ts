import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getListById } from "@/app/_server/actions/checklist";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { serverWriteFile, ensureDir } from "@/app/_server/actions/file";
import { checkUserPermission } from "@/app/_server/actions/sharing";
import { broadcast } from "@/app/_server/ws/broadcast";
import { ItemTypes, PermissionTypes } from "@/app/_types/enums";
import path from "path";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";

export const dynamic = "force-dynamic";

type TreeItem = { id: string; order: number; children?: TreeItem[]; [key: string]: unknown };
type Located = { item: TreeItem; siblings: TreeItem[]; index: number };

const findInTree = (items: TreeItem[], id: string): Located | null => {
  for (let i = 0; i < items.length; i++) {
    if (items[i].id === id) return { item: items[i], siblings: items, index: i };
    if (items[i].children) {
      const found = findInTree(items[i].children!, id);
      if (found) return found;
    }
  }
  return null;
};

const isDescendant = (ancestorId: string, targetId: string, items: TreeItem[]): boolean => {
  const walk = (item: TreeItem): boolean => {
    if (!item.children) return false;
    return item.children.some((c) => c.id === targetId || walk(c));
  };
  const ancestor = findInTree(items, ancestorId);
  return ancestor ? walk(ancestor.item) : false;
};

const stampOrder = (items: TreeItem[]): void => {
  items.forEach((item, i) => {
    item.order = i;
    if (item.children) stampOrder(item.children);
  });
};

const cloneTree = (items: TreeItem[]): TreeItem[] =>
  items.map((item) => ({ ...item, children: item.children ? cloneTree(item.children) : undefined }));

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ listId: string }> },
) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { activeItemId, overItemId, position = "before", isDropInto = false } = body;

      if (!activeItemId || !overItemId) {
        return NextResponse.json(
          { error: "'activeItemId' and 'overItemId' are required" },
          { status: 400 },
        );
      }

      if (position !== "before" && position !== "after") {
        return NextResponse.json(
          { error: "'position' must be 'before' or 'after'" },
          { status: 400 },
        );
      }

      const list = await getListById(params.listId, user.username);
      if (!list) {
        return NextResponse.json({ error: "List not found" }, { status: 404 });
      }

      const canEdit = await checkUserPermission(
        list.uuid || params.listId,
        list.category || "",
        ItemTypes.CHECKLIST,
        user.username,
        PermissionTypes.EDIT,
      );

      if (!canEdit) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const items = cloneTree(list.items as unknown as TreeItem[]);

      if (isDescendant(activeItemId, overItemId, items)) {
        return NextResponse.json({ success: true });
      }

      const activeInfo = findInTree(items, activeItemId);
      const overInfo = findInTree(items, overItemId);

      if (!activeInfo || !overInfo) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      if (activeItemId === overItemId) {
        return NextResponse.json({ success: true });
      }

      activeInfo.siblings.splice(activeInfo.index, 1);

      if (isDropInto) {
        if (!overInfo.item.children) overInfo.item.children = [];
        overInfo.item.children.push(activeInfo.item);
      } else {
        let insertAt = overInfo.siblings.findIndex((i) => i.id === overItemId);
        if (position === "after") insertAt += 1;
        overInfo.siblings.splice(insertAt, 0, activeInfo.item);
      }

      stampOrder(items);

      const updatedList = { ...list, items, updatedAt: new Date().toISOString() };

      const ownerDir = path.join(process.cwd(), "data", CHECKLISTS_FOLDER, list.owner!);
      const categoryDir = path.join(ownerDir, list.category || "Uncategorized");
      await ensureDir(categoryDir);
      await serverWriteFile(path.join(categoryDir, `${list.id}.md`), listToMarkdown(updatedList as any));

      try {
        revalidatePath("/");
        revalidatePath(`/checklist/${list.id}`);
      } catch (error) {
        console.warn("Cache revalidation failed, but data was saved successfully:", error);
      }

      try {
        await broadcast({
          type: "checklist",
          action: "updated",
          entityId: list.id,
          username: user.username,
        });
      } catch (error) {
        console.warn("Broadcast failed, but data was saved successfully:", error);
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}

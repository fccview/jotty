import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, listUuid } from "@/app/_utils/api-utils";
import { getListById } from "@/app/_server/actions/checklist";
import { updateItem } from "@/app/_server/actions/checklist-item";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { serverWriteFile } from "@/app/_server/actions/file";
import path from "path";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { KanbanPriorityLevel } from "@/app/_types/enums";

export const dynamic = "force-dynamic";

const ALLOWED_PRIORITIES = Object.values(KanbanPriorityLevel) as string[];

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ listId: string; itemIndex: string }> },
) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const {
        text,
        description,
        priority,
        score,
        startDate,
        targetDate,
        estimatedTime,
      } = body;

      const hasField =
        text !== undefined ||
        description !== undefined ||
        priority !== undefined ||
        score !== undefined ||
        startDate !== undefined ||
        targetDate !== undefined ||
        estimatedTime !== undefined;

      if (!hasField) {
        return NextResponse.json(
          { error: "Provide at least one field to update" },
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

      if (
        priority !== undefined &&
        priority !== null &&
        !ALLOWED_PRIORITIES.includes(priority)
      ) {
        return NextResponse.json(
          {
            error: `'priority' must be one of: ${ALLOWED_PRIORITIES.join(", ")}`,
          },
          { status: 400 },
        );
      }

      if (
        score !== undefined &&
        score !== null &&
        (typeof score !== "number" || Number.isNaN(score))
      ) {
        return NextResponse.json(
          { error: "'score' must be a number" },
          { status: 400 },
        );
      }

      if (
        startDate !== undefined &&
        startDate !== null &&
        typeof startDate !== "string"
      ) {
        return NextResponse.json(
          { error: "'startDate' must be a string" },
          { status: 400 },
        );
      }

      if (
        targetDate !== undefined &&
        targetDate !== null &&
        typeof targetDate !== "string"
      ) {
        return NextResponse.json(
          { error: "'targetDate' must be a string" },
          { status: 400 },
        );
      }

      if (
        estimatedTime !== undefined &&
        estimatedTime !== null &&
        (typeof estimatedTime !== "number" || Number.isNaN(estimatedTime))
      ) {
        return NextResponse.json(
          { error: "'estimatedTime' must be a number" },
          { status: 400 },
        );
      }

      const uuid = await listUuid(request, params.listId, user.username);
      const list = uuid ? await getListById(uuid, user.username) : undefined;
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

      const formData = new FormData();
      formData.append("itemId", item.id);
      if (text !== undefined && text !== null) formData.append("text", text);
      if (description !== undefined)
        formData.append("description", description ?? "");
      if (priority !== undefined) formData.append("priority", priority ?? "");
      if (score !== undefined)
        formData.append("score", score === null ? "" : String(score));
      if (startDate !== undefined)
        formData.append("startDate", startDate ?? "");
      if (targetDate !== undefined)
        formData.append("targetDate", targetDate ?? "");
      if (estimatedTime !== undefined)
        formData.append(
          "estimatedTime",
          estimatedTime === null ? "" : String(estimatedTime),
        );

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
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
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
      const uuid = await listUuid(request, params.listId, user.username);
      const list = uuid ? await getListById(uuid, user.username) : undefined;
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

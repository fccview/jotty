import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getCategories } from "@/app/_server/actions/category";
import { Modes } from "@/app/_types/enums";
import { ARCHIVED_DIR_NAME } from "@/app/_consts/files";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiAuth(request, async (user) => {
    try {
      const notesResult = await getCategories(Modes.NOTES, user.username);
      const checklistsResult = await getCategories(
        Modes.CHECKLISTS,
        user.username
      );

      if (!notesResult.success || !checklistsResult.success) {
        return NextResponse.json(
          {
            error:
              notesResult.error ||
              checklistsResult.error ||
              "Failed to fetch categories",
          },
          { status: 500 }
        );
      }

      const filterArchived = (categories: any[]) => {
        return categories
          .filter((cat) => !cat.path.includes(ARCHIVED_DIR_NAME))
          .map((cat) => ({
            name: cat.name,
            path: cat.path,
            count: cat.count,
            level: cat.level,
          }));
      };

      const categories = {
        notes: filterArchived(notesResult.data || []),
        checklists: filterArchived(checklistsResult.data || []),
      };

      return NextResponse.json({ categories });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}

import { NextResponse } from "next/server";
import { categoriesFor } from "@/app/_server/actions/category/tree";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { categoriesSchema } from "@/app/_schemas/api/discovery";
import { Category } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { ARCHIVED_DIR_NAME } from "@/app/_consts/files";

export const dynamic = "force-dynamic";

const _visible = (categories: Category[]) =>
  categories
    .filter((category) => !category.path.includes(ARCHIVED_DIR_NAME))
    .map(({ name, path, count, level }) => ({ name, path, count, level }));

export const GET = defineRoute(
  {
    id: "listCategories",
    method: HttpMethod.GET,
    path: "/categories",
    tag: ApiTag.DISCOVERY,
    summary: "List categories",
    description: "Your note and checklist categories, including shared ones. Archived categories are left out.",
    responses: {
      200: { description: "Categories per mode", schema: categoriesSchema },
      401: ERRORS[401],
      500: ERRORS[500],
    },
  },
  async ({ user }) => {
    const notes = await categoriesFor(Modes.NOTES, user.username);
    const checklists = await categoriesFor(Modes.CHECKLISTS, user.username);

    if (!notes.success || !checklists.success) {
      return refuse(notes.error || checklists.error || "Failed to fetch categories", 500);
    }

    return NextResponse.json({
      categories: {
        notes: _visible(notes.data || []),
        checklists: _visible(checklists.data || []),
      },
    });
  },
);

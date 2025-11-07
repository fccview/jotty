import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { migrateToUuidLinks, ensureItemHasUuid, resolveUuidToPath } from "@/app/_server/actions/link";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    return withApiAuth(request, async (user) => {
        try {
            const { username, action, itemType, itemId, category, uuid } = await request.json();

            if (!username) {
                return NextResponse.json(
                    { error: "Username is required" },
                    { status: 400 }
                );
            }

            if (action === "migrate") {
                await migrateToUuidLinks(username);
                return NextResponse.json({
                    success: true,
                    message: `Successfully migrated links to UUID format for ${username}`,
                });
            }

            if (action === "ensure-uuid") {
                if (!itemType || !itemId) {
                    return NextResponse.json(
                        { error: "itemType and itemId are required for ensure-uuid" },
                        { status: 400 }
                    );
                }

                const itemUuid = await ensureItemHasUuid(username, itemType, itemId, category);
                return NextResponse.json({
                    success: true,
                    uuid: itemUuid,
                });
            }

            if (action === "resolve-uuid") {
                if (!uuid) {
                    return NextResponse.json(
                        { error: "uuid is required for resolve-uuid" },
                        { status: 400 }
                    );
                }

                const path = await resolveUuidToPath(username, uuid);
                return NextResponse.json({
                    success: true,
                    path,
                });
            }

            return NextResponse.json(
                { error: "Invalid action. Use 'migrate', 'ensure-uuid', or 'resolve-uuid'" },
                { status: 400 }
            );
        } catch (error) {
            console.error("Failed to process link action:", error);
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Failed to process link action" },
                { status: 500 }
            );
        }
    });
}

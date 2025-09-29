import { NextRequest, NextResponse } from "next/server";
import { withSessionAuth } from "@/app/_server/utils/session-auth";
import { PluginRuntime } from "@/app/_server/plugins/plugin-runtime";

const pluginRuntime = new PluginRuntime();

export async function DELETE(
    request: NextRequest,
    { params }: { params: { pluginId: string } }
) {
    return withSessionAuth(async (user) => {
        try {
            const { pluginId } = params;
            const plugin = pluginRuntime.getPlugin(pluginId);
            if (!plugin) {
                return NextResponse.json(
                    { success: false, error: "Plugin not found" },
                    { status: 404 }
                );
            }

            // First disable it
            await pluginRuntime.disablePlugin(pluginId);

            return NextResponse.json({ success: true });
        } catch (error) {
            console.error("Error uninstalling plugin:", error);
            return NextResponse.json(
                { success: false, error: "Failed to uninstall plugin" },
                { status: 500 }
            );
        }
    });
}
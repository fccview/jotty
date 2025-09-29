import { NextRequest, NextResponse } from "next/server";
import { withSessionAuth } from "@/app/_server/utils/session-auth";
import { PluginRuntime } from "@/app/_server/plugins/plugin-runtime";

const pluginRuntime = PluginRuntime.getInstance();

export async function POST(
    request: NextRequest,
    { params }: { params: { pluginId: string } }
) {
    return withSessionAuth(async (user) => {
        try {
            const { pluginId } = params;
            console.log('POST /api/plugins/[pluginId]/disable - Disabling plugin:', pluginId);

            // Make sure plugins are discovered first
            await pluginRuntime.discoverLocalPlugins();

            // Now try to disable the plugin
            await pluginRuntime.disablePlugin(pluginId);

            return NextResponse.json({ success: true });
        } catch (error) {
            console.error("Error disabling plugin:", error);
            return NextResponse.json(
                { success: false, error: error instanceof Error ? error.message : "Failed to disable plugin" },
                { status: 500 }
            );
        }
    });
}
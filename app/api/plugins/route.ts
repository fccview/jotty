import { NextRequest, NextResponse } from "next/server";
import { withSessionAuth } from "@/app/_server/utils/session-auth";
import { PluginRuntime } from "@/app/_server/plugins/plugin-runtime";
import { PluginStateManager } from "@/app/_server/plugins/plugin-state";

const pluginRuntime = PluginRuntime.getInstance();
const stateManager = PluginStateManager.getInstance();

export async function GET(request: NextRequest) {
    return withSessionAuth(async (user) => {
        try {
            console.log('GET /api/plugins - Starting plugin discovery');

            // Initialize state first
            await stateManager.init();
            console.log('Plugin state initialized');

            // Then discover plugins
            await pluginRuntime.discoverLocalPlugins();
            const plugins = pluginRuntime.getAllPlugins();
            console.log('Found plugins:', plugins);

            // Get enabled plugins
            const enabledPlugins = await stateManager.getEnabledPlugins();
            console.log('Enabled plugins from state:', enabledPlugins);

            return NextResponse.json({
                success: true,
                plugins: plugins,
            });
        } catch (error) {
            console.error("Error getting plugins:", error instanceof Error ? error.stack : error);
            return NextResponse.json(
                { success: false, error: "Failed to get plugins" },
                { status: 500 }
            );
        }
    });
}
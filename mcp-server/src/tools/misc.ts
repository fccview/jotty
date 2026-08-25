import { z } from "zod";
import type { ToolModule } from "./types.js";
import { json, run } from "./shared.js";

/**
 * Misc endpoints: public health check, the authenticated user's profile, and
 * the admin link-index rebuild.
 */
export const miscModule: ToolModule = {
  register(server, client) {
    // GET /api/health (public)
    server.registerTool(
      "health",
      {
        title: "Health check",
        description:
          "Check the remote Jotty instance is reachable and report its version. Does not require an API key.",
      },
      async () => run(() => json(client.get("/api/health"))),
    );

    // GET /api/user/{username}
    server.registerTool(
      "get_user",
      {
        title: "Get user information",
        description:
          "Retrieve user information. Returns full data for the authenticated user (or admin viewing anyone), otherwise only public fields.",
        inputSchema: {
          username: z
            .string()
            .describe("Username to look up. Use your own username for your full profile."),
        },
      },
      async (args) =>
        run(() => json(client.get(`/api/user/${args.username}`))),
    );

    // GET /api/user (the API-key user — "whoami")
    server.registerTool(
      "get_current_user",
      {
        title: "Get current user",
        description:
          "Get the authenticated user's own profile and settings (theme, landing page, pinned lists/notes, editor preferences). Sensitive fields like passwordHash and apiKey are never returned.",
      },
      async () => run(() => json(client.get("/api/user"))),
    );

    // POST /api/admin/rebuild-index
    server.registerTool(
      "rebuild_link_index",
      {
        title: "Rebuild link index",
        description:
          "Rebuild the internal link index for a user (admin only). Useful after bulk operations or migrations.",
        inputSchema: {
          username: z.string().describe("Username whose link index should be rebuilt."),
        },
      },
      async (args) =>
        run(() =>
          json(client.post("/api/admin/rebuild-index", { username: args.username })),
        ),
    );
  },
};
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const isDev = process.env.NODE_ENV !== "production";

    if (isDev) {
      const { WebSocketServer } = await import("ws");
      const fs = await import("fs");
      const path = await import("path");
      const crypto = await import("crypto");

      const WS_PORT = parseInt(process.env.WS_PORT || "3131", 10);

      if ((globalThis as any).__jottyWsStarted) return;
      (globalThis as any).__jottyWsStarted = true;
      const sessionsFilePath = path.join(
        process.cwd(),
        "data",
        "users",
        "sessions.json",
      );

      const readSessions = (): Record<string, string> => {
        try {
          const content = fs.readFileSync(sessionsFilePath, "utf-8");
          return JSON.parse(content) || {};
        } catch {
          return {};
        }
      };

      const parseCookies = (
        cookieHeader: string | undefined,
      ): Record<string, string> => {
        const cookies: Record<string, string> = {};
        if (!cookieHeader) return cookies;
        cookieHeader.split(";").forEach((pair) => {
          const idx = pair.indexOf("=");
          if (idx < 0) return;
          cookies[pair.substring(0, idx).trim()] = pair
            .substring(idx + 1)
            .trim();
        });
        return cookies;
      };

      const connectedClients = new Map<
        import("ws").WebSocket,
        { connectionId: string; username: string }
      >();

      const wss = new WebSocketServer({ port: WS_PORT, host: "0.0.0.0" });

      wss.on("connection", (ws, req) => {
        const cookies = parseCookies(req.headers.cookie);
        const sessionId = cookies["session"];
        const sessions = readSessions();
        const username = sessionId ? sessions[sessionId] : null;

        if (!username) {
          ws.close(1008, "Unauthorized");
          return;
        }

        const connectionId = crypto.randomUUID();
        connectedClients.set(ws, { connectionId, username });

        ws.send(JSON.stringify({ type: "connected", connectionId }));

        (ws as any).isAlive = true;
        ws.on("pong", () => {
          (ws as any).isAlive = true;
        });
        ws.on("close", () => {
          connectedClients.delete(ws);
        });
      });

      const heartbeat = setInterval(() => {
        wss.clients.forEach((ws) => {
          if (!(ws as any).isAlive) {
            connectedClients.delete(ws);
            ws.terminate();
            return;
          }
          (ws as any).isAlive = false;
          ws.ping();
        });
      }, 30000);

      setInterval(() => {
        connectedClients.forEach((_, ws) => {
          if (ws.readyState >= 2) connectedClients.delete(ws);
        });
      }, 60000);

      wss.on("close", () => clearInterval(heartbeat));

      globalThis.__jottyBroadcast = (event) => {
        const payload = JSON.stringify(event);
        wss.clients.forEach((client) => {
          if (client.readyState === 1) {
            client.send(payload);
          }
        });
      };

      console.log(`> WebSocket dev server running on ws://0.0.0.0:${WS_PORT}`);
    }
  }
}

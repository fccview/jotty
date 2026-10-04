export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const isDev = process.env.NODE_ENV !== "production";

    if (isDev) {
      const { WebSocketServer } = await import("ws");
      const http = await import("http");
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

      const wss = new WebSocketServer({ noServer: true });
      const devServer = http.createServer();
      devServer.on("upgrade", (req, socket, head) => {
        if (!req.url?.startsWith("/_live/")) {
          wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
          return;
        }
        const sessionId = parseCookies(req.headers.cookie)["session"];
        const username = sessionId ? readSessions()[sessionId] : null;
        if (!username || !globalThis.__jottyLiveUpgrade) {
          socket.destroy();
          return;
        }
        globalThis.__jottyLiveUpgrade(req, socket, head, username, sessionId);
      });
      devServer.listen(WS_PORT, "0.0.0.0");

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

      globalThis.__jottyHasConnectedClients = () => connectedClients.size > 0;

      console.log(`> WebSocket dev server running on ws://0.0.0.0:${WS_PORT}`);
    }

    import("./app/_server/actions/live/room")
      .then(({ liveUpgrade, liveRecheck }) => {
        globalThis.__jottyLiveUpgrade = liveUpgrade;
        globalThis.__jottyLiveRecheck = liveRecheck;
      })
      .catch((err) => console.error("[live] runtime failed to start:", err));

    if (!(globalThis as any).__jottyRelationsStarted) {
      (globalThis as any).__jottyRelationsStarted = true;
      import("./app/_server/actions/relations/indexer")
        .then(({ reconcileRelations }) => reconcileRelations())
        .then(() => import("./app/_server/actions/relations/watcher"))
        .then(({ watchRelations }) => watchRelations())
        .catch((err) => console.error("[relations] startup reconcile failed:", err));
    }

    if ((globalThis as any).__jottyReminderScanStarted) return;
    (globalThis as any).__jottyReminderScanStarted = true;

    const REMINDER_SCAN_INTERVAL = 60_000;
    setInterval(async () => {
      if (!globalThis.__jottyHasConnectedClients?.()) return;
      try {
        const { scanReminders } = await import(
          "./app/_server/actions/reminders/scanner"
        );
        await scanReminders();
      } catch (err) {
        console.error("[reminders] scan failed:", err);
      }
    }, REMINDER_SCAN_INTERVAL);
  }
}

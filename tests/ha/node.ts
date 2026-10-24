import http from "node:http";

const start = async () => {
  process.chdir(process.env.JOTTY_DATA_ROOT || process.cwd());

  const { liveUpgrade } = await import("@/app/_server/actions/live/room");
  const { readSessions } = await import("@/app/_server/actions/session/store");

  const server = http.createServer((_req, res) => {
    res.writeHead(404);
    res.end();
  });

  server.on("upgrade", async (req, socket, head) => {
    const sessionId = req.headers.cookie?.match(/session=([^;]+)/)?.[1];
    const actor = sessionId ? (await readSessions())[sessionId] : null;
    if (!sessionId || !actor) return socket.destroy();
    liveUpgrade(req, socket, head, actor, sessionId);
  });

  server.listen(Number(process.env.JOTTY_PORT), "127.0.0.1", () => {
    process.send?.({ ready: true });
  });
};

void start();

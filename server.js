const path = require("path");
const { createServer } = require("http");
const { parse } = require("url");
const fs = require("fs");
const { WebSocketServer } = require("ws");
const crypto = require("crypto");

const dir = path.join(__dirname);
const nextDir = path.join(dir, ".next");

process.env.NODE_ENV = "production";
process.chdir(dir);

const currentPort = parseInt(process.env.PORT, 10) || 3000;
const hostname = process.env.HOSTNAME || "0.0.0.0";

let keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT, 10);
if (
  Number.isNaN(keepAliveTimeout) ||
  !Number.isFinite(keepAliveTimeout) ||
  keepAliveTimeout < 0
) {
  keepAliveTimeout = undefined;
}

const sessionsFilePath = path.join(dir, "data", "users", "sessions.json");

function readSessions() {
  try {
    const content = fs.readFileSync(sessionsFilePath, "utf-8");
    return JSON.parse(content) || {};
  } catch {
    return {};
  }
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx < 0) return;
    const key = pair.substring(0, idx).trim();
    const val = pair.substring(idx + 1).trim();
    cookies[key] = val;
  });
  return cookies;
}

function authenticateWs(req) {
  const cookies = parseCookies(req.headers.cookie);
  const isHttps = process.env.HTTPS === "true";
  const sessionId = isHttps
    ? cookies["__Host-session"]
    : cookies["session"];

  if (!sessionId) return null;

  const sessions = readSessions();
  const username = sessions[sessionId];
  return username || null;
}

const connectedClients = new Map();

const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws, req) => {
  const connectionId = crypto.randomUUID();
  const username = req._wsUsername;

  connectedClients.set(ws, { connectionId, username });
  ws.send(JSON.stringify({ type: "connected", connectionId }));

  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("close", () => {
    connectedClients.delete(ws);
  });
});

const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      connectedClients.delete(ws);
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

setInterval(() => {
  for (const [ws] of connectedClients) {
    if (ws.readyState >= 2) connectedClients.delete(ws);
  }
}, 60000);

wss.on("close", () => {
  clearInterval(heartbeat);
});

globalThis.__jottyBroadcast = (event) => {
  const payload = JSON.stringify(event);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
};

const nextConfigStr = fs.readFileSync(
  path.join(nextDir, "required-server-files.json"),
  "utf-8"
);
const { config: nextConfig } = JSON.parse(nextConfigStr);

process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig);

const next = require("next");
const app = next({ dev: false, dir, hostname, port: currentPort, conf: nextConfig });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    await handle(req, res, parsedUrl);
  });

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = parse(req.url);
    if (pathname === "/_ws") {
      const username = authenticateWs(req);
      if (!username) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      req._wsUsername = username;
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  if (keepAliveTimeout) {
    server.keepAliveTimeout = keepAliveTimeout;
  }

  server.listen(currentPort, hostname, () => {
    console.log(`> Ready on http://${hostname}:${currentPort}`);
  });
});

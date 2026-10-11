import { fork, type ChildProcess } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as Y from "yjs";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from "y-protocols/awareness";
import { WebSocket } from "ws";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENTRY = path.join(REPO, "tests", "ha", "node.ts");
const FIELD = "default";
export const SEED_LINE = "seed";

export interface NodeHandle {
  port: number;
  child: ChildProcess;
  kill: () => Promise<void>;
}

export interface Fixture {
  root: string;
  uuid: string;
  sessions: Record<string, string>;
  replicaDir: () => Promise<string[]>;
  hasReplicaRoot: () => Promise<boolean>;
}

const sessionOf = (user: string) => `s-${user}-${Date.now().toString(36)}`;

const frontmatter = [
  "---",
  `createdAt: '2026-01-01T00:00:00.000Z'`,
  "sharedWith: alice:rw",
  `uuid: PLACEHOLDER`,
  "title: Shared collab test",
  "---",
  "# Shared collab test",
  "",
  "seed",
].join("\n");

export const makeFixture = async (uuid: string): Promise<Fixture> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "jotty-ha-"));
  const bob = sessionOf("bob");
  const alice = sessionOf("alice");

  await fs.mkdir(path.join(root, "data", "users"), { recursive: true });
  await fs.mkdir(path.join(root, "data", "notes", "bob", "General"), { recursive: true });

  await fs.writeFile(
    path.join(root, "data", "users", "users.json"),
    JSON.stringify([
      { username: "bob", passwordHash: "x", isAdmin: false, isSuperAdmin: false },
      { username: "alice", passwordHash: "x", isAdmin: false, isSuperAdmin: false },
    ]),
  );
  await fs.writeFile(
    path.join(root, "data", "users", "sessions.json"),
    JSON.stringify({ [bob]: "bob", [alice]: "alice" }),
  );

  const notePath = path.join(root, "data", "notes", "bob", "General", "Shared collab test.md");
  await fs.writeFile(notePath, frontmatter.replace("PLACEHOLDER", uuid));

  return {
    root,
    uuid,
    sessions: { bob, alice },
    replicaDir: async () => {
      try {
        return (await fs.readdir(path.join(root, "data", ".replica", uuid))).sort();
      } catch {
        return [];
      }
    },
    hasReplicaRoot: async () => {
      try {
        await fs.stat(path.join(root, "data", ".replica"));
        return true;
      } catch {
        return false;
      }
    },
  };
};

let nextPort = 4100;

export const startNode = async (
  fixture: Fixture,
  name: string,
  { cluster = true }: { cluster?: boolean } = {},
): Promise<NodeHandle> => {
  const port = nextPort++;
  const child = fork(ENTRY, [], {
    cwd: REPO,
    execArgv: ["--import", "tsx", "--no-warnings"],
    env: {
      ...process.env,
      JOTTY_DATA_ROOT: fixture.root,
      JOTTY_PORT: String(port),
      JOTTY_NODE: cluster ? name : "",
      NODE_ENV: "test",
    },
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });

  const logs: string[] = [];
  child.stdout?.on("data", (chunk) => logs.push(String(chunk)));
  child.stderr?.on("data", (chunk) => logs.push(String(chunk)));

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`node ${name} never came up:\n${logs.join("")}`)),
      30000,
    );
    child.on("message", (message: { ready?: boolean }) => {
      if (message?.ready) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`node ${name} exited with ${code}:\n${logs.join("")}`));
    });
  });

  const handle: NodeHandle = {
    port,
    child,
    kill: () =>
      new Promise<void>((resolve) => {
        if (child.exitCode !== null || child.signalCode !== null) return resolve();
        child.once("exit", () => resolve());
        child.kill("SIGKILL");
      }),
  };
  return handle;
};

export interface Client {
  lines: () => string[];
  insert: (value: string) => void;
  peers: () => string[];
  close: () => Promise<void>;
}

const OPEN = 5000;

export const connect = (
  node: NodeHandle,
  sessionId: string,
  uuid: string,
  { doc = new Y.Doc(), seed = true }: { doc?: Y.Doc; seed?: boolean } = {},
): Promise<Client> => {
  const awareness = new Awareness(doc);
  awareness.setLocalState({});
  const fragment = doc.getXmlFragment(FIELD);
  const addLine = (value: string) => {
    const block = new Y.XmlElement("paragraph");
    const text = new Y.XmlText();
    text.insert(0, value);
    block.insert(0, [text]);
    fragment.insert(fragment.length, [block]);
  };
  const socket = new WebSocket(`ws://127.0.0.1:${node.port}/_live/${uuid}`, {
    headers: { Cookie: `session=${sessionId}` },
  });

  const send = (type: string, bytes: Uint8Array) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({ type, data: Buffer.from(bytes).toString("base64") }),
      );
    }
  };

  doc.on("update", (update: Uint8Array, origin: unknown) => {
    if (origin !== "remote") send("update", update);
  });

  return new Promise<Client>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("client never received ready")), OPEN);
    let joined = false;
    socket.on("message", (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.type === "ready") {
        clearTimeout(timer);
        Y.applyUpdate(doc, Buffer.from(message.snapshot, "base64"), "remote");
        send("update", Y.encodeStateAsUpdate(doc));
        send("awareness", encodeAwarenessUpdate(awareness, [doc.clientID]));
        if (message.initialize && seed && fragment.length === 0) addLine(SEED_LINE);
        if (joined) return;
        joined = true;
        resolve({
          lines: () => readLines(fragment),
          insert: addLine,
          peers: () =>
            Array.from(awareness.getStates().values())
              .map((state) => (state as { user?: { name?: string } }).user?.name)
              .filter(Boolean) as string[],
          close: () =>
            new Promise<void>((done) => {
              if (socket.readyState !== WebSocket.OPEN) return done();
              socket.once("close", () => done());
              socket.once("error", () => done());
              socket.close();
            }),
        });
      }
      if (message.type === "update") {
        Y.applyUpdate(doc, Buffer.from(message.data, "base64"), "remote");
      }
      if (message.type === "awareness") {
        applyAwarenessUpdate(awareness, Buffer.from(message.data, "base64"), "remote");
      }
    });
    socket.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
};

const readLines = (fragment: Y.XmlFragment) => {
  const lines: string[] = [];
  const walk = (node: Y.XmlElement | Y.XmlText | Y.XmlFragment) => {
    if (node instanceof Y.XmlText) {
      const value = node.toString();
      if (value) lines.push(value);
      return;
    }
    if (node instanceof Y.XmlElement || node instanceof Y.XmlFragment) node.forEach(walk);
  };
  fragment.forEach(walk);
  return lines;
};

export const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
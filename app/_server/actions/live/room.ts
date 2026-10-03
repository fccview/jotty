import path from "node:path";
import fs from "node:fs/promises";
import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import { DATA_DIR } from "@/app/_consts/files";
import { isUuid } from "@/app/_consts/identity";
import { Modes, PermissionTypes } from "@/app/_types/enums";
import { LiveType, type LiveMessage } from "@/app/_types/live";
import { grepFindFileByUuid } from "@/app/_utils/grep-utils";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";
import { isEncrypted } from "@/app/_utils/encryption-utils";
import { readSessions } from "@/app/_server/actions/session/store";
import { canReachFile } from "@/app/_server/actions/share/access";
import { lockOf } from "@/app/_server/actions/lib/unstamped";
import { isPathUuid } from "@/app/_server/actions/lib/read-only";
import { runQueued } from "@/app/_server/actions/lib/concurrency";

const HEARTBEAT_MS = 30000;
const RECHECK_MS = 5000;
const FIELD = "default";
const CLOSE_REFUSED = 1008;
const CLOSE_INTERNAL = 1011;

class LiveRefusal extends Error {}

interface Client {
  actor: string;
  sessionId: string;
  alive: boolean;
  checked: number;
  clientId?: number;
}

interface Room {
  doc: Y.Doc;
  awareness: Awareness;
  markdown: string;
  filePath: string;
  clients: Map<WebSocket, Client>;
  initializer?: WebSocket;
}

type AwarenessChange = { added: number[]; updated: number[]; removed: number[] };

const rooms = new Map<string, Room>();
const wss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 * 1024 });

const COLOURS = ["#2563eb", "#be185d", "#047857", "#b45309", "#7c3aed"];

const liveColour = (username: string) =>
  COLOURS[Array.from(username).reduce((total, char) => total + char.charCodeAt(0), 0) % COLOURS.length];

const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

const send = (socket: WebSocket, message: LiveMessage) => {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
};

const relay = (room: Room, message: LiveMessage, origin?: unknown) => {
  room.clients.forEach((_, socket) => {
    if (socket !== origin) send(socket, message);
  });
};

const awarenessMessage = (room: Room, ids: number[]): LiveMessage => ({
  type: LiveType.Awareness,
  data: toBase64(encodeAwarenessUpdate(room.awareness, ids)),
});

const readyMessage = (room: Room, initialize: boolean): LiveMessage => ({
  type: LiveType.Ready,
  snapshot: toBase64(Y.encodeStateAsUpdate(room.doc)),
  initialize,
  markdown: room.markdown,
});

const readPlain = async (filePath: string) => {
  const { metadata, contentWithoutMetadata } = extractYamlMetadata(
    await fs.readFile(filePath, "utf8"),
  );
  if (metadata.encrypted || isEncrypted(contentWithoutMetadata)) {
    throw new LiveRefusal("Encrypted notes cannot be shared documents");
  }
  return contentWithoutMetadata;
};

const assertCanEdit = async (uuid: string, filePath: string, actor: string, sessionId: string) => {
  if ((await readSessions())[sessionId] !== actor) throw new LiveRefusal("Session ended");
  if (isPathUuid(uuid) && (await lockOf(filePath))) throw new LiveRefusal("Item is locked");
  if (!(await canReachFile(Modes.NOTES, filePath, actor, PermissionTypes.EDIT))) {
    throw new LiveRefusal("Edit permission revoked");
  }
  await readPlain(filePath);
};

const closeSocket = (socket: WebSocket, error: unknown) =>
  socket.close(error instanceof LiveRefusal ? CLOSE_REFUSED : CLOSE_INTERNAL);

const openRoom = async (uuid: string, filePath: string): Promise<Room> => {
  const existing = rooms.get(uuid);
  if (existing) return existing;
  const contentWithoutMetadata = await readPlain(filePath);
  const doc = new Y.Doc();
  const awareness = new Awareness(doc);
  awareness.setLocalState(null);
  const room: Room = {
    doc,
    awareness,
    markdown: contentWithoutMetadata,
    filePath,
    clients: new Map(),
  };
  doc.on("update", (update: Uint8Array, origin: unknown) => {
    relay(room, { type: LiveType.Update, data: toBase64(update) }, origin);
  });
  awareness.on("update", (change: AwarenessChange, origin: unknown) => {
    const ids = [...change.added, ...change.updated, ...change.removed];
    relay(room, awarenessMessage(room, ids), origin);
  });
  rooms.set(uuid, room);
  return room;
};

const cursorUpdate = (room: Room, socket: WebSocket, client: Client, data: string) => {
  const decoder = decoding.createDecoder(Buffer.from(data, "base64"));
  if (decoding.readVarUint(decoder) !== 1) throw new LiveRefusal("Invalid awareness update");
  const id = decoding.readVarUint(decoder);
  const clock = decoding.readVarUint(decoder);
  const state = JSON.parse(decoding.readVarString(decoder)) as Record<string, unknown> | null;
  if (client.clientId !== undefined && client.clientId !== id) {
    throw new LiveRefusal("Awareness identity changed");
  }
  room.clients.forEach((other, peer) => {
    if (peer !== socket && other.clientId === id) throw new LiveRefusal("Awareness identity in use");
  });
  client.clientId = id;
  if (state) state.user = { name: client.actor, color: liveColour(client.actor) };
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, 1);
  encoding.writeVarUint(encoder, id);
  encoding.writeVarUint(encoder, clock);
  encoding.writeVarString(encoder, JSON.stringify(state));
  applyAwarenessUpdate(room.awareness, encoding.toUint8Array(encoder), socket);
};

const attach = (socket: WebSocket, room: Room, uuid: string, actor: string, sessionId: string) => {
  const client: Client = { actor, sessionId, alive: true, checked: Date.now() };
  room.clients.set(socket, client);
  const initialize = room.doc.getXmlFragment(FIELD).length === 0 && !room.initializer;
  if (initialize) room.initializer = socket;
  send(socket, readyMessage(room, initialize));
  send(socket, awarenessMessage(room, Array.from(room.awareness.getStates().keys())));
  socket.on("pong", () => { client.alive = true; });
  socket.on("message", (bytes: Buffer) => {
    void runQueued(`live-message:${uuid}`, async () => {
      if (!room.clients.has(socket)) return;
      if (Date.now() - client.checked > RECHECK_MS) {
        await assertCanEdit(uuid, room.filePath, actor, client.sessionId);
        client.checked = Date.now();
      }
      const message = JSON.parse(bytes.toString()) as LiveMessage;
      if (!("data" in message) || typeof message.data !== "string") {
        throw new LiveRefusal("Invalid collaboration message");
      }
      if (message.type === LiveType.Update) {
        Y.applyUpdate(room.doc, Buffer.from(message.data, "base64"), socket);
      } else if (message.type === LiveType.Awareness) {
        cursorUpdate(room, socket, client, message.data);
      } else {
        throw new LiveRefusal("Unknown collaboration message");
      }
    }).catch((error) => {
      console.error("[live] closing socket:", error);
      closeSocket(socket, error);
    });
  });
  socket.on("error", (error) => {
    console.error("[live] socket failed:", error);
    socket.close();
  });
  socket.on("close", () => {
    room.clients.delete(socket);
    if (client.clientId !== undefined) {
      removeAwarenessStates(room.awareness, [client.clientId], socket);
    }
    if (room.initializer === socket) {
      room.initializer = undefined;
      const next = room.clients.keys().next().value;
      if (next && room.doc.getXmlFragment(FIELD).length === 0) {
        room.initializer = next;
        send(next, readyMessage(room, true));
      }
    }
    if (!room.clients.size && rooms.get(uuid) === room) {
      rooms.delete(uuid);
      room.awareness.destroy();
      room.doc.destroy();
    }
  });
};

export const liveUpgrade = (
  req: import("node:http").IncomingMessage,
  socket: import("node:net").Socket,
  head: Buffer,
  actor: string,
  sessionId: string,
) => {
  let uuid: string;
  try {
    uuid = new URL(req.url || "/", "http://jotty").pathname.split("/")[2];
    if (!isUuid(uuid) || (req.headers.origin &&
      new URL(req.headers.origin).host !== req.headers.host)) {
      socket.destroy();
      return;
    }
  } catch (error) {
    console.error("[live] invalid upgrade URL:", error);
    socket.destroy();
    return;
  }
  void runQueued(`live-open:${uuid}`, async () => {
    const filePath =
      rooms.get(uuid)?.filePath ??
      (await grepFindFileByUuid(path.join(process.cwd(), DATA_DIR, Modes.NOTES), uuid))?.filePath;
    try {
      if (!filePath) throw new LiveRefusal("Note not found");
      await assertCanEdit(uuid, filePath, actor, sessionId);
      const room = await openRoom(uuid, filePath);
      wss.handleUpgrade(req, socket, head, (ready) => attach(ready, room, uuid, actor, sessionId));
    } catch (error) {
      if (!(error instanceof LiveRefusal)) throw error;
      wss.handleUpgrade(req, socket, head, (ready) => ready.close(CLOSE_REFUSED));
    }
  }).catch((error) => {
    console.error("[live] upgrade failed:", error);
    socket.destroy();
  });
};

export const liveRecheck = () =>
  Promise.all(
    Array.from(rooms.entries()).flatMap(([uuid, room]) =>
      Array.from(room.clients.entries()).map(async ([socket, client]) => {
        try {
          await assertCanEdit(uuid, room.filePath, client.actor, client.sessionId);
          client.checked = Date.now();
        } catch (error) {
          console.error("[live] evicting client:", error);
          closeSocket(socket, error);
        }
      }),
    ),
  );

setInterval(() => {
  void liveRecheck();
  rooms.forEach((room) => room.clients.forEach((client, socket) => {
    if (!client.alive) socket.terminate();
    else {
      client.alive = false;
      socket.ping();
    }
  }));
}, HEARTBEAT_MS).unref();

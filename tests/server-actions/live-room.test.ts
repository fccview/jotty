import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { AddressInfo, Socket } from "node:net";
import { WebSocket } from "ws";
import { LiveRefusals, LiveType } from "@/app/_types/live";

const UUID = "8b3e4d6a-ac5f-4e70-9b32-4d5e6f708192";
const PATH_UUID = "8b3e4d6a-ac5f-5e70-9b32-4d5e6f708192";
const OWNER = "alice";
const SESSION = "session-one";

const mockCanReach = vi.fn();
const mockSessions = vi.fn();
const mockLock = vi.fn();
const mockFind = vi.fn();

vi.mock("fs/promises", () => vi.importActual("fs/promises"));
vi.mock("node:fs/promises", () => vi.importActual("node:fs/promises"));
vi.mock("@/app/_server/actions/share/access", () => ({ canReachFile: (...args: unknown[]) => mockCanReach(...args) }));
vi.mock("@/app/_server/actions/session/store", () => ({ readSessions: () => mockSessions() }));
vi.mock("@/app/_server/actions/lib/unstamped", () => ({ lockOf: (...args: unknown[]) => mockLock(...args) }));
vi.mock("@/app/_utils/grep-utils", () => ({ grepFindFileByUuid: (...args: unknown[]) => mockFind(...args) }));

type Room = typeof import("@/app/_server/actions/live/room");

const plainNote = `---\nuuid: ${UUID}\n---\nhello`;
const secretNote = `---\nuuid: ${UUID}\nencrypted: true\n---\nsecret`;

describe("live room", () => {
  let room: Room;
  let server: http.Server;
  let dir: string;
  let notePath: string;
  let sockets: WebSocket[];

  const connect = (id = UUID) =>
    new Promise<{ socket: WebSocket; ready?: Record<string, unknown>; status?: number; closed: Promise<{ code: number; reason: string }> }>(
      (resolve) => {
        const socket = new WebSocket(`ws://127.0.0.1:${(server.address() as AddressInfo).port}/_live/${id}`);
        sockets.push(socket);
        const closed = new Promise<{ code: number; reason: string }>((done) =>
          socket.on("close", (code, reason) => done({ code, reason: reason.toString() })),
        );
        socket.on("message", (data) => resolve({ socket, ready: JSON.parse(data.toString()), closed }));
        socket.on("unexpected-response", (_, res) => resolve({ socket, status: res.statusCode, closed }));
        socket.on("error", () => {});
      },
    );

  beforeEach(async () => {
    vi.resetModules();
    sockets = [];
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "jotty-live-"));
    notePath = path.join(dir, "note.md");
    fs.writeFileSync(notePath, plainNote);
    mockCanReach.mockReset().mockResolvedValue(true);
    mockSessions.mockReset().mockResolvedValue({ [SESSION]: OWNER });
    mockLock.mockReset().mockResolvedValue(null);
    mockFind.mockReset().mockResolvedValue({ filePath: notePath });
    room = await import("@/app/_server/actions/live/room");
    server = http.createServer();
    server.on("upgrade", (req, socket, head) => room.liveUpgrade(req, socket as Socket, head, OWNER, SESSION));
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  });

  afterEach(async () => {
    sockets.forEach((socket) => socket.terminate());
    await new Promise((done) => server.close(done));
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("admits an editor and sends a room generation", async () => {
    const { ready } = await connect();
    expect(ready?.type).toBe(LiveType.Ready);
    expect(typeof ready?.generation).toBe("string");
  });

  it("refuses someone without edit access", async () => {
    mockCanReach.mockResolvedValue(false);
    expect((await connect()).status).toBe(403);
  });

  it("refuses an encrypted note", async () => {
    fs.writeFileSync(notePath, secretNote);
    expect((await connect()).status).toBe(403);
  });

  it("refuses a join when the note became encrypted under a live room", async () => {
    await connect();
    fs.writeFileSync(notePath, secretNote);
    expect((await connect()).status).toBe(403);
  });

  it("evicts a passive client when edit access is revoked", async () => {
    const { closed } = await connect();
    mockCanReach.mockResolvedValue(false);
    await room.liveRecheck();
    expect(await closed).toEqual({ code: 1008, reason: LiveRefusals.Refused });
  });

  it("keeps a client whose access still holds", async () => {
    const { socket } = await connect();
    await room.liveRecheck();
    expect(socket.readyState).toBe(WebSocket.OPEN);
  });

  it("evicts every client when the note becomes encrypted", async () => {
    const first = await connect();
    const second = await connect();
    fs.writeFileSync(notePath, secretNote);
    await room.liveRecheck();
    expect(await first.closed).toEqual({ code: 1008, reason: LiveRefusals.Encrypted });
    expect(await second.closed).toEqual({ code: 1008, reason: LiveRefusals.Encrypted });
  });

  it("evicts a client whose session ended", async () => {
    const { closed } = await connect();
    mockSessions.mockResolvedValue({});
    await room.liveRecheck();
    expect((await closed).code).toBe(1008);
  });

  it("evicts a client when the note gets locked", async () => {
    mockFind.mockResolvedValue({ filePath: notePath });
    const { closed } = await connect(PATH_UUID);
    mockLock.mockResolvedValue("locked");
    await room.liveRecheck();
    expect(await closed).toEqual({ code: 1008, reason: LiveRefusals.Locked });
  });

  it("closes with 1011, not 1008, when the permission check itself fails", async () => {
    const { closed } = await connect();
    mockCanReach.mockRejectedValue(new Error("disk on fire"));
    await room.liveRecheck();
    expect((await closed).code).toBe(1011);
  });

  it("starts a new generation once the last client leaves", async () => {
    const first = await connect();
    first.socket.close();
    await first.closed;
    const second = await connect();
    expect(second.ready?.generation).not.toBe(first.ready?.generation);
  });

  it("keeps the generation while someone is still in the room", async () => {
    const first = await connect();
    const second = await connect();
    expect(second.ready?.generation).toBe(first.ready?.generation);
  });

  it("evicts a passive client on the heartbeat even when no share event fires", async () => {
    vi.useFakeTimers({ toFake: ["setInterval"] });
    vi.resetModules();
    const ticking: Room = await import("@/app/_server/actions/live/room");
    const beat = http.createServer();
    beat.on("upgrade", (req, socket, head) => ticking.liveUpgrade(req, socket as Socket, head, OWNER, SESSION));
    await new Promise<void>((done) => beat.listen(0, "127.0.0.1", done));
    try {
      const socket = new WebSocket(`ws://127.0.0.1:${(beat.address() as AddressInfo).port}/_live/${UUID}`);
      sockets.push(socket);
      const closed = new Promise<{ code: number; reason: string }>((done) =>
        socket.on("close", (code, reason) => done({ code, reason: reason.toString() })),
      );
      await new Promise((ready) => socket.once("message", ready));
      mockCanReach.mockResolvedValue(false);
      await vi.advanceTimersByTimeAsync(30000);
      expect(await closed).toEqual({ code: 1008, reason: LiveRefusals.Refused });
    } finally {
      vi.useRealTimers();
      await new Promise((done) => beat.close(done));
    }
  });
});

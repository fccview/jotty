import * as Y from "yjs";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  connect,
  makeFixture,
  SEED_LINE,
  settle,
  startNode,
  type Client,
  type Fixture,
  type NodeHandle,
} from "./cluster";

vi.mock("fs/promises", () => vi.importActual("fs/promises"));
vi.mock("node:fs/promises", () => vi.importActual("node:fs/promises"));

const UUID = "3f1c9a40-7b2e-4d55-9a11-6c0e2b7d4a83";
const WAIT = { timeout: 15000, intervals: [100] };

let fixture: Fixture;
let node1: NodeHandle;
let node2: NodeHandle;
const open: Client[] = [];

const join = async (node: NodeHandle, user: string, doc?: Y.Doc) => {
  const client = await connect(node, fixture.sessions[user], UUID, { doc });
  open.push(client);
  return client;
};

const sees = (client: Client, text: string) =>
  expect
    .poll(() => client.lines(), WAIT)
    .toContain(text);

const fresh = async (uuid: string) => {
  const local = await makeFixture(uuid);
  return { local, a: await startNode(local, "node1"), b: await startNode(local, "node2") };
};

beforeAll(async () => {
  fixture = await makeFixture(UUID);
  node1 = await startNode(fixture, "node1");
  node2 = await startNode(fixture, "node2");
}, 60000);

afterAll(async () => {
  await Promise.all(open.map((client) => client.close().catch(() => undefined)));
  await Promise.all([node1, node2].map((node) => node.kill()));
}, 30000);

describe("scenario 1: two users on two nodes", () => {
  it("carries edits both ways and shows each user the other", async () => {
    const bob = await join(node1, "bob");
    const alice = await join(node2, "alice");

    await expect.poll(() => bob.peers(), WAIT).toContain("alice");
    await expect.poll(() => alice.peers(), WAIT).toContain("bob");

    bob.insert("alpha from bob");
    await sees(alice, "alpha from bob");

    alice.insert("bravo from alice");
    await sees(bob, "bravo from alice");

    expect(bob.lines().filter((line) => line === "bravo from alice")).toHaveLength(1);
  });
});

describe("scenario 2: drop a node, nothing is lost", () => {
  it("moves a browser to the survivor with what it typed while offline", async () => {
    const bob = await join(node1, "bob");
    const doc = new Y.Doc();
    const alice = await join(node2, "alice", doc);
    await expect.poll(() => bob.peers(), WAIT).toContain("alice");

    alice.insert("written on node2");
    await sees(bob, "written on node2");

    await node2.kill();
    alice.insert("typed while node2 was dead");
    bob.insert("written after node2 died");

    const moved = await join(node1, "alice", doc);
    await sees(bob, "typed while node2 was dead");
    await sees(moved, "written after node2 died");
    await expect.poll(() => moved.peers(), WAIT).toContain("bob");
  });
});

describe("scenario 3: the node comes back", () => {
  it("picks up everything typed while it was away", async () => {
    const bob = await join(node1, "bob");
    await sees(bob, "written after node2 died");

    node2 = await startNode(fixture, "node2");
    const alice = await join(node2, "alice");

    await sees(alice, "written on node2");
    await sees(alice, "typed while node2 was dead");
    await expect.poll(() => alice.peers(), WAIT).toContain("bob");
    await expect.poll(() => alice.lines(), WAIT).toEqual(bob.lines());
  });
});

describe("who fills an empty note", () => {
  const copies = (lines: string[]) => lines.filter((line) => line === SEED_LINE).length;

  it("fills it once when both nodes are opened at the same moment", async () => {
    const { local, a, b } = await fresh("5b1d7e20-3c4f-4a6b-8d9e-1f2a3b4c5d01");
    try {
      const [bob, alice] = await Promise.all([
        connect(a, local.sessions.bob, local.uuid),
        connect(b, local.sessions.alice, local.uuid),
      ]);
      await sees(bob, SEED_LINE);
      await expect.poll(() => alice.lines(), WAIT).toEqual(bob.lines());
      await settle(1500);
      expect(copies(bob.lines())).toBe(1);
      expect(copies(alice.lines())).toBe(1);
      await Promise.all([bob.close(), alice.close()]);
    } finally {
      await Promise.all([a.kill(), b.kill()]);
    }
  }, 60000);

  it("hands the job to the other node when the one filling it leaves", async () => {
    const { local, a, b } = await fresh("5b1d7e20-3c4f-4a6b-8d9e-1f2a3b4c5d02");
    try {
      const filler = await connect(a, local.sessions.bob, local.uuid, { seed: false });
      const waiter = await connect(b, local.sessions.alice, local.uuid);
      await filler.close();
      await sees(waiter, SEED_LINE);
      expect(copies(waiter.lines())).toBe(1);
      await waiter.close();
    } finally {
      await Promise.all([a.kill(), b.kill()]);
    }
  }, 60000);
});

describe("replica hygiene", () => {
  it("reaps the file left by a killed node and keeps the live one", async () => {
    const { local, a, b } = await fresh("9a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5e");
    const staying = await connect(a, local.sessions.bob, local.uuid);
    await connect(b, local.sessions.alice, local.uuid);
    try {
      await expect
        .poll(() => local.replicaDir(), WAIT)
        .toEqual(["node1.json", "node2.json"]);
      await b.kill();
      await expect
        .poll(() => local.replicaDir(), { timeout: 50000, interval: 500 })
        .toEqual(["node1.json"]);
    } finally {
      await staying.close().catch(() => undefined);
      await a.kill();
    }
  }, 90000);

  it("writes nothing at all when clustering is off", async () => {
    const solo = await makeFixture("9a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d");
    const node = await startNode(solo, "solo", { cluster: false });
    try {
      const client = await connect(node, solo.sessions.bob, solo.uuid);
      client.insert("no replica expected");
      await settle(3000);
      expect(await solo.hasReplicaRoot()).toBe(false);
      await client.close();
    } finally {
      await node.kill();
    }
  }, 30000);
});

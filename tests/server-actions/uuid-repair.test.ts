import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import nodeFs from "fs";
import os from "os";
import path from "path";
import { mockFs, resetAllMocks } from "../setup";
import { RelationsStatus } from "@/app/_consts/relations";
import type { SanitisedUser } from "@/app/_types";

vi.unmock("unified");
vi.unmock("unist-util-visit");

vi.mock("@/app/_server/actions/ws/broadcast", () => ({ broadcast: vi.fn() }));

import { findClashes } from "@/app/_server/actions/uuid-clash/scan";
import { NOT_CLAIMANT, NO_CLASH, repairClash } from "@/app/_server/actions/uuid-clash/repair";
import { closeRelationsDb, setRelationsStatus } from "@/app/_server/actions/relations/store";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";

const DUP = "aaaaaaaa-1111-4222-8333-944455556666";
const LINKER = "bbbbbbbb-1111-4222-8333-944455556666";
const alice = { username: "alice" } as SanitisedUser;

let root: string;

const notePath = (rel: string) => path.join(root, "data", "notes", "alice", rel);

const put = (rel: string, content: string) => {
  nodeFs.mkdirSync(path.dirname(notePath(rel)), { recursive: true });
  nodeFs.writeFileSync(notePath(rel), content);
};

const read = (rel: string) => nodeFs.readFileSync(notePath(rel), "utf-8");

const seed = () => {
  put("Home/digest.md", `---\nuuid: ${DUP}\ntitle: Weekly Digest\ncreatedAt: 2020-01-01T00:00:00.000Z\n---\nThe original.\n`);
  put("Scripts/releases.md", `---\nuuid: ${DUP}\ntitle: Release Feed\n---\nWritten by a script.\n`);
  put(
    "Home/index.md",
    [
      `---\nuuid: ${LINKER}\ntitle: Index\ncreatedAt: 2020-01-01T00:00:00.000Z\n---`,
      `See [Weekly Digest](/note/${DUP}) and [Release Feed](/jotty/${DUP}).`,
      `Also [this one](/note/${DUP}).`,
      "",
    ].join("\n"),
  );
};

describe("duplicate uuid scan and repair", () => {
  beforeEach(async () => {
    resetAllMocks();
    const real = await vi.importActual<typeof import("fs/promises")>("fs/promises");
    mockFs.readFile.mockImplementation(real.readFile as never);
    mockFs.writeFile.mockImplementation(real.writeFile as never);
    mockFs.stat.mockImplementation(real.stat as never);
    mockFs.rename.mockImplementation(real.rename as never);
    mockFs.mkdir.mockImplementation(real.mkdir as never);
    mockFs.unlink.mockImplementation(real.unlink as never);
    root = nodeFs.mkdtempSync(path.join(os.tmpdir(), "jotty-repair-"));
    vi.spyOn(process, "cwd").mockReturnValue(root);
    process.env.JOTTY_RELATIONS_DB = path.join(root, "relations.db");
    closeRelationsDb();
    setRelationsStatus(RelationsStatus.READY);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    seed();
  });

  afterEach(() => {
    closeRelationsDb();
    vi.restoreAllMocks();
    nodeFs.rmSync(root, { recursive: true, force: true });
  });

  it("lists both files, keeper first, and ignores a uuid quoted in a body", async () => {
    put("Home/code.md", `---\nuuid: cccccccc-1111-4222-8333-944455556666\n---\n\`\`\`\nuuid: ${DUP}\n\`\`\`\n`);

    expect(await findClashes("alice")).toEqual([
      {
        uuid: DUP,
        owner: "alice",
        files: [
          expect.objectContaining({ path: "notes/Home/digest.md", title: "Weekly Digest", keeps: true }),
          expect.objectContaining({ path: "notes/Scripts/releases.md", title: "Release Feed", keeps: false }),
        ],
      },
    ]);
  });

  it("re-keys the newer file and moves only the links that name it", async () => {
    const result = await repairClash(alice, "alice", DUP);

    expect(result.success).toBe(true);
    const fresh = result.data!.rekeyed[0].uuid;
    expect(result.data).toMatchObject({
      rekeyed: [{ path: "notes/Scripts/releases.md", title: "Release Feed" }],
      ambiguous: ["notes/Home/index.md"],
    });
    expect(extractYamlMetadata(read("Scripts/releases.md")).metadata.uuid).toBe(fresh);
    expect(extractYamlMetadata(read("Home/digest.md")).metadata.uuid).toBe(DUP);
    expect(read("Home/index.md")).toContain(`[Weekly Digest](/note/${DUP})`);
    expect(read("Home/index.md")).toContain(`[Release Feed](/jotty/${fresh})`);
    expect(read("Home/index.md")).toContain(`[this one](/note/${DUP})`);
    expect(await findClashes("alice")).toEqual([]);
  });

  it("re-keys an explicitly chosen file, even the keeper", async () => {
    const result = await repairClash(alice, "alice", DUP, "notes/Home/digest.md");
    expect(result.data?.rekeyed.map((entry) => entry.path)).toEqual(["notes/Home/digest.md"]);
    expect(extractYamlMetadata(read("Scripts/releases.md")).metadata.uuid).toBe(DUP);
  });

  it("refuses paths that aren't claimants and uuids that aren't duplicated", async () => {
    expect(await repairClash(alice, "alice", DUP, "notes/../../etc/passwd")).toEqual({
      success: false,
      error: NOT_CLAIMANT,
    });
    expect(await repairClash(alice, "alice", LINKER)).toEqual({ success: false, error: NO_CLASH });
  });
});

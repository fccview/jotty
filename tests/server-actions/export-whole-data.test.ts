import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import os from "os";
import path from "path";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { DATA_DIR, EXPORT_TEMP_DIR } from "@/app/_consts/files";
import { buildWholeData } from "@/app/_server/actions/export/builders";

const CENTRAL_ENTRY = 0x02014b50;
const END_RECORD = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
const CENTRAL_START_AT = 16;
const NAME_LENGTH_AT = 28;
const EXTRA_LENGTH_AT = 30;
const COMMENT_LENGTH_AT = 32;
const NAME_AT = 46;

const SANDBOX = mkdtempSync(path.join(os.tmpdir(), "jotty-whole-export-"));
const DATA = path.join(SANDBOX, DATA_DIR);
const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(SANDBOX);
const LIVE_INDEX = path.join("index", "live.sqlite");
const previousRelationsDb = process.env.JOTTY_RELATIONS_DB;

const plant = (relative: string, body = "x") => {
  const file = path.join(DATA, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, body);
};

const zipNames = (zip: Buffer): string[] => {
  const names: string[] = [];
  let offset = zip.readUInt32LE(zip.lastIndexOf(END_RECORD) + CENTRAL_START_AT);
  while (offset + NAME_AT <= zip.length && zip.readUInt32LE(offset) === CENTRAL_ENTRY) {
    const nameLength = zip.readUInt16LE(offset + NAME_LENGTH_AT);
    const extraLength = zip.readUInt16LE(offset + EXTRA_LENGTH_AT);
    const commentLength = zip.readUInt16LE(offset + COMMENT_LENGTH_AT);
    names.push(zip.toString("utf8", offset + NAME_AT, offset + NAME_AT + nameLength));
    offset += NAME_AT + nameLength + extraLength + commentLength;
  }
  return names;
};

let names: string[] = [];

beforeAll(async () => {
  plant("notes/alice/Work/plan.md", "# plan");
  plant("notes/alice/.index.json", "{}");
  plant("notes/alice/Work/.category-info.json", "{}");
  plant("notes/alice/.archive/old.md", "# old");
  plant("notes/alice/.templates/daily.md", "# daily");
  plant("notes/alice/.comments/thread.json", "{}");
  plant("notes/alice/.git/HEAD", "ref: refs/heads/main");
  plant("notes/alice/.git/index.lock");
  plant("notes/alice/Work/.plan.md.0b8f.tmp", "# half");
  plant("notes/.jotty-link-probe-1234");
  plant(".schema-version", "3");
  plant(".attachment-seed.json", "{}");
  plant(".migrations/attachments-v3.jsonl", "{}");
  plant(".relations.db");
  plant(".relations.db-wal");
  plant(".relations.db-shm");
  plant(".relations_node-a.db");
  plant(".relations_node-a.db-wal");
  plant(".locks/history-alice.lock");
  plant("temp_exports/old_export.zip", "zip");
  plant(LIVE_INDEX);
  plant(`${LIVE_INDEX}-wal`);
  process.env.JOTTY_RELATIONS_DB = path.join(DATA, LIVE_INDEX);

  const result = await buildWholeData();
  expect(result.success).toBe(true);

  const zip = readFileSync(path.join(SANDBOX, EXPORT_TEMP_DIR, path.basename(result.downloadUrl!)));
  names = zipNames(zip).map((name) => name.replace(/\/$/, ""));
});

afterAll(() => {
  if (previousRelationsDb === undefined) delete process.env.JOTTY_RELATIONS_DB;
  else process.env.JOTTY_RELATIONS_DB = previousRelationsDb;
  cwdSpy.mockRestore();
  rmSync(SANDBOX, { recursive: true, force: true });
});

describe("whole data folder export", () => {
  it("keeps regular files", () => {
    expect(names).toContain("notes/alice/Work/plan.md");
  });

  it("keeps dotfiles and dot folders that record migration state", () => {
    expect(names).toEqual(
      expect.arrayContaining([
        ".schema-version",
        ".attachment-seed.json",
        ".migrations/attachments-v3.jsonl",
        "notes/alice/.index.json",
        "notes/alice/Work/.category-info.json",
        "notes/alice/.archive/old.md",
        "notes/alice/.templates/daily.md",
        "notes/alice/.comments/thread.json",
        "notes/alice/.git/HEAD",
      ]),
    );
  });

  it("leaves out the derived relations index and its sqlite sidecars, wherever it lives", () => {
    expect(names.filter((name) => name.startsWith(".relations") || name.startsWith("index/"))).toEqual([]);
  });

  it("leaves out half-written files, link probes and git locks", () => {
    expect(names).not.toContain("notes/alice/Work/.plan.md.0b8f.tmp");
    expect(names).not.toContain("notes/.jotty-link-probe-1234");
    expect(names).not.toContain("notes/alice/.git/index.lock");
  });

  it("leaves out transient locks and previous exports", () => {
    expect(names.filter((name) => name.startsWith(".locks") || name.startsWith("temp_exports"))).toEqual([]);
  });
});

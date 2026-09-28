import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import nodeFs from "fs";
import os from "os";
import path from "path";
import { mockFs, resetAllMocks } from "../setup";
import { RelationsStatus } from "@/app/_consts/relations";

const mockBroadcast = vi.fn();

vi.mock("@/app/_server/actions/ws/broadcast", () => ({
  broadcast: (...args: unknown[]) => mockBroadcast(...args),
}));

import { indexItemFile } from "@/app/_server/actions/relations/indexer";
import { closeRelationsDb, relationsDb, setRelationsStatus } from "@/app/_server/actions/relations/store";
import { titleFromFile } from "@/app/_server/actions/lib/file-title";
import { parseNoteContent } from "@/app/_utils/client-parser-utils";

const UUID = "aaaaaaaa-2222-4333-8444-955566667777";
const HEADING = "Planting the Spring Garden";
const CONTENT = `---\nuuid: ${UUID}\n---\n# ${HEADING}\n\nBody text.\n`;

let root: string;

describe("one title per item", () => {
  beforeEach(async () => {
    resetAllMocks();
    const real = await vi.importActual<typeof import("fs/promises")>("fs/promises");
    mockFs.readFile.mockImplementation(real.readFile as never);
    root = nodeFs.mkdtempSync(path.join(os.tmpdir(), "jotty-titles-"));
    vi.spyOn(process, "cwd").mockReturnValue(root);
    process.env.JOTTY_RELATIONS_DB = path.join(root, "relations.db");
    closeRelationsDb();
    setRelationsStatus(RelationsStatus.READY);
  });

  afterEach(() => {
    closeRelationsDb();
    vi.restoreAllMocks();
    nodeFs.rmSync(root, { recursive: true, force: true });
  });

  it("gives the reader, the parser and the relations index the same title", async () => {
    const filePath = path.join(root, "data", "notes", "alice", "Home", "garden-plan.md");
    nodeFs.mkdirSync(path.dirname(filePath), { recursive: true });
    nodeFs.writeFileSync(filePath, CONTENT);

    indexItemFile(filePath, CONTENT, Date.now());
    const indexed = relationsDb().prepare("SELECT title FROM items WHERE uuid = ?").get(UUID) as { title: string };

    expect(await titleFromFile({ uuid: UUID }, filePath, "garden-plan")).toBe(HEADING);
    expect(parseNoteContent(CONTENT, "garden-plan").title).toBe(HEADING);
    expect(indexed.title).toBe(HEADING);
  });

  it("skips the file read when frontmatter already has a title", async () => {
    const missing = path.join(root, "does-not-exist.md");
    expect(await titleFromFile({ title: "Weekly Digest" }, missing, "weekly-digest")).toBe("Weekly Digest");
    expect(mockFs.readFile).not.toHaveBeenCalled();
  });
});

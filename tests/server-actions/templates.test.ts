import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import path from "path";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";

const { home, root, session } = vi.hoisted(() => {
  const os = process.getBuiltinModule("os");
  const fs = process.getBuiltinModule("fs");
  const nodePath = process.getBuiltinModule("path");
  const previous = process.cwd();

  process.chdir(fs.mkdtempSync(nodePath.join(os.tmpdir(), "jotty-templates-")));

  return { home: previous, root: process.cwd(), session: { username: "alice" } };
});

vi.unmock("fs/promises");

vi.mock("@/app/_server/actions/ws/broadcast", () => ({
  broadcast: vi.fn(),
}));

vi.mock("@/app/_server/actions/log", () => ({
  logContentEvent: vi.fn(),
}));

vi.mock("@/app/_server/actions/history/repo", () => ({
  commitNote: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@/app/_server/actions/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_server/actions/users")>()),
  canAccessAllContent: async () => false,
  getCurrentUser: async () => ({
    username: session.username,
    isAdmin: false,
    fileRenameMode: "minimal",
    preferredDateFormat: "dd/mm/yyyy",
    preferredTimeFormat: "24-hours",
  }),
}));

import { createTemplate, getTemplates, saveAsTemplate } from "@/app/_server/actions/template";
import { createCategory } from "@/app/_server/actions/category";
import { makeNote } from "@/app/_server/actions/note/creator";
import { getUserNotes } from "@/app/_server/actions/note/queries";
import { categoriesFor } from "@/app/_server/actions/category/tree";
import { grepSearchContent } from "@/app/_utils/grep-utils";
import { DATA_DIR, TEMPLATES_DIR_NAME } from "@/app/_consts/files";
import { TEMPLATE_ID_FIELD } from "@/app/_consts/templates";
import { Modes } from "@/app/_types/enums";
import { SanitisedUser } from "@/app/_types";

const MEETING = "11111111-1111-4111-8111-111111111111";
const DIARY = "22222222-2222-4222-8222-222222222222";
const BOB_TEMPLATE = "33333333-3333-4333-8333-333333333333";
const ALICE_TEMPLATE = "44444444-4444-4444-8444-444444444444";
const SEALED_TEMPLATE = "55555555-5555-4555-8555-555555555555";

const SEALED_BODY = "-----BEGIN PGP MESSAGE-----\nabc\n-----END PGP MESSAGE-----";

const notesDir = (owner: string, category = ""): string =>
  path.join(root, DATA_DIR, Modes.NOTES, owner, category);

const writeNote = (
  owner: string,
  category: string,
  name: string,
  uuid: string,
  body: string,
  extra: string[] = [],
) => {
  const dir = notesDir(owner, category);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, `${name}.md`),
    ["---", `uuid: ${uuid}`, `title: ${name}`, ...extra, "---", body, ""].join("\n"),
  );
};

const alice: SanitisedUser = {
  username: "alice",
  isAdmin: false,
  fileRenameMode: "minimal",
  preferredDateFormat: "dd/mm/yyyy",
  preferredTimeFormat: "24-hours",
};

const MANAGED = "66666666-6666-4666-8666-666666666666";
const TYPED_TEMPLATE = "77777777-7777-4777-8777-777777777777";

const plainNote = (title: string, category: string) => {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("category", category);
  formData.append("rawContent", "hello");
  return makeNote(alice, formData);
};

const fromTemplate = (title: string, templateId: string, rawContent = "") => {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("category", "Work");
  formData.append("rawContent", rawContent);
  formData.append(TEMPLATE_ID_FIELD, templateId);
  return makeNote(alice, formData);
};

describe("note templates", () => {
  beforeEach(() => {
    session.username = "alice";
    rmSync(path.join(root, DATA_DIR), { recursive: true, force: true });
    writeNote("alice", "Work", "Meeting", MEETING, "# {{title}}\n\nBy {{user}} on {{date}}");
    writeNote("alice", "Personal", "Diary", DIARY, "dear diary", ["encrypted: true"]);
    writeNote("alice", TEMPLATES_DIR_NAME, "Standup", ALICE_TEMPLATE, "## {{ title }}\n- yesterday\n- today, {{user}}");
    writeNote("alice", TEMPLATES_DIR_NAME, "Sealed", SEALED_TEMPLATE, SEALED_BODY, ["encrypted: true"]);
    writeNote("bob", TEMPLATES_DIR_NAME, "Bob only", BOB_TEMPLATE, "bob's secret layout");
    writeNote("alice", "Scripts", "Feed", MANAGED, "rewritten nightly", ["managed: true", "source: rss"]);
    writeNote("alice", TEMPLATES_DIR_NAME, "Meeting kind", TYPED_TEMPLATE, "agenda", ["type: meeting", "managed: true", "sharedWith: [bob:r]"]);
  });

  afterAll(() => {
    process.chdir(home);
    rmSync(root, { recursive: true, force: true });
  });

  it("copies a note into templates and leaves the original where it was", async () => {
    const result = await saveAsTemplate(MEETING);

    expect(result.success).toBe(true);
    expect(result.data?.uuid).not.toBe(MEETING);
    expect(result.data?.title).toBe("Meeting");
    expect(result.data?.category).toBe(TEMPLATES_DIR_NAME);
    expect(existsSync(path.join(notesDir("alice", "Work"), "Meeting.md"))).toBe(true);
  });

  it("refuses to turn an encrypted note into a template", async () => {
    const result = await saveAsTemplate(DIARY);

    expect(result.error).toBe("errors.templateEncrypted");
    expect(readdirSync(notesDir("alice", TEMPLATES_DIR_NAME))).toHaveLength(3);
  });

  it("lists only the session user's templates", async () => {
    const result = await getTemplates();
    const ids = (result.data || []).map((template) => template.uuid);

    expect(ids).toEqual(expect.arrayContaining([ALICE_TEMPLATE, SEALED_TEMPLATE]));
    expect(ids).not.toContain(BOB_TEMPLATE);
    expect(Object.keys(result.data![0]).sort()).toEqual(["encrypted", "title", "updatedAt", "uuid"]);
    expect(result.data?.find((template) => template.uuid === SEALED_TEMPLATE)?.encrypted).toBe(true);
  });

  it("keeps templates out of the note list and the category tree", async () => {
    const notes = await getUserNotes({ username: "alice" });
    const tree = await categoriesFor(Modes.NOTES, "alice");

    expect(notes.data?.map((note) => note.uuid)).not.toContain(ALICE_TEMPLATE);
    expect(tree.data?.map((category) => category.path)).not.toContain(TEMPLATES_DIR_NAME);
  });

  it("keeps templates out of the search grep", async () => {
    const hits = await grepSearchContent(notesDir("alice"), "yesterday");
    expect(hits).toHaveLength(0);
  });

  it("fills title and user and leaves other braces alone", async () => {
    const result = await fromTemplate("Monday sync", ALICE_TEMPLATE);

    expect(result.success).toBe(true);
    expect(result.data?.category).toBe("Work");
    expect(result.data?.content).toContain("## Monday sync");
    expect(result.data?.content).toContain("today, alice");

    const template = readFileSync(path.join(notesDir("alice", TEMPLATES_DIR_NAME), "Standup.md"), "utf-8");
    expect(template).toContain("{{ title }}");
  });

  it("leaves unknown placeholders exactly as written", async () => {
    const saved = await saveAsTemplate(MEETING);
    const result = await fromTemplate("Retro", saved.data!.uuid!);

    expect(result.data?.content).toContain("# Retro");
    expect(result.data?.content).toContain("By alice on {{date}}");
  });

  it("refuses somebody else's template", async () => {
    const result = await fromTemplate("Stolen", BOB_TEMPLATE);

    expect(result.error).toBe("templateNotFound");
    expect(existsSync(path.join(notesDir("alice", "Work"), "Stolen.md"))).toBe(false);
  });

  it("refuses a note that is not a template", async () => {
    const result = await fromTemplate("Not a template", MEETING);
    expect(result.error).toBe("templateNotFound");
  });

  it("refuses an encrypted template", async () => {
    const result = await fromTemplate("Sealed copy", SEALED_TEMPLATE);
    expect(result.error).toBe("templateEncrypted");
  });

  it("refuses a template and content together", async () => {
    const result = await fromTemplate("Both", ALICE_TEMPLATE, "my own text");
    expect(result.error).toBe("templateWithContent");
  });

  it("creates a blank template in the templates folder", async () => {
    const result = await createTemplate("Weekly review");

    expect(result.success).toBe(true);
    expect(result.data?.category).toBe(TEMPLATES_DIR_NAME);
    expect(existsSync(path.join(notesDir("alice", TEMPLATES_DIR_NAME), "Weekly review.md"))).toBe(true);
  });

  it("drops managed when saving a note as a template and keeps other keys", async () => {
    const result = await saveAsTemplate(MANAGED);
    const written = readFileSync(path.join(notesDir("alice", TEMPLATES_DIR_NAME), "Feed.md"), "utf-8");

    expect(result.success).toBe(true);
    expect(written).not.toContain("managed");
    expect(written).toContain("source: rss");
  });

  it("carries a template's own frontmatter into the new note, minus managed and shares", async () => {
    const result = await fromTemplate("Kickoff", TYPED_TEMPLATE);

    expect(result.success).toBe(true);
    expect(result.data?.extraMetadata).toEqual({ type: "meeting" });

    const written = readFileSync(path.join(notesDir("alice", "Work"), "Kickoff.md"), "utf-8");
    expect(written).toContain("type: meeting");
    expect(written).not.toContain("managed");
    expect(written).not.toContain("bob");
  });

  it.each(["Work/.templates", "Work/.archive", "images", "Work/.comments", ".templates/.archive"])(
    "refuses to create a note in the reserved folder %s",
    async (category) => {
      const result = await plainNote("Hidden", category);

      expect(result.error).toBe("categoryReserved");
      expect(existsSync(path.join(notesDir("alice", category), "Hidden.md"))).toBe(false);
    },
  );

  it("still lets a note be created at the top of the templates folder", async () => {
    const result = await plainNote("Direct", TEMPLATES_DIR_NAME);
    expect(result.success).toBe(true);
  });

  it("refuses a category whose name is reserved", async () => {
    const formData = new FormData();
    formData.append("name", ".templates");
    formData.append("parent", "Work");
    formData.append("mode", Modes.NOTES);

    const result = await createCategory(formData);

    expect(result.error).toBe("categoryReserved");
    expect(existsSync(notesDir("alice", "Work/.templates"))).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { mockFs } from "../setup";
import { COLORS_CSS } from "@/app/_server/actions/config/palettes";

const { getListById, findUserRecord, getCurrentUser, isPublicItem, publicLinksFor, getSettings, loadCustomThemes } =
  vi.hoisted(() => ({
    getListById: vi.fn(),
    findUserRecord: vi.fn(),
    getCurrentUser: vi.fn(),
    isPublicItem: vi.fn(),
    publicLinksFor: vi.fn(),
    getSettings: vi.fn(),
    loadCustomThemes: vi.fn(),
  }));

vi.mock("@/app/_server/actions/checklist/queries", () => ({ getListById }));
vi.mock("@/app/_server/actions/users/records", () => ({ findUserRecord }));
vi.mock("@/app/_server/actions/users", () => ({ getCurrentUser }));
vi.mock("@/app/_server/actions/share/queries", () => ({ isPublicItem }));
vi.mock("@/app/_server/actions/relations/public", () => ({ publicLinksFor }));
vi.mock("@/app/_server/actions/config/settings", () => ({ getSettings }));
vi.mock("@/app/_server/actions/config/themes", () => ({ loadCustomThemes }));

import { loadPublicChecklist } from "@/app/_server/actions/checklist/public-view";

const CSS = fs.readFileSync(path.join(process.cwd(), COLORS_CSS), "utf-8");
const LIST_UUID = "7c1c2d3e-1111-4222-8333-944455556666";
const DRACULA_BACKGROUND = "40 42 54";

const ownerRecord = {
  username: "alice",
  passwordHash: "owner_password_hash",
  apiKey: "ck_owner_api_key",
  mfaSecret: "owner_mfa_secret",
  preferredTheme: "dracula",
  preferredLocale: "owner-locale-marker",
  showChecklistEmojis: "disable",
};

const card = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  text: `Card ${id}`,
  completed: false,
  order: 0,
  status: "todo",
  priority: "high",
  createdBy: "creator-marker",
  lastModifiedBy: "modifier-marker",
  assignee: "assignee-marker",
  agent: "agent-marker",
  externalId: "external-marker",
  history: [{ from: "todo", to: "in_progress", changedBy: "history-marker", timestamp: "2026-01-01" }],
  timeEntries: [{ id: "t1", startTime: "2026-01-01", user: "timer-marker" }],
  ...extra,
});

const storedList = {
  id: "board",
  uuid: LIST_UUID,
  title: "Board",
  type: "task",
  category: "Work",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  owner: "alice",
  sharedWith: { "secret-friend-marker": { canRead: true } },
  specNote: "spec-note-marker",
  extraMetadata: { private: "frontmatter-marker" },
  items: [
    card("a", { children: [card("a1")] }),
    card("gone", { text: "archived-card-marker", isArchived: true, archivedBy: "archiver-marker" }),
  ],
};

const LEAKS = [
  "owner_password_hash",
  "ck_owner_api_key",
  "owner_mfa_secret",
  "owner-locale-marker",
  "secret-friend-marker",
  "spec-note-marker",
  "frontmatter-marker",
  "creator-marker",
  "modifier-marker",
  "assignee-marker",
  "agent-marker",
  "external-marker",
  "history-marker",
  "timer-marker",
  "archived-card-marker",
  "archiver-marker",
];

beforeEach(() => {
  vi.clearAllMocks();
  mockFs.readFile.mockResolvedValue(CSS);
  getListById.mockResolvedValue(structuredClone(storedList));
  findUserRecord.mockResolvedValue(structuredClone(ownerRecord));
  getCurrentUser.mockResolvedValue(null);
  isPublicItem.mockResolvedValue(true);
  publicLinksFor.mockResolvedValue({ backlinks: [], links: [] });
  getSettings.mockResolvedValue({ isRwMarkable: false });
  loadCustomThemes.mockResolvedValue({ "custom-themes": {} });
});

describe("Security: public checklist payload", () => {
  it("carries the owner's theme to a logged out visitor", async () => {
    const payload = await loadPublicChecklist(LIST_UUID);

    expect(payload?.theme.variables["--background"]).toBe(DRACULA_BACKGROUND);
  });

  it("hands over nothing else about the owner, the shares or who touched each card", async () => {
    const serialised = JSON.stringify(await loadPublicChecklist(LIST_UUID));

    LEAKS.forEach((leak) => expect(serialised).not.toContain(leak));
  });

  it("keeps the card content a board needs, nested cards included", async () => {
    const payload = await loadPublicChecklist(LIST_UUID);
    const [first] = payload!.checklist.items;

    expect(payload?.checklist.items).toHaveLength(1);
    expect(first).toMatchObject({ id: "a", text: "Card a", status: "todo", priority: "high" });
    expect(first.children?.[0]).toMatchObject({ id: "a1", text: "Card a1" });
    expect(payload?.user).toEqual({ username: "alice" });
    expect(payload?.ownerShowsEmojis).toBe(false);
  });

  it("refuses a list that isn't public to somebody who isn't the owner", async () => {
    isPublicItem.mockResolvedValue(false);
    getCurrentUser.mockResolvedValue({ username: "bob", preferredTheme: "ocean" });

    expect(await loadPublicChecklist(LIST_UUID)).toBeNull();
    expect(findUserRecord).not.toHaveBeenCalled();
  });
});

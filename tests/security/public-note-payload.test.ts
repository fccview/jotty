import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { mockFs } from "../setup";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { COLORS_CSS } from "@/app/_server/actions/config/palettes";
import { OwnerTheme } from "@/app/_components/FeatureComponents/PublicView/Parts/OwnerTheme";

const { getNoteById, findUserRecord, getCurrentUser, isPublicItem, publicLinksFor, getSettings, loadCustomThemes } =
  vi.hoisted(() => ({
    getNoteById: vi.fn(),
    findUserRecord: vi.fn(),
    getCurrentUser: vi.fn(),
    isPublicItem: vi.fn(),
    publicLinksFor: vi.fn(),
    getSettings: vi.fn(),
    loadCustomThemes: vi.fn(),
  }));

vi.mock("@/app/_server/actions/note/queries", () => ({ getNoteById }));
vi.mock("@/app/_server/actions/users/records", () => ({ findUserRecord }));
vi.mock("@/app/_server/actions/users", () => ({ getCurrentUser }));
vi.mock("@/app/_server/actions/share/queries", () => ({ isPublicItem }));
vi.mock("@/app/_server/actions/relations/public", () => ({ publicLinksFor }));
vi.mock("@/app/_server/actions/config/settings", () => ({ getSettings }));
vi.mock("@/app/_server/actions/config/themes", () => ({ loadCustomThemes }));

import { loadPublicNote } from "@/app/_server/actions/note/public-view";

const CSS = fs.readFileSync(path.join(process.cwd(), COLORS_CSS), "utf-8");
const NOTE_UUID = "4b1c2d3e-1111-4222-8333-944455556666";
const OWNER_THEME_ID = "owner-secret-theme-id";
const OWNER_THEME_NAME = "Owner Secret Theme Name";
const OWNER_PRIMARY = "11 22 233";
const OWNER_BACKGROUND = "1 2 3";
const DRACULA_BACKGROUND = "40 42 54";

const ownerRecord = {
  username: "alice",
  avatarUrl: "/api/avatar/alice.png",
  passwordHash: "owner_password_hash",
  apiKey: "ck_owner_api_key",
  mfaSecret: "owner_mfa_secret",
  mfaRecoveryCode: "owner_recovery_code",
  lastLogin: "owner-last-login-marker",
  isAdmin: true,
  isSuperAdmin: true,
  preferredTheme: OWNER_THEME_ID,
  preferredLocale: "owner-locale-marker",
  preferredBorderRadius: 1.37,
  notesDefaultMode: "owner-mode-marker",
  pinnedNotes: ["owner-pin-marker"],
  notesFontSize: 31,
};

const OWNER_LEAKS = [
  "owner_password_hash",
  "ck_owner_api_key",
  "owner_mfa_secret",
  "owner_recovery_code",
  "owner-last-login-marker",
  "owner-locale-marker",
  "owner-mode-marker",
  "owner-pin-marker",
  "1.37",
  OWNER_THEME_ID,
  OWNER_THEME_NAME,
];

const storedNote = {
  id: "plans",
  uuid: NOTE_UUID,
  title: "Plans",
  content: "# Plans\n\nHello",
  category: "Work",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  owner: "alice",
  isShared: false,
  encrypted: false,
  tags: ["owner-tag-marker"],
  sharedWith: { "secret-friend-marker": { canRead: true } },
  extraMetadata: { private: "owner-frontmatter-marker" },
};

const NOTE_LEAKS = ["owner-tag-marker", "secret-friend-marker", "owner-frontmatter-marker"];

const customThemes = {
  "custom-themes": {
    [OWNER_THEME_ID]: {
      name: OWNER_THEME_NAME,
      colors: {
        "--background": OWNER_BACKGROUND,
        "--primary": OWNER_PRIMARY,
      },
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFs.readFile.mockResolvedValue(CSS);
  getNoteById.mockResolvedValue(structuredClone(storedNote));
  findUserRecord.mockResolvedValue(structuredClone(ownerRecord));
  getCurrentUser.mockResolvedValue(null);
  isPublicItem.mockResolvedValue(true);
  publicLinksFor.mockResolvedValue({ backlinks: [], links: [] });
  getSettings.mockResolvedValue({ isRwMarkable: false, borderRadius: 2 });
  loadCustomThemes.mockResolvedValue(customThemes);
});

describe("Security: public note payload", () => {
  it("carries the owner's theme colours to a logged out visitor", async () => {
    const payload = await loadPublicNote(NOTE_UUID);

    expect(payload?.theme.variables["--primary"]).toBe(OWNER_PRIMARY);
    expect(payload?.theme.variables["--background"]).toBe(OWNER_BACKGROUND);
    expect(payload?.theme.darkVariables).toBeNull();
  });

  it("hands over nothing else from the owner's record", async () => {
    const payload = await loadPublicNote(NOTE_UUID);
    const serialised = JSON.stringify(payload);

    expect(Object.keys(payload!).sort()).toEqual(["links", "note", "theme", "user"]);
    expect(Object.keys(payload!.theme).sort()).toEqual(["darkVariables", "variables"]);
    expect(payload?.user).toEqual({ username: "alice", avatarUrl: "/api/avatar/alice.png" });
    OWNER_LEAKS.forEach((leak) => expect(serialised).not.toContain(leak));
  });

  it("drops share grants, tags and extra frontmatter from the note", async () => {
    const payload = await loadPublicNote(NOTE_UUID);
    const serialised = JSON.stringify(payload);

    expect(payload?.note).not.toHaveProperty("sharedWith");
    expect(payload?.note).not.toHaveProperty("tags");
    expect(payload?.note).not.toHaveProperty("extraMetadata");
    NOTE_LEAKS.forEach((leak) => expect(serialised).not.toContain(leak));
  });

  it("uses the owner's theme, never the theme of whoever is looking", async () => {
    getCurrentUser.mockResolvedValue({ username: "bob", preferredTheme: "dracula" });

    const payload = await loadPublicNote(NOTE_UUID);

    expect(payload?.theme.variables["--background"]).toBe(OWNER_BACKGROUND);
    expect(JSON.stringify(payload)).not.toContain(DRACULA_BACKGROUND);
  });

  it("gives a system owner both palettes so the visitor's OS picks", async () => {
    findUserRecord.mockResolvedValue({ ...ownerRecord, preferredTheme: "system" });

    const payload = await loadPublicNote(NOTE_UUID);

    expect(payload?.theme.variables["--background"]).toBe("249 249 249");
    expect(payload?.theme.darkVariables?.["--background"]).toBe("14 24 64");
  });

  it("can't be turned into markup by a theme value from themes.json", () => {
    const html = renderToStaticMarkup(
      createElement(OwnerTheme, {
        theme: { variables: { "--primary": "1 2 3;}</style><script>alert(1)</script>" }, darkVariables: null },
      }),
    );

    expect(html.match(/<\/style>/g)).toHaveLength(1);
    expect(html).not.toContain("<script");
  });

  it("refuses a note that isn't public to somebody who isn't the owner", async () => {
    isPublicItem.mockResolvedValue(false);
    getCurrentUser.mockResolvedValue({ username: "bob" });

    expect(await loadPublicNote(NOTE_UUID)).toBeNull();
    expect(findUserRecord).not.toHaveBeenCalled();
    expect(publicLinksFor).not.toHaveBeenCalled();
  });

  it("refuses a note that isn't public to a logged out visitor", async () => {
    isPublicItem.mockResolvedValue(false);

    expect(await loadPublicNote(NOTE_UUID)).toBeNull();
  });

  it("still lets the owner preview their own note before it goes public", async () => {
    isPublicItem.mockResolvedValue(false);
    getCurrentUser.mockResolvedValue({ username: "alice" });

    expect((await loadPublicNote(NOTE_UUID))?.note.uuid).toBe(NOTE_UUID);
  });
});

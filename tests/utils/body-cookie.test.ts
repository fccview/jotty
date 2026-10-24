import { describe, it, expect, beforeEach } from "vitest";
import { mockCookies } from "../setup";
import { BodyCookie } from "@/app/_consts/browse";
import { ViewMode } from "@/app/_consts/view-modes";
import { bodyNeedOf, isBodyCookie } from "@/app/_utils/browse/body-cookie";
import { accountWantsBodies, firstPageBodies } from "@/app/_server/actions/note/browse";
import { Note, SanitisedUser } from "@/app/_types";

const note = (uuid: string, extra: Partial<Note> = {}): Note => ({
  id: uuid,
  uuid,
  title: uuid,
  content: "",
  excerpt: "",
  createdAt: "",
  updatedAt: `2026-01-0${uuid.length}T00:00:00.000Z`,
  ...extra,
});

describe("bodyNeedOf", () => {
  it("only wants page bodies for cards with previews on", () => {
    expect(bodyNeedOf({ viewMode: ViewMode.CARD, showMarkdownPreview: true, isDesktop: false })).toBe(BodyCookie.ON);
    expect(bodyNeedOf({ viewMode: ViewMode.CARD, showMarkdownPreview: false, isDesktop: true })).toBe(BodyCookie.OFF);
  });

  it("never wants bodies for grid tiles", () => {
    expect(bodyNeedOf({ viewMode: ViewMode.GRID, showMarkdownPreview: true, isDesktop: true })).toBe(BodyCookie.OFF);
  });

  it("wants only the selected body for the desktop list preview, none on phones", () => {
    expect(bodyNeedOf({ viewMode: ViewMode.LIST, showMarkdownPreview: false, isDesktop: true })).toBe(BodyCookie.SELECTED);
    expect(bodyNeedOf({ viewMode: ViewMode.LIST, showMarkdownPreview: true, isDesktop: false })).toBe(BodyCookie.OFF);
  });

  it("recognises every cookie value and nothing else", () => {
    Object.values(BodyCookie).forEach((value) => expect(isBodyCookie(value)).toBe(true));
    expect(isBodyCookie("yes")).toBe(false);
    expect(isBodyCookie(undefined)).toBe(false);
  });
});

describe("server body decision", () => {
  const notes = [note("a"), note("bb"), note("ccc", { encrypted: true }), note("dddd")];
  const user = { username: "alice" } as SanitisedUser;

  beforeEach(() => mockCookies.get.mockReset());

  it("ships the whole first page for card previews", () => {
    expect(firstPageBodies(user, BodyCookie.ON)(notes).sort()).toEqual(["a", "bb", "dddd"]);
  });

  it("ships just the first, preselected note for the list preview", () => {
    expect(firstPageBodies(user, BodyCookie.SELECTED)(notes)).toEqual(["dddd"]);
  });

  it("ships nothing when the first note of the list is sealed", () => {
    const sealedFirst = [note("zzzzz", { encrypted: true }), note("a")];
    expect(firstPageBodies(user, BodyCookie.SELECTED)(sealedFirst)).toEqual([]);
  });

  it("falls back to account settings without a cookie", () => {
    expect(accountWantsBodies({ ...user, browseViewMode: ViewMode.GRID, notesCardPreview: "enable" })).toBe(BodyCookie.OFF);
    expect(accountWantsBodies({ ...user, browseViewMode: ViewMode.CARD, notesCardPreview: "enable" })).toBe(BodyCookie.ON);
    expect(accountWantsBodies({ ...user, browseViewMode: ViewMode.LIST })).toBe(BodyCookie.SELECTED);
    expect(accountWantsBodies(user)).toBe(BodyCookie.OFF);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { RelationsStatus } from "@/app/_consts/relations";
import { ItemTypes } from "@/app/_types/enums";

const { linksEnabled, ensureRelations, publicUuids, linkRows, itemRows } = vi.hoisted(() => ({
  linksEnabled: vi.fn(),
  ensureRelations: vi.fn(),
  publicUuids: vi.fn(),
  linkRows: vi.fn(),
  itemRows: vi.fn(),
}));

vi.mock("@/app/_server/actions/relations/explore", () => ({ linksEnabled }));
vi.mock("@/app/_server/actions/relations/night-shift", () => ({ ensureRelations }));
vi.mock("@/app/_server/actions/relations/freshen", () => ({ freshRelations: vi.fn() }));
vi.mock("@/app/_server/actions/share/queries", () => ({ publicUuids }));
vi.mock("@/app/_server/actions/relations/store", () => ({
  relationsDb: () => ({
    prepare: (sql: string) => ({ all: sql.includes("FROM links") ? linkRows : itemRows }),
  }),
}));

import { publicLinksFor } from "@/app/_server/actions/relations/public";

const TARGET = "aaaaaaaa-1111-4222-8333-944455556666";
const OPEN_NOTE = "bbbbbbbb-1111-4222-8333-944455556666";
const OPEN_LIST = "cccccccc-1111-4222-8333-944455556666";
const HIDDEN_NOTE = "dddddddd-1111-4222-8333-944455556666";
const HIDDEN_LIST = "eeeeeeee-1111-4222-8333-944455556666";
const WRONG_MODE = "ffffffff-1111-4222-8333-944455556666";

const ITEMS = [
  { uuid: OPEN_NOTE, type: ItemTypes.NOTE, title: "Open recipe" },
  { uuid: OPEN_LIST, type: ItemTypes.CHECKLIST, title: "Open shopping" },
  { uuid: HIDDEN_NOTE, type: ItemTypes.NOTE, title: "Hidden diary" },
  { uuid: HIDDEN_LIST, type: ItemTypes.CHECKLIST, title: "Hidden chores" },
  { uuid: WRONG_MODE, type: ItemTypes.CHECKLIST, title: "Hidden clash" },
];

const HIDDEN = [HIDDEN_NOTE, HIDDEN_LIST, WRONG_MODE, "Hidden diary", "Hidden chores", "Hidden clash"];

beforeEach(() => {
  vi.clearAllMocks();
  linksEnabled.mockResolvedValue(true);
  ensureRelations.mockReturnValue(RelationsStatus.READY);
  publicUuids.mockResolvedValue({
    [ItemTypes.NOTE]: new Set([OPEN_NOTE, WRONG_MODE, TARGET]),
    [ItemTypes.CHECKLIST]: new Set([OPEN_LIST]),
  });
  linkRows.mockReturnValue([
    { src: TARGET, dst: OPEN_NOTE },
    { src: TARGET, dst: HIDDEN_NOTE },
    { src: TARGET, dst: WRONG_MODE },
    { src: OPEN_LIST, dst: TARGET },
    { src: HIDDEN_LIST, dst: TARGET },
    { src: TARGET, dst: TARGET },
  ]);
  itemRows.mockImplementation((ids: string) => ITEMS.filter((item) => JSON.parse(ids).includes(item.uuid)));
});

describe("Security: links on public pages", () => {
  it("lists only linked items that are public themselves", async () => {
    const result = await publicLinksFor(TARGET);

    expect(result).toEqual({
      backlinks: [{ uuid: OPEN_LIST, type: ItemTypes.CHECKLIST, title: "Open shopping" }],
      links: [{ uuid: OPEN_NOTE, type: ItemTypes.NOTE, title: "Open recipe" }],
    });
  });

  it("never mentions a private item's uuid or title", async () => {
    const serialised = JSON.stringify(await publicLinksFor(TARGET));

    HIDDEN.forEach((leak) => expect(serialised).not.toContain(leak));
  });

  it("matches public grants by item type, so a uuid clash can't borrow one", async () => {
    const { links } = await publicLinksFor(TARGET);

    expect(links.map((link) => link.uuid)).not.toContain(WRONG_MODE);
  });

  it("returns nothing and reads nothing when links are switched off", async () => {
    linksEnabled.mockResolvedValue(false);

    expect(await publicLinksFor(TARGET)).toEqual({ backlinks: [], links: [] });
    expect(linkRows).not.toHaveBeenCalled();
    expect(publicUuids).not.toHaveBeenCalled();
  });

  it("returns nothing while the index is still building", async () => {
    ensureRelations.mockReturnValue(RelationsStatus.BUILDING);

    expect(await publicLinksFor(TARGET)).toEqual({ backlinks: [], links: [] });
    expect(linkRows).not.toHaveBeenCalled();
  });

  it("fails closed when the share index can't be read", async () => {
    publicUuids.mockRejectedValue(new Error("boom"));

    expect(await publicLinksFor(TARGET)).toEqual({ backlinks: [], links: [] });
  });
});

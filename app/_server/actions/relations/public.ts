import { RelationsStatus } from "@/app/_consts/relations";
import type { PublicLink, PublicLinks } from "@/app/_types/relations";
import { publicUuids } from "@/app/_server/actions/share/queries";
import { ensureRelations } from "./night-shift";
import { freshRelations } from "./freshen";
import { linksEnabled } from "./explore";
import { relationsDb } from "./store";

const NO_LINKS: PublicLinks = { backlinks: [], links: [] };

interface EdgeRow {
  src: string;
  dst: string;
}

const _byTitle = (a: PublicLink, b: PublicLink) => a.title.localeCompare(b.title);

const _itemsOf = (uuids: string[]): Map<string, PublicLink> => {
  if (!uuids.length) return new Map();
  const rows = relationsDb()
    .prepare("SELECT uuid, type, title FROM items WHERE uuid IN (SELECT value FROM json_each(?))")
    .all(JSON.stringify(uuids)) as unknown as PublicLink[];
  return new Map(rows.map((row) => [row.uuid, { uuid: row.uuid, type: row.type, title: row.title }]));
};

export const publicLinksFor = async (uuid: string): Promise<PublicLinks> => {
  try {
    if (!(await linksEnabled())) return NO_LINKS;
    if (ensureRelations() === RelationsStatus.BUILDING) return NO_LINKS;

    const target = uuid.toLowerCase();
    await freshRelations([target]);
    const rows = relationsDb()
      .prepare("SELECT DISTINCT src, dst FROM links WHERE (src = ? OR dst = ?) AND dst IS NOT NULL")
      .all(target, target) as unknown as EdgeRow[];

    const incoming = new Set(rows.filter((row) => row.dst === target).map((row) => row.src));
    const outgoing = new Set(rows.filter((row) => row.src === target).map((row) => row.dst));
    incoming.delete(target);
    outgoing.delete(target);

    const open = await publicUuids();
    const items = _itemsOf(Array.from(new Set(Array.from(incoming).concat(Array.from(outgoing)))));
    const shown = (ids: Set<string>) =>
      Array.from(ids)
        .map((id) => items.get(id))
        .filter((item): item is PublicLink => Boolean(item && open[item.type]?.has(item.uuid)))
        .sort(_byTitle);

    return { backlinks: shown(incoming), links: shown(outgoing) };
  } catch (error) {
    console.error("publicLinksFor failed:", error);
    return NO_LINKS;
  }
};

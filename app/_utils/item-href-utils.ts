import { isUuid } from "@/app/_consts/identity";
import { LEGACY_LINK_PREFIX } from "@/app/_consts/relations";
import { ItemTypes } from "@/app/_types/enums";
import { itemHref } from "@/app/_utils/global-utils";

export interface ItemHrefTarget {
  uuid?: string;
  type?: ItemTypes;
  legacy?: { category: string; id: string };
}

const PREFIXES: Array<[string, ItemTypes | undefined]> = [
  ["/note/", ItemTypes.NOTE],
  ["/checklist/", ItemTypes.CHECKLIST],
  [LEGACY_LINK_PREFIX, undefined],
];

const _localPath = (href: string, origins: string[]): string | null => {
  if (href.startsWith("/")) return href;
  try {
    const url = new URL(href);
    return origins.includes(url.origin) ? url.pathname : null;
  } catch {
    return null;
  }
};

const _decode = (segment: string): string => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

export const parseItemHref = (
  href: string | null | undefined,
  origins: string[] = [],
): ItemHrefTarget | null => {
  if (!href) return null;

  const local = _localPath(href.trim(), origins);
  if (!local) return null;

  const pathOnly = local.split(/[?#]/)[0];
  const match = PREFIXES.find(([prefix]) => pathOnly.startsWith(prefix));
  if (!match) return null;

  const [prefix, type] = match;
  const parts = pathOnly.slice(prefix.length).split("/").filter(Boolean);
  if (parts.length === 0) return null;

  if (parts.length === 1 && isUuid(parts[0])) {
    return { uuid: parts[0].toLowerCase(), type };
  }

  if (!type) return null;

  const id = _decode(parts[parts.length - 1]);
  if (isUuid(id)) return { uuid: id.toLowerCase(), type };

  return {
    type,
    legacy: { category: parts.slice(0, -1).map(_decode).join("/"), id },
  };
};

export const isItemHref = (
  href: string | null | undefined,
  origins: string[] = [],
): boolean => parseItemHref(href, origins) !== null;

const LINK_TEXT_SPECIALS = /([\[\]\\])/g;

export const escapeLinkText = (text: string): string =>
  text.replace(LINK_TEXT_SPECIALS, "\\$1");

const _asType = (type: string | null | undefined): ItemTypes | undefined =>
  type === ItemTypes.NOTE || type === ItemTypes.CHECKLIST ? type : undefined;

export const canonicalItemHref = (
  href: string | null | undefined,
  uuid?: string | null,
  type?: string | null,
): string | null => {
  const target = parseItemHref(href);
  const resolvedUuid = target?.uuid || (uuid && isUuid(uuid) ? uuid : undefined);
  const resolvedType = target?.type || _asType(type);

  if (resolvedUuid && resolvedType) return itemHref(resolvedType, resolvedUuid);

  return href || null;
};

export const currentOrigins = (): string[] =>
  typeof window === "undefined" ? [] : [window.location.origin];

import yaml from "js-yaml";
import { isUuid } from "@/app/_consts/identity";
import { DocumentMetadata, OwnedMetaKeys } from "@/app/_utils/yaml-metadata-utils";
import { tagList } from "@/app/_utils/tag-utils";
import { permsFromCode } from "@/app/_utils/sharing-utils";
import { SharePerms } from "@/app/_types/enums";
import { sharedWithSchema } from "@/app/_schemas/sharing-schemas";
import { PUBLIC_USER, SHARE_CODE_SEPARATOR, SHARED_WITH_NONE } from "@/app/_consts/sharing";

export enum CustomFieldErrors {
  INVALID_YAML = "frontmatterInvalidYaml",
  NOT_A_MAP = "frontmatterNotMap",
  ALIASES = "frontmatterAliases",
  TAGS_NOT_LIST = "frontmatterTagsList",
  UUID_INVALID = "frontmatterUuidInvalid",
  SHARES_FORMAT = "frontmatterSharesFormat",
  SHARE_CODE = "frontmatterShareCode",
  SHARE_PUBLIC = "frontmatterSharePublic",
}

export type ParsedFields =
  | { fields: Record<string, unknown> }
  | { error: CustomFieldErrors };

const TAGS: string = OwnedMetaKeys.TAGS;
const UUID: string = OwnedMetaKeys.UUID;

export const OWNER_ONLY_KEYS: string[] = [OwnedMetaKeys.UUID, OwnedMetaKeys.SHARED_WITH];

const _ownerOnly = (key: string) => OWNER_ONLY_KEYS.includes(key);

const _visible = (metadata: DocumentMetadata, isOwner: boolean) =>
  isOwner ? metadata : Object.fromEntries(Object.entries(metadata).filter(([key]) => !_ownerOnly(key)));

export const frontmatterYaml = (metadata: DocumentMetadata, isOwner: boolean): string => {
  const shown = _visible(metadata, isOwner);
  return Object.keys(shown).length === 0
    ? ""
    : yaml.dump(shown, { indent: 2, lineWidth: -1, noRefs: true });
};

const _isTagValue = (value: unknown) =>
  typeof value === "string" ||
  (Array.isArray(value) && value.every((tag) => typeof tag === "string" || typeof tag === "number"));

const _withTags = (fields: Record<string, unknown>): Record<string, unknown> => {
  if (!(TAGS in fields)) return fields;
  const tags = tagList(fields[TAGS]);
  if (tags.length) return { ...fields, [TAGS]: tags };
  const { [TAGS]: _old, ...rest } = fields;
  return rest;
};

const _isMap = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);

const _sharesNodes = (value: unknown, seen = new WeakSet<object>()): boolean => {
  if (typeof value !== "object" || value === null || value instanceof Date) return false;
  if (seen.has(value)) return true;
  seen.add(value);
  return Object.values(value).some((child) => _sharesNodes(child, seen));
};

export const parseCustom = (text: string, isOwner: boolean): ParsedFields => {
  let parsed: unknown;
  try {
    parsed = yaml.load(text);
  } catch (error) {
    console.warn("Frontmatter is not valid YAML:", error);
    return { error: CustomFieldErrors.INVALID_YAML };
  }

  if (parsed === undefined || parsed === null) parsed = {};
  if (!_isMap(parsed)) return { error: CustomFieldErrors.NOT_A_MAP };
  if (_sharesNodes(parsed)) return { error: CustomFieldErrors.ALIASES };
  if (isOwner && (typeof parsed[UUID] !== "string" || !isUuid(parsed[UUID]))) {
    return { error: CustomFieldErrors.UUID_INVALID };
  }
  if (TAGS in parsed && parsed[TAGS] !== null && !_isTagValue(parsed[TAGS])) {
    return { error: CustomFieldErrors.TAGS_NOT_LIST };
  }

  return { fields: _withTags(parsed) };
};

export const withOwnerKeys = (
  metadata: DocumentMetadata,
  fields: Record<string, unknown>,
  isOwner: boolean,
): Record<string, unknown> => {
  if (isOwner) return fields;
  const onDisk = Object.keys(metadata);
  const order = Object.keys(fields).filter((key) => !_ownerOnly(key));
  onDisk.forEach((key, index) => {
    if (!_ownerOnly(key)) return;
    const anchor = onDisk.slice(index + 1).find((next) => order.includes(next));
    order.splice(anchor ? order.indexOf(anchor) : order.length, 0, key);
  });
  return Object.fromEntries(order.map((key) => [key, _ownerOnly(key) ? metadata[key] : fields[key]]));
};

export type ShareCheck = { users: string[] } | { error: CustomFieldErrors };

export const shareCheck = (value: unknown): ShareCheck => {
  if (value === undefined || value === null) return { users: [] };
  const parsed = sharedWithSchema.safeParse(value);
  if (!parsed.success) return { error: CustomFieldErrors.SHARES_FORMAT };

  const entries = (Array.isArray(parsed.data) ? parsed.data : parsed.data.split(",")).filter((entry) => entry.trim());
  if (entries.length === 1 && entries[0].trim() === SHARED_WITH_NONE) return { users: [] };

  const users: string[] = [];
  for (const entry of entries) {
    const [name, code] = entry.split(SHARE_CODE_SEPARATOR);
    const user = name.trim();
    const perms = permsFromCode(code || SharePerms.READ);
    if (!user || !perms) return { error: CustomFieldErrors.SHARE_CODE };
    if (user === PUBLIC_USER && perms.canEdit) return { error: CustomFieldErrors.SHARE_PUBLIC };
    users.push(user);
  }
  return { users };
};

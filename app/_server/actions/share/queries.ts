import path from "path";
import { cache } from "react";
import { ItemType, SharingPermissions } from "@/app/_types/core";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import {
  AllSharedItems,
  CategoryInfo,
  FolderShares,
  GlobalShares,
  ItemShares,
  ShareListing,
  SharedItemSummary,
  SharingData,
  UserSharedItem,
  UserSharedItems,
} from "@/app/_types/sharing";
import { DATA_DIR } from "@/app/_consts/files";
import {
  CATEGORY_INFO_FILE,
  PUBLIC_USER,
  SHARED_WITH_KEY,
  ShareDirections,
} from "@/app/_consts/sharing";
import { getUsername, canAccessAllContent } from "@/app/_server/actions/users";
import {
  grepFindFileByUuid,
  grepFilesByText,
  grepListAllFiles,
} from "@/app/_utils/grep-utils";
import { getAllFileStats } from "@/app/_server/actions/file";
import { fillFrontmatters } from "@/app/_server/actions/lib/frontmatter-memo";
import { getOrCompute, isFolderInfo } from "@/app/_server/actions/lib/metadata-cache";
import { shareFactsKey } from "./mounts";
import { modeFor } from "@/app/_utils/sharing-utils";
import { isPathUuid } from "@/app/_server/actions/lib/read-only";
import { isLockedItem } from "@/app/_server/actions/lib/unstamped";
import { isPathSafe } from "@/app/_utils/path-utils";
import { canReachFile, catAccess, resolveAccess, sharersOf } from "./access";
import { readCatInfo } from "./category-info";
import { targetDir } from "./target";

const SHARED_MODES = [Modes.NOTES, Modes.CHECKLISTS];

export const modeOf = async (itemType: ItemType): Promise<Modes> =>
  modeFor(itemType);

const _modeDir = (mode: Modes): string =>
  path.join(process.cwd(), DATA_DIR, mode);

const _fileFor = async (mode: Modes, uuid: string): Promise<string | null> => {
  const found = await grepFindFileByUuid(_modeDir(mode), uuid);
  return found ? found.filePath : null;
};

const LOCKED_PERMISSIONS: PermissionTypes[] = [PermissionTypes.EDIT, PermissionTypes.CREATE];

const _locked = async (
  itemType: ItemType,
  uuid: string,
  permission: PermissionTypes,
): Promise<boolean> => {
  if (!LOCKED_PERMISSIONS.includes(permission) || !isPathUuid(uuid)) return false;
  const filePath = await _fileFor(modeFor(itemType), uuid);
  return Boolean(filePath) && (await isLockedItem(uuid, filePath!));
};

export const isLockedUuid = (itemType: ItemType, uuid: string): Promise<boolean> =>
  _locked(itemType, uuid, PermissionTypes.EDIT);

export const canReach = async (
  uuid: string,
  itemType: ItemType,
  username: string,
  permission: PermissionTypes,
): Promise<boolean> => {
  try {
    if (!username) return false;
    if (await _locked(itemType, uuid, permission)) return false;
    if (await canAccessAllContent()) return true;

    const mode = modeFor(itemType);
    const filePath = await _fileFor(mode, uuid);

    if (!filePath) return false;

    return canReachFile(mode, filePath, username, permission);
  } catch (error) {
    console.error("Error in canReach:", error);
    return false;
  }
};

export const reachableFile = async (
  uuid: string,
  itemType: ItemType,
  username: string,
  permission: PermissionTypes,
): Promise<string | null> => {
  try {
    if (!username) return null;

    const mode = modeFor(itemType);
    const filePath = await _fileFor(mode, uuid);

    if (!filePath) return null;
    if (await _locked(itemType, uuid, permission)) return null;
    if (await canAccessAllContent()) return filePath;

    return (await canReachFile(mode, filePath, username, permission))
      ? filePath
      : null;
  } catch (error) {
    console.error("Error in reachableFile:", error);
    return null;
  }
};

export const isPublicItem = async (
  uuid: string,
  itemType: ItemType,
): Promise<boolean> => {
  try {
    const mode = modeFor(itemType);
    const filePath = await _fileFor(mode, uuid);

    if (!filePath) return false;

    const access = await resolveAccess(mode, filePath);
    return access?.isPublic === true;
  } catch (error) {
    console.error("Error in isPublicItem:", error);
    return false;
  }
};

export const usersWithAccess = async (
  uuid: string,
  itemType: ItemType = ItemTypes.CHECKLIST,
): Promise<string[]> => {
  try {
    const mode = modeFor(itemType);
    const filePath = await _fileFor(mode, uuid);

    if (!filePath) return [];

    const access = await resolveAccess(mode, filePath);
    if (!access) return [];

    return Object.keys(access.users).filter((name) => name !== PUBLIC_USER);
  } catch (error) {
    console.error("Error in usersWithAccess:", error);
    return [];
  }
};

export const itemShares = async (
  uuid: string,
  itemType: ItemType,
): Promise<ItemShares> => {
  const empty: ItemShares = {
    users: {},
    isPublic: false,
    inherited: false,
  };

  try {
    const mode = modeFor(itemType);
    const filePath = await _fileFor(mode, uuid);

    if (!filePath) return empty;

    const access = await resolveAccess(mode, filePath);
    if (!access) return empty;

    const users = Object.fromEntries(
      Object.entries(access.users).filter(([name]) => name !== PUBLIC_USER),
    );

    const parent = access.inherited
      ? access
      : await catAccess(mode, path.resolve(path.dirname(filePath)));

    return {
      users,
      isPublic: access.isPublic,
      inherited: access.inherited,
      viaCategory: access.viaCategory,
      sharedParent: parent?.viaCategory,
    };
  } catch (error) {
    console.error("Error in itemShares:", error);
    return empty;
  }
};

export const folderShares = async (
  mode: Modes,
  categoryPath: string,
): Promise<FolderShares> => {
  const empty: FolderShares = { users: {}, isPublic: false, inherit: true };

  try {
    const username = await getUsername();
    if (!username) return empty;

    const target = await targetDir(mode, username, categoryPath);
    const info = await readCatInfo(target.dir);

    const users = Object.fromEntries(
      Object.entries(info.sharing?.users || {}).filter(
        ([name]) => name !== PUBLIC_USER,
      ),
    );

    return {
      users,
      isPublic: Boolean(info.sharing?.users?.[PUBLIC_USER]),
      inherit: info.sharing?.inherit !== false,
      uuid: info.uuid,
    };
  } catch (error) {
    console.error("Error in folderShares:", error);
    return empty;
  }
};

export const sharedFrom = async (
  owner: string,
  viewer: string,
): Promise<boolean> => {
  try {
    const perMode = await Promise.all(
      SHARED_MODES.map((mode) => sharersOf(mode, viewer)),
    );

    return perMode.some((owners) => owners.includes(owner));
  } catch (error) {
    console.error("Error in sharedFrom:", error);
    return false;
  }
};

declare global {
  var __jottyShareShapes: Map<Modes, Map<string, string>> | undefined;
}

const shareShapes: Map<Modes, Map<string, string>> = (globalThis.__jottyShareShapes ??= new Map());

const _shapeOf = (info: CategoryInfo): string =>
  JSON.stringify([
    Object.entries(info.sharing?.users || {}).sort(([a], [b]) => a.localeCompare(b)),
    info.sharing?.inherit !== false,
  ]);

const UNSHARED_SHAPE = _shapeOf({});
const SHARING_NEEDLE = '"sharing"';

const _sharingFolders = async (mode: Modes): Promise<Map<string, CategoryInfo>> => {
  const infoFiles = await grepFilesByText(
    _modeDir(mode),
    SHARING_NEEDLE,
    CATEGORY_INFO_FILE,
  );
  const infos = new Map<string, CategoryInfo>();

  for (const infoFile of infoFiles) {
    const dir = path.dirname(infoFile);
    infos.set(dir, await readCatInfo(dir));
  }

  return infos;
};

const _grantingDirs = (infos: Map<string, CategoryInfo>): string[] =>
  Array.from(infos)
    .filter(([, info]) => Object.keys(info.sharing?.users || {}).length > 0)
    .map(([dir]) => dir);

const _explicitlyShared = async (mode: Modes): Promise<string[]> => {
  const frontmatters = new Map<string, Record<string, unknown>>();
  await fillFrontmatters(await getAllFileStats(_modeDir(mode)), frontmatters);
  return Array.from(frontmatters)
    .filter(([, metadata]) => Boolean(metadata[SHARED_WITH_KEY]))
    .map(([filePath]) => filePath);
};

const _reachableFiles = async (mode: Modes): Promise<string[]> => {
  const [explicit, infos] = await Promise.all([_explicitlyShared(mode), _sharingFolders(mode)]);
  shareShapes.set(mode, new Map(Array.from(infos, ([dir, info]) => [dir, _shapeOf(info)])));

  const paths = new Set(explicit);

  for (const dir of _grantingDirs(infos)) {
    const files = await grepListAllFiles(dir);
    files.forEach((file) => paths.add(file.filePath));
  }

  return Array.from(paths);
};

interface SharedFact {
  path: string;
  uuid: string;
  owner: string;
  users: Record<string, SharingPermissions>;
  isPublic: boolean;
  viaCategory?: string;
}

const _factOf = async (mode: Modes, filePath: string): Promise<SharedFact | null> => {
  const access = await resolveAccess(mode, filePath);
  const uuid = access?.uuid;
  if (!uuid || !access || Object.keys(access.users).length === 0) return null;

  return {
    path: filePath,
    uuid,
    owner: access.owner,
    users: access.users,
    isPublic: access.isPublic,
    viaCategory: access.inherited ? access.viaCategory : undefined,
  };
};

const _computeFacts = async (mode: Modes): Promise<SharedFact[]> => {
  const facts: SharedFact[] = [];
  for (const filePath of await _reachableFiles(mode)) {
    const fact = await _factOf(mode, filePath);
    if (fact) facts.push(fact);
  }
  return facts;
};

const _reshaped = async (mode: Modes, folder: string): Promise<boolean> => {
  const known = shareShapes.get(mode);
  const shape = _shapeOf(await readCatInfo(folder));
  if (known && (known.get(folder) ?? UNSHARED_SHAPE) === shape) return false;
  known?.set(folder, shape);
  return true;
};

const _underFolder = async (
  mode: Modes,
  infoPath: string,
  current: SharedFact[],
): Promise<string[]> => {
  const folder = path.dirname(infoPath);
  if (!(await _reshaped(mode, folder))) return [];
  const listed = (await grepListAllFiles(folder)).map((file) => file.filePath);
  const known = current.filter((fact) => isPathSafe(folder, fact.path)).map((fact) => fact.path);
  return [...listed, ...known];
};

const _affectedBy = async (
  mode: Modes,
  paths: string[],
  current: SharedFact[],
): Promise<string[]> => {
  const affected = new Set<string>();
  for (const filePath of paths) {
    const reached = isFolderInfo(filePath)
      ? await _underFolder(mode, filePath, current)
      : [filePath];
    reached.forEach((reachedPath) => affected.add(reachedPath));
  }
  return Array.from(affected);
};

const _patchFacts =
  (mode: Modes) =>
  async (paths: string[], current: SharedFact[]): Promise<SharedFact[] | null> => {
    if (!shareShapes.has(mode) && paths.some(isFolderInfo)) return null;
    const byPath = new Map(current.map((fact) => [fact.path, fact]));
    for (const filePath of await _affectedBy(mode, paths, current)) {
      const fact = await _factOf(mode, filePath);
      if (fact) byPath.set(filePath, fact);
      else byPath.delete(filePath);
    }
    return Array.from(byPath.values());
  };

const _factsFor = cache(
  (mode: Modes): Promise<SharedFact[]> =>
    getOrCompute(
      shareFactsKey(mode, _modeDir(mode)),
      _modeDir(mode),
      () => _computeFacts(mode),
      _patchFacts(mode),
      true,
    ),
);

const _entriesFor = async (
  mode: Modes,
  username: string,
): Promise<UserSharedItem[]> => {
  const facts = await _factsFor(mode);

  return facts
    .filter((fact) => fact.owner !== username && Boolean(fact.users[username]))
    .map((fact) => ({ uuid: fact.uuid, sharer: fact.owner }));
};

const _byReceiver = (facts: SharedFact[]): SharingData => {
  const data: SharingData = {};

  facts.forEach((fact) => {
    Object.entries(fact.users).forEach(([receiver, permissions]) => {
      const entries = data[receiver] || [];
      entries.push({ uuid: fact.uuid, sharer: fact.owner, permissions });
      data[receiver] = entries;
    });
  });

  return data;
};

export const globalShares = async (): Promise<GlobalShares> => {
  try {
    const [notes, checklists] = await Promise.all([
      _factsFor(Modes.NOTES),
      _factsFor(Modes.CHECKLISTS),
    ]);

    return {
      notes: _byReceiver(notes),
      checklists: _byReceiver(checklists),
    };
  } catch (error) {
    console.error("Error in globalShares:", error);
    return { notes: {}, checklists: {} };
  }
};

export const sharedForUser = async (
  username: string,
): Promise<UserSharedItems> => {
  try {
    const [notes, checklists] = await Promise.all([
      _entriesFor(Modes.NOTES, username),
      _entriesFor(Modes.CHECKLISTS, username),
    ]);

    return { notes, checklists };
  } catch (error) {
    console.error("Error in sharedForUser:", error);
    return { notes: [], checklists: [] };
  }
};

const _grantsOf = (fact: SharedFact, mode: Modes, username: string): ShareListing[] => {
  const type = mode === Modes.NOTES ? ItemTypes.NOTE : ItemTypes.CHECKLIST;
  const base = { uuid: fact.uuid, type, owner: fact.owner, viaCategory: fact.viaCategory };

  if (fact.owner === username) {
    const people = Object.entries(fact.users).filter(([name]) => name !== PUBLIC_USER);
    return [{ ...base, direction: ShareDirections.BY_ME, isPublic: fact.isPublic, people }];
  }

  const mine = fact.users[username];
  return mine ? [{ ...base, direction: ShareDirections.WITH_ME, permissions: mine }] : [];
};

export const sharesInvolving = async (username: string): Promise<ShareListing[]> => {
  try {
    const perMode = await Promise.all(
      SHARED_MODES.map(async (mode) =>
        (await _factsFor(mode)).flatMap((fact) => _grantsOf(fact, mode, username)),
      ),
    );
    return perMode.flat();
  } catch (error) {
    console.error("Error in sharesInvolving:", error);
    return [];
  }
};

const _summaries = async (
  mode: Modes,
): Promise<{ all: SharedItemSummary[]; open: SharedItemSummary[] }> => {
  const facts = await _factsFor(mode);
  const all: SharedItemSummary[] = [];
  const open: SharedItemSummary[] = [];

  facts.forEach((fact) => {
    all.push({ uuid: fact.uuid });
    if (fact.isPublic) open.push({ uuid: fact.uuid });
  });

  return { all, open };
};

export const allShared = async (): Promise<AllSharedItems> => {
  try {
    const [notes, checklists] = await Promise.all([
      _summaries(Modes.NOTES),
      _summaries(Modes.CHECKLISTS),
    ]);

    return {
      notes: notes.all,
      checklists: checklists.all,
      public: { notes: notes.open, checklists: checklists.open },
    };
  } catch (error) {
    console.error("Error in allShared:", error);
    return {
      notes: [],
      checklists: [],
      public: { notes: [], checklists: [] },
    };
  }
};

import type { SidebarEntry } from "@/app/_types";

const DB_NAME = "jotty-offline";
const DB_VERSION = 1;
const STORE = "sidebar";

export interface OfflineFolder {
  key: string;
  stamp: string;
  rows: SidebarEntry[];
  username?: string;
  mode?: string;
}

const KEY_END = "\uffff";

export const offlineKey = (username: string, mode: string, category: string): string =>
  `${username}::${mode}::${category}`;

const _open = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const _run = async <T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await _open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = work(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
};

export const keepOfflineFolder = (folder: OfflineFolder): Promise<IDBValidKey> =>
  _run("readwrite", (store) => store.put(folder));

export const offlineFolder = (key: string): Promise<OfflineFolder | undefined> =>
  _run("readonly", (store) => store.get(key) as IDBRequest<OfflineFolder | undefined>);

const _owns = (record: OfflineFolder, username: string, mode: string, prefix: string): boolean =>
  record.username === undefined
    ? record.key.startsWith(prefix)
    : record.username === username && record.mode === mode;

export const offlineStamps = async (username: string, mode: string): Promise<Map<string, string>> => {
  const prefix = offlineKey(username, mode, "");
  const records = await _run("readonly", (store) =>
    store.getAll(IDBKeyRange.bound(prefix, `${prefix}${KEY_END}`)) as IDBRequest<OfflineFolder[]>,
  );
  return new Map(
    records
      .filter((record) => _owns(record, username, mode, prefix))
      .map((record) => [record.key, record.stamp]),
  );
};

export const forgetOfflineFolders = async (keys: string[]): Promise<void> => {
  if (!keys.length) return;
  const db = await _open();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      keys.forEach((key) => store.delete(key));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
};

export const forgetOfflineSidebar = (): Promise<undefined> =>
  _run("readwrite", (store) => store.clear() as IDBRequest<undefined>);

import path from "path";
import fs from "fs/promises";
import { constants } from "fs";
import { v5 as uuidv5 } from "uuid";
import { DATA_DIR } from "@/app/_consts/files";
import { PATH_UUID_NAMESPACE, isUuid } from "@/app/_consts/identity";

export enum ReadOnlyCodes {
  READ_ONLY_FS = "EROFS",
  ACCESS = "EACCES",
  PERMISSION = "EPERM",
}

const READ_ONLY_CODES: string[] = Object.values(ReadOnlyCodes);
const PATH_UUID_VERSION = "5";

const warnedDirs = new Set<string>();

export const isReadOnlyError = (error: unknown): boolean => {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && READ_ONLY_CODES.includes(code);
};

export const pathUuid = (filePath: string): string => {
  const dataRoot = path.resolve(process.cwd(), DATA_DIR);
  const relative = path.relative(dataRoot, path.resolve(filePath));
  return uuidv5(relative.split(path.sep).join("/"), PATH_UUID_NAMESPACE);
};

export const isPathUuid = (uuid: string): boolean =>
  isUuid(uuid) && uuid.charAt(14) === PATH_UUID_VERSION;

export const warnReadOnly = (dirPath: string): void => {
  const key = path.resolve(dirPath);
  if (warnedDirs.has(key)) return;

  warnedDirs.add(key);
  console.warn(
    `Read-only folder ${dirPath}, leaving it untouched and deriving ids from paths`,
  );
};

export const isWritable = async (dirPath: string): Promise<boolean> => {
  try {
    await fs.access(dirPath, constants.W_OK);
    return true;
  } catch (error) {
    return !isReadOnlyError(error);
  }
};

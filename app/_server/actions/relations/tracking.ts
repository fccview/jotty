import fs from "fs/promises";
import path from "path";
import { invalidatePath } from "@/app/_server/actions/lib/metadata-cache";
import { dataRoot, itemFileInfo } from "./paths";
import {
  forgetMissing,
  forgetItemFile,
  forgetItemTree,
  indexItemFile,
  indexItemTree,
} from "./indexer";

const _withinData = (target: string): boolean => {
  const rel = path.relative(dataRoot(), path.resolve(target));
  return Boolean(rel) && !rel.startsWith("..") && !path.isAbsolute(rel);
};

const _safely = async (label: string, target: string, work: () => unknown) => {
  try {
    await work();
  } catch (error) {
    console.error(`Relations ${label} failed for ${target}:`, error);
  }
};

export const trackItemWrite = async (filePath: string, content: string) => {
  if (!itemFileInfo(filePath)) return;
  invalidatePath(filePath);
  await _safely("write", filePath, async () => {
    const stats = await fs.stat(filePath);
    indexItemFile(filePath, content, Math.floor(stats.mtimeMs));
  });
};

export const trackItemDelete = async (filePath: string) => {
  if (!itemFileInfo(filePath)) return;
  invalidatePath(filePath);
  await _safely("delete", filePath, () => forgetItemFile(filePath));
};

export const trackTreeDelete = async (dir: string) => {
  if (!_withinData(dir)) return;
  invalidatePath(dir);
  await _safely("tree delete", dir, () => forgetItemTree(dir));
};

export const trackMove = async (from: string, to: string) => {
  if (!_withinData(from) && !_withinData(to)) return;
  invalidatePath(from);
  invalidatePath(to);
  await _safely("move", `${from} -> ${to}`, async () => {
    const stats = await fs.stat(to);
    if (stats.isDirectory()) {
      await indexItemTree(to);
      await forgetMissing(from);
      return;
    }
    if (itemFileInfo(to)) {
      indexItemFile(to, await fs.readFile(to, "utf-8"), Math.floor(stats.mtimeMs));
    }
    forgetItemFile(from);
  });
};

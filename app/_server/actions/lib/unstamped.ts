import path from "path";
import fs from "fs/promises";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";
import { StampRefusals } from "@/app/_consts/identity";
import { refusalOf, stampedContent } from "@/app/_server/actions/lib/stamp-uuid";
import {
  isPathUuid,
  isWritable,
  pathUuid,
  uuidOf,
} from "@/app/_server/actions/lib/read-only";

export const lockOfContent = (content: string, filePath: string): StampRefusals | null => {
  if (uuidOf(extractYamlMetadata(content).metadata.uuid)) return null;
  const refusal = refusalOf(content);
  if (refusal) return refusal;
  return stampedContent(content, pathUuid(filePath)) ? null : StampRefusals.UNPARSABLE;
};

export const lockOf = async (filePath: string): Promise<StampRefusals | null> => {
  if (!(await isWritable(path.dirname(filePath)))) return null;
  return lockOfContent(await fs.readFile(filePath, "utf-8"), filePath);
};

export const isLockedItem = async (uuid: string, filePath: string): Promise<boolean> => {
  if (!isPathUuid(uuid)) return false;
  try {
    return Boolean(await lockOf(filePath));
  } catch (error) {
    console.error("Could not check whether an item is locked:", filePath, error);
    return true;
  }
};

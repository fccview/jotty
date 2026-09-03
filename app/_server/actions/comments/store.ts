import path from "path";
import { Comment } from "@/app/_types";
import { COMMENTS_FILE } from "@/app/_consts/files";
import {
  readJsonFile,
  writeJsonFile,
  ensureDir,
} from "@/app/_server/actions/file";

export interface CommentsFileData {
  items: Record<string, Comment[]>;
}

const _emptyCommentsData = (): CommentsFileData => ({ items: {} });

const _looksLikeComments = (items: unknown): items is Record<string, Comment[]> =>
  typeof items === "object" &&
  items !== null &&
  !Array.isArray(items) &&
  Object.values(items).every((list) => Array.isArray(list));

export const readCommentsFile = async (
  owner: string,
  boardUuid: string,
): Promise<CommentsFileData> => {
  const data = await readJsonFile(COMMENTS_FILE(owner, boardUuid));
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return _emptyCommentsData();
  }
  if (data.items === undefined || data.items === null) return _emptyCommentsData();
  if (!_looksLikeComments(data.items)) {
    throw new Error("Comments file is malformed");
  }
  return data as CommentsFileData;
};

export const writeCommentsFile = async (
  owner: string,
  boardUuid: string,
  data: CommentsFileData,
): Promise<void> => {
  const filePath = COMMENTS_FILE(owner, boardUuid);
  await ensureDir(path.join(process.cwd(), path.dirname(filePath)));
  await writeJsonFile(data, filePath);
};

export const readItemComments = async (
  owner: string,
  boardUuid: string,
  itemId: string,
): Promise<Comment[]> => {
  const data = await readCommentsFile(owner, boardUuid);
  return data.items[itemId] || [];
};
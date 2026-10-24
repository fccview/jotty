import { readFile } from "@/app/_server/actions/file";
import { getHowtoFilePath, getHowtoGuides } from "@/app/_utils/howto-utils";
import { leadingHeading } from "@/app/_utils/title-utils";

export interface HowtoDoc {
  id: string;
  title: string;
  content: string;
}

const _keyOnly = (key: string) => key;

export const readHowto = async (id: string): Promise<HowtoDoc | null> => {
  const guide = getHowtoGuides(_keyOnly).find((entry) => entry.id === id);
  if (!guide) return null;
  const content = await readFile(getHowtoFilePath(guide.filename));
  if (!content) {
    console.warn(`Howto guide ${guide.filename} is missing or empty`);
    return null;
  }
  return { id: guide.id, title: leadingHeading(content) ?? guide.id, content };
};

export const listHowtos = async (): Promise<Array<Omit<HowtoDoc, "content">>> => {
  const docs = await Promise.all(getHowtoGuides(_keyOnly).map((guide) => readHowto(guide.id)));
  return docs.filter((doc): doc is HowtoDoc => doc !== null).map(({ id, title }) => ({ id, title }));
};

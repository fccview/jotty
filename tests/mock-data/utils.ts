import { randomUUID } from "crypto";
import { TAG_POOL_SIZE, SEED, LOREM_WORDS } from "./constants";

export { LOREM_WORDS };

let _randomSeed = SEED;

const _seededRandom = () => {
  _randomSeed = (_randomSeed * 9301 + 49297) % 233280;
  return _randomSeed / 233280;
};

export const resetSeed = () => {
  _randomSeed = SEED;
};

export const random = () => _seededRandom();

export const randomInt = (min: number, max: number): number => {
  return Math.floor(random() * (max - min + 1)) + min;
};

export const randomChoice = <T>(array: T[]): T => {
  return array[Math.floor(random() * array.length)];
};

export const randomSample = <T>(array: T[], count: number): T[] => {
  const shuffled = [...array].sort(() => random() - 0.5);
  return shuffled.slice(0, Math.min(count, array.length));
};

export const generateTagPool = (size: number = TAG_POOL_SIZE): string[] => {
  const roots = [
    "#work",
    "#personal",
    "#dev",
    "#finance",
    "#health",
    "#ideas",
    "#marketing",
    "#legal",
  ];
  const sub1 = [
    "active",
    "archive",
    "draft",
    "final",
    "review",
    "planning",
    "2024",
    "2025",
  ];
  const sub2 = [
    "urgent",
    "low-priority",
    "alpha",
    "beta",
    "v1",
    "v2",
    "bug",
    "feature",
  ];
  const sub3 = ["approved", "rejected", "pending", "in-progress"];

  const pool = new Set<string>();
  while (pool.size < size) {
    const depth = randomInt(1, 4);
    const tagParts = [randomChoice(roots)];
    if (depth > 1) tagParts.push(randomChoice(sub1));
    if (depth > 2) tagParts.push(randomChoice(sub2));
    if (depth > 3) tagParts.push(randomChoice(sub3));
    pool.add(tagParts.join("/"));
  }
  return Array.from(pool);
};

export const getLoremText = (
  minWords: number = 2,
  maxWords: number = 5
): string => {
  const numWords = randomInt(minWords, maxWords);
  const words = randomSample(LOREM_WORDS, Math.min(numWords, LOREM_WORDS.length));
  return words.join(" ").replace(/^\w/, (c) => c.toUpperCase());
};

export const getTimestamp = (): string => {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
};

export const getUniqueId = (): string => {
  return randomUUID();
};

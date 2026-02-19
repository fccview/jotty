import { randomUUID } from "crypto";
import { faker } from "@faker-js/faker";
import { TAG_POOL_SIZE, SEED, NUM_CATEGORIES } from "./constants";

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

const _slug = (s: string): string =>
  faker.helpers.slugify(s).toLowerCase() || "tag";

export const getChecklistCategories = (count: number = NUM_CATEGORIES): string[] => {
  return faker.helpers.uniqueArray(
    () => faker.commerce.department(),
    count,
  );
};

export const getNoteCategories = (count: number = NUM_CATEGORIES): string[] => {
  return faker.helpers.uniqueArray(
    () => faker.commerce.department(),
    count,
  );
};

export const generateTagPool = (size: number = TAG_POOL_SIZE): string[] => {
  const pool = new Set<string>();
  while (pool.size < size) {
    const depth = randomInt(1, 4);
    const parts = ["#" + _slug(faker.word.noun())];
    for (let i = 1; i < depth; i++) {
      parts.push(_slug(faker.word.noun()));
    }
    pool.add(parts.join("/"));
  }
  return Array.from(pool);
};

export const getTimestamp = (): string => {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
};

export const getUniqueId = (): string => {
  return randomUUID();
};

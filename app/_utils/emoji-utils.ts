import { EMOJIS } from "@/app/_consts/emojis";
import { EmojiConfig } from "@/app/_types";
import {
  loadCustomEmojis,
  processCustomEmojis,
} from "@/app/_utils/config-loader";

let emojiDictCache: { [key: string]: EmojiConfig };

const initializeEmojiDict = (): void => {
  const emojiDict: { [key: string]: EmojiConfig } = {};

  for (const [key, value] of Object.entries(EMOJIS)) {
    emojiDict[key] = normalizeEmojiConfig(value);
  }

  emojiDictCache = emojiDict;
};

let customEmojisLoaded = false;
const loadCustomEmojisAsync = async () => {
  if (!customEmojisLoaded) {
    try {
      const customConfig = await loadCustomEmojis();
      const customEmojis = processCustomEmojis(customConfig);

      for (const [key, value] of Object.entries(customEmojis)) {
        emojiDictCache[key] = normalizeEmojiConfig(value);
      }
    } catch (error) {
      console.warn("Failed to load custom emojis:", error);
    }
    customEmojisLoaded = true;
  }
};

const getSingular = (word: string): string => {
  if (word.endsWith("ies")) {
    return word.slice(0, -3) + "y";
  }
  if (word.endsWith("es")) {
    return word.slice(0, -2);
  }
  if (word.endsWith("s")) {
    return word.slice(0, -1);
  }
  return word;
};

const normalizeEmojiConfig = (value: EmojiConfig | string): EmojiConfig => {
  if (typeof value === "string") {
    return {
      emoji: value,
      match: "word",
      caseSensitive: false,
    };
  }
  return value;
};

initializeEmojiDict();

export const findMatchingEmoji = async (text: string): Promise<string> => {
  try {
    loadCustomEmojisAsync();

    const emojiDict = emojiDictCache;

    const words = text.split(/\s+/);

    for (const word of words) {
      const cleanWord = word.toLowerCase().replace(/[^a-z]/g, "");

      const config = emojiDict[cleanWord];
      if (config && config.emoji && config.match === "word") {
        return config.emoji;
      }

      const singular = getSingular(cleanWord);
      if (singular !== cleanWord) {
        const singularConfig = emojiDict[singular];
        if (
          singularConfig &&
          singularConfig.emoji &&
          singularConfig.match === "word"
        ) {
          return singularConfig.emoji;
        }
      }
    }

    return "";
  } catch (error) {
    console.warn("Error finding emoji:", error);
    return "";
  }
};

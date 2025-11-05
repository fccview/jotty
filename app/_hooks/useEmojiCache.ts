"use client";

import { useState, useEffect } from "react";
import { findMatchingEmoji } from "@/app/_utils/emoji-utils";

interface EmojiCache {
  [key: string]: string;
}

let globalEmojiCache: EmojiCache = {};

export const useEmojiCache = (text: string, showEmojis: boolean) => {
  const [emoji, setEmoji] = useState<string>("");

  useEffect(() => {
    if (!showEmojis || !text.trim()) {
      setEmoji("");
      return;
    }

    if (globalEmojiCache[text]) {
      setEmoji(globalEmojiCache[text]);
      return;
    }

    (async () => {
      try {
        const result = await findMatchingEmoji(text);
        globalEmojiCache[text] = result;
        setEmoji(result);
      } catch (error) {
        console.warn("Error finding emoji:", error);
        setEmoji("");
      }
    })();
  }, [text, showEmojis]);

  return emoji;
};

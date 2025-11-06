"use client";

import { createContext, useContext, useEffect, ReactNode } from "react";
import { useSettings } from "@/app/_utils/settings-store";
import { preloadCustomEmojis } from "@/app/_utils/emoji-utils";

interface EmojiContextType {
  isEmojiLoading: boolean;
}

const EmojiContext = createContext<EmojiContextType>({
  isEmojiLoading: false,
});

interface EmojiProviderProps {
  children: ReactNode;
}

export const EmojiProvider = ({ children }: EmojiProviderProps) => {
  const { showEmojis } = useSettings();

  useEffect(() => {
    if (showEmojis) {
      preloadCustomEmojis().catch((error) => {
        console.warn("Failed to preload custom emojis:", error);
      });
    }
  }, [showEmojis]);

  return (
    <EmojiContext.Provider value={{ isEmojiLoading: false }}>
      {children}
    </EmojiContext.Provider>
  );
};

export const useEmojiContext = () => {
  const context = useContext(EmojiContext);
  if (!context) {
    throw new Error("useEmojiContext must be used within an EmojiProvider");
  }
  return context;
};

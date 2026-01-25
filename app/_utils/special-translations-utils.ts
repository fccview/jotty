export const SPECIAL_TRANSLATIONS = ["klingon", "pirate"] as const;

export type SpecialTranslation = (typeof SPECIAL_TRANSLATIONS)[number];

export const isSpecialTranslation = (locale: string): boolean => {
  return SPECIAL_TRANSLATIONS.includes(locale as SpecialTranslation);
};

export const SPECIAL_TRANSLATION_GIFS: Record<SpecialTranslation, string> = {
  klingon: "/images/gifs/qapla.gif",
  pirate: "/images/gifs/limewire.gif",
};

export const SPECIAL_TRANSLATION_TRIGGERS: Record<SpecialTranslation, string> = {
  klingon: "qapla",
  pirate: "limewire",
};

export const getSpecialTranslationForTrigger = (
  trigger: string
): SpecialTranslation | null => {
  const entry = Object.entries(SPECIAL_TRANSLATION_TRIGGERS).find(
    ([, value]) => value.toLowerCase() === trigger.toLowerCase()
  );
  return entry ? (entry[0] as SpecialTranslation) : null;
};

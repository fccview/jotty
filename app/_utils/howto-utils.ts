import { HOWTO_DIR } from "@/app/_consts/files";
import path from "path";

export interface HowtoGuide {
  id: string;
  name: string;
  filename: string;
  icon: string;
  translationKey: string;
}

export const getHowtoGuides = (t: any): HowtoGuide[] => [
  {
    id: "shortcuts",
    name: t("help.shortcuts"),
    filename: "SHORTCUTS.md",
    icon: "zap",
    translationKey: "help.shortcuts",
  },
  {
    id: "markdown",
    name: t("help.markdownGuide"),
    filename: "MARKDOWN.md",
    icon: "hash",
    translationKey: "help.markdownGuide",
  },
  {
    id: "api",
    name: t("common.api"),
    filename: "API.md",
    icon: "code",
    translationKey: "common.api",
  },
  {
    id: "customisations",
    name: t("help.customisations"),
    filename: "CUSTOMISATIONS.md",
    icon: "paintbrush",
    translationKey: "help.customisations",
  },
  {
    id: "docker",
    name: t("help.docker"),
    filename: "DOCKER.md",
    icon: "laptop",
    translationKey: "help.docker",
  },
  {
    id: "env-variables",
    name: t("help.envVariables"),
    filename: "ENV-VARIABLES.md",
    icon: "key",
    translationKey: "help.envVariables",
  },
  {
    id: "pwa",
    name: t("help.pwa"),
    filename: "PWA.md",
    icon: "smartphone",
    translationKey: "help.pwa",
  },
  {
    id: "encryption",
    name: t("help.encryption"),
    filename: "ENCRYPTION.md",
    icon: "lock",
    translationKey: "help.encryption",
  },
  {
    id: "mfa",
    name: t("help.mfa"),
    filename: "MFA.md",
    icon: "computerphone",
    translationKey: "help.mfa",
  },
  {
    id: "sso",
    name: t("help.sso"),
    filename: "SSO.md",
    icon: "squarelock",
    translationKey: "help.sso",
  },
  {
    id: "translations",
    name: t("help.translations"),
    filename: "TRANSLATIONS.md",
    icon: "translation",
    translationKey: "help.translations",
  },
];

export const getHowtoGuideById = (id: string, t: any): HowtoGuide | undefined => {
  return getHowtoGuides(t).find((guide) => guide.id === id);
};

export const getHowtoFilePath = (filename: string): string => {
  return path.join(HOWTO_DIR, filename);
};

export const isValidHowtoGuide = (id: string, t: any): boolean => {
  return getHowtoGuides(t).some((guide) => guide.id === id);
};

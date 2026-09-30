import { HOWTO_DIR } from "@/app/_consts/files";
import path from "path";

export const API_GUIDE_ID = "api";

export enum HowtoSections {
  JOTTY = "jotty",
  MCP = "mcp",
}

export const HOWTO_SECTION_ORDER: HowtoSections[] = [HowtoSections.JOTTY, HowtoSections.MCP];

export type HowtoLabel = (key: string) => string;

export interface HowtoGuide {
  id: string;
  name: string;
  filename: string;
  icon: string;
  section: HowtoSections;
  translationKey: string;
}

export const getHowtoGuides = (t: HowtoLabel): HowtoGuide[] => [
  {
    id: "shortcuts",
    name: t("help.shortcuts"),
    filename: "SHORTCUTS.md",
    icon: "zap",
    section: HowtoSections.JOTTY,
    translationKey: "help.shortcuts",
  },
  {
    id: "markdown",
    name: t("help.markdownGuide"),
    filename: "MARKDOWN.md",
    icon: "hash",
    section: HowtoSections.JOTTY,
    translationKey: "help.markdownGuide",
  },
  {
    id: "brain",
    name: t("help.brain"),
    filename: "BRAIN.md",
    icon: "brain",
    section: HowtoSections.JOTTY,
    translationKey: "help.brain",
  },
  {
    id: API_GUIDE_ID,
    name: t("common.api"),
    filename: "API.md",
    icon: "code",
    section: HowtoSections.JOTTY,
    translationKey: "common.api",
  },
  {
    id: "mcp",
    name: t("help.mcp"),
    filename: "MCP.md",
    icon: "robot",
    section: HowtoSections.MCP,
    translationKey: "help.mcp",
  },
  {
    id: "mcp-tools",
    name: t("help.mcpTools"),
    filename: "MCP-TOOLS.md",
    icon: "tools",
    section: HowtoSections.MCP,
    translationKey: "help.mcpTools",
  },
  {
    id: "mcp-agents",
    name: t("help.mcpAgents"),
    filename: "MCP-AGENTS.md",
    icon: "bot",
    section: HowtoSections.MCP,
    translationKey: "help.mcpAgents",
  },
  {
    id: "customisations",
    name: t("help.customisations"),
    filename: "CUSTOMISATIONS.md",
    icon: "paintbrush",
    section: HowtoSections.JOTTY,
    translationKey: "help.customisations",
  },
  {
    id: "docker",
    name: t("help.docker"),
    filename: "DOCKER.md",
    icon: "laptop",
    section: HowtoSections.JOTTY,
    translationKey: "help.docker",
  },
  {
    id: "unraid",
    name: t("help.unraid"),
    filename: "UNRAID.md",
    icon: "rain",
    section: HowtoSections.JOTTY,
    translationKey: "help.unraid",
  },
  {
    id: "env-variables",
    name: t("help.envVariables"),
    filename: "ENV-VARIABLES.md",
    icon: "key",
    section: HowtoSections.JOTTY,
    translationKey: "help.envVariables",
  },
  {
    id: "pwa",
    name: t("help.pwa"),
    filename: "PWA.md",
    icon: "smartphone",
    section: HowtoSections.JOTTY,
    translationKey: "help.pwa",
  },
  {
    id: "encryption",
    name: t("help.encryption"),
    filename: "ENCRYPTION.md",
    icon: "lock",
    section: HowtoSections.JOTTY,
    translationKey: "help.encryption",
  },
  {
    id: "mfa",
    name: t("help.mfa"),
    filename: "MFA.md",
    icon: "computerphone",
    section: HowtoSections.JOTTY,
    translationKey: "help.mfa",
  },
  {
    id: "sso",
    name: t("help.sso"),
    filename: "SSO.md",
    icon: "squarelock",
    section: HowtoSections.JOTTY,
    translationKey: "help.sso",
  },
  {
    id: "ldap",
    name: t("help.ldap"),
    filename: "LDAP.md",
    icon: "users",
    section: HowtoSections.JOTTY,
    translationKey: "help.ldap",
  },
  {
    id: "translations",
    name: t("help.translations"),
    filename: "TRANSLATIONS.md",
    icon: "translation",
    section: HowtoSections.JOTTY,
    translationKey: "help.translations",
  },
  {
    id: "patches",
    name: t("help.patches"),
    filename: "PATCHES.md",
    icon: "patch",
    section: HowtoSections.JOTTY,
    translationKey: "help.patches",
  },
];

export const getHowtoGuideById = (
  id: string,
  t: HowtoLabel,
): HowtoGuide | undefined => {
  return getHowtoGuides(t).find((guide) => guide.id === id);
};

export const getHowtoFilePath = (filename: string): string => {
  return path.join(HOWTO_DIR, filename);
};

export const isValidHowtoGuide = (id: string, t: HowtoLabel): boolean => {
  return getHowtoGuides(t).some((guide) => guide.id === id);
};

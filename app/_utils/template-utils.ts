import { TEMPLATES_DIR_NAME } from "@/app/_consts/files";
import { TemplateVariables } from "@/app/_consts/templates";
import { MANAGED_KEY } from "@/app/_consts/notes";
import { SHARED_WITH_KEY } from "@/app/_consts/sharing";

const UNCARRIED_KEYS = [MANAGED_KEY, SHARED_WITH_KEY];

const VARIABLE_PATTERN = new RegExp(
  `\\{\\{\\s*(${Object.values(TemplateVariables).join("|")})\\s*\\}\\}`,
  "g",
);

export type TemplateValues = Record<TemplateVariables, string>;

export const isTemplateCategory = (category?: string): boolean =>
  category?.split("/")[0] === TEMPLATES_DIR_NAME;

export const fillTemplate = (body: string, values: TemplateValues): string =>
  body.replace(VARIABLE_PATTERN, (_, name: TemplateVariables) => values[name]);

export const carriedMeta = (
  meta?: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  if (!meta) return undefined;
  const kept = Object.entries(meta).filter(([key]) => !UNCARRIED_KEYS.includes(key));
  return kept.length ? Object.fromEntries(kept) : undefined;
};

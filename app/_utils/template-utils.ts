import { TEMPLATES_DIR_NAME } from "@/app/_consts/files";
import { TemplateVariables } from "@/app/_consts/templates";

const VARIABLE_PATTERN = new RegExp(
  `\\{\\{\\s*(${Object.values(TemplateVariables).join("|")})\\s*\\}\\}`,
  "g",
);

export type TemplateValues = Record<TemplateVariables, string>;

export const isTemplateCategory = (category?: string): boolean =>
  category?.split("/")[0] === TEMPLATES_DIR_NAME;

export const fillTemplate = (body: string, values: TemplateValues): string =>
  body.replace(VARIABLE_PATTERN, (_, name: TemplateVariables) => values[name]);

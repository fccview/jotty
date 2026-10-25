import { z } from "zod";
import { apiNames } from "@/app/_schemas/api/names";
import { ThemeMode } from "@/app/_types/theme";
import { envelope } from "./common";

const variables = z
  .record(z.string(), z.string())
  .describe("CSS custom properties, like --background: 40 42 54. Colours are space separated RGB triplets");

export const themeSchema = envelope(
  z
    .object({
      id: z.string().describe("Theme id, like dracula, system or a custom theme id"),
      name: z.string(),
      mode: z.enum(ThemeMode).describe("system follows the device, so variables is the light palette and darkVariables the dark one"),
      variables,
      darkVariables: variables.nullable().describe("The dark palette, only when mode is system"),
      radius: z.string().nullable().describe("Corner radius like 0.5rem, null for the default"),
      customCss: z.boolean().describe("True when the instance has custom CSS, served at /api/custom-css"),
    })
    .register(apiNames, { id: "Theme" }),
);

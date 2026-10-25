import path from "path";
import fs from "fs/promises";
import type { ThemeVariables } from "@/app/_types/theme";

export const ROOT_PALETTE = ":root";
export const COLORS_CSS = path.join("app", "_styles", "themes", "colors.css");
export const CUSTOM_CSS = path.join("config", "custom.css");

const CSS_COMMENT = /\/\*[\s\S]*?\*\//g;
const RULE = /([:.][\w-]+)\s*\{([^{}]*)\}/g;
const DECLARATION = /(--[\w-]+)\s*:\s*([^;]+);/g;
const VAR_OPEN = /var\(\s*(--[\w-]+)\s*(,?)/;

let cached: Promise<Record<string, ThemeVariables>> | null = null;

const declarations = (body: string): ThemeVariables =>
  Object.fromEntries(Array.from(body.matchAll(DECLARATION), ([, name, value]) => [name, value.trim()]));

export const parsePalettes = (css: string): Record<string, ThemeVariables> => {
  const palettes: Record<string, ThemeVariables> = {};
  Array.from(css.replace(CSS_COMMENT, "").matchAll(RULE)).forEach(([, selector, body]) => {
    const found = declarations(body);
    if (!Object.keys(found).length) return;
    const key = selector.startsWith(".") ? selector.slice(1) : selector;
    palettes[key] = { ...palettes[key], ...found };
  });
  return palettes;
};

const closingParen = (value: string, from: number): number => {
  let depth = 1;
  for (let i = from; i < value.length; i++) {
    if (value[i] === "(") depth++;
    if (value[i] === ")" && --depth === 0) return i;
  }
  return -1;
};

const resolveValue = (value: string, vars: ThemeVariables, seen: Set<string>): string => {
  const match = value.match(VAR_OPEN);
  if (match?.index === undefined) return value;
  const [opening, name, comma] = match;
  const close = closingParen(value, match.index + opening.length);
  if (close === -1) return value;
  const target = vars[name];
  const fallback = comma ? value.slice(match.index + opening.length, close).trim() : "";
  const resolved =
    target === undefined || seen.has(name)
      ? resolveValue(fallback, vars, seen)
      : resolveValue(target, vars, new Set(seen).add(name));
  return value.slice(0, match.index) + resolved + resolveValue(value.slice(close + 1), vars, seen);
};

export const resolveVars = (vars: ThemeVariables): ThemeVariables =>
  Object.fromEntries(
    Object.entries(vars).map(([name, value]) => [name, resolveValue(value, vars, new Set([name]))]),
  );

const loadPalettes = async () => {
  try {
    const css = await fs.readFile(path.join(process.cwd(), COLORS_CSS), "utf-8");
    return parsePalettes(css);
  } catch (error) {
    console.error("Failed to read theme palettes from colors.css:", error);
    cached = null;
    throw error;
  }
};

export const readPalettes = () => {
  cached ??= loadPalettes();
  return cached;
};

import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { mockFs } from "../setup";
import { COLORS_CSS, parsePalettes, resolveVars } from "@/app/_server/actions/config/palettes";
import { radiusFor, themeFor, type ThemeSources } from "@/app/_server/actions/config/effective-theme";
import { ThemeMode } from "@/app/_types/theme";

const CSS = fs.readFileSync(path.join(process.cwd(), COLORS_CSS), "utf-8");
const TRIPLET = /^\d{1,3} \d{1,3} \d{1,3}$/;

const sources = (overrides: Partial<ThemeSources> = {}): ThemeSources => ({
  user: {},
  customThemes: {},
  customCss: false,
  ...overrides,
});

describe("theme palettes from colors.css", () => {
  beforeEach(() => {
    mockFs.readFile.mockResolvedValue(CSS);
  });

  it("reads :root and every theme class", () => {
    const palettes = parsePalettes(CSS);
    expect(palettes[":root"]["--background"]).toBe("249 249 249");
    expect(palettes.dracula["--background"]).toBe("40 42 54");
    expect(palettes.default).toBeUndefined();
  });

  it("resolves var() references inside one palette", () => {
    expect(resolveVars({ "--a": "1 2 3", "--b": "var(--a)", "--c": "var(--missing, 4 5 6)", "--d": "var(--d)" })).toEqual({
      "--a": "1 2 3",
      "--b": "1 2 3",
      "--c": "4 5 6",
      "--d": "",
    });
  });

  it("resolves var() fallbacks nested inside other fallbacks", () => {
    expect(
      resolveVars({
        "--a": "1 2 3",
        "--b": "var(--missing, var(--a))",
        "--c": "var(--missing, var(--gone, var(--a)))",
        "--d": "rgb(var(--missing, var(--a)) / 0.5)",
      }),
    ).toEqual({ "--a": "1 2 3", "--b": "1 2 3", "--c": "1 2 3", "--d": "rgb(1 2 3 / 0.5)" });
  });

  it("gives a fixed theme its own colours over the root ones", async () => {
    const theme = await themeFor(sources({ user: { preferredTheme: "dracula" } }));
    expect(theme).toMatchObject({ id: "dracula", name: "Dracula", mode: ThemeMode.FIXED, darkVariables: null });
    expect(theme.variables["--background"]).toBe("40 42 54");
    Object.values(theme.variables).forEach((value) => expect(value).toMatch(TRIPLET));
  });

  it("gives system both palettes with references resolved", async () => {
    const theme = await themeFor(sources());
    expect(theme).toMatchObject({ id: "system", name: "System", mode: ThemeMode.SYSTEM });
    expect(theme.variables["--background"]).toBe("249 249 249");
    expect(theme.darkVariables?.["--background"]).toBe("14 24 64");
    expect(theme.darkVariables?.["--card"]).toBe("14 24 64");
  });

  it("uses the rwMarkable palettes for system on rwMarkable instances", async () => {
    const theme = await themeFor(sources({ isRwMarkable: true }));
    expect(theme.variables["--primary"]).toBe("37 99 235");
    expect(theme.darkVariables?.["--background"]).toBe("17 24 39");
  });

  it("layers a custom theme over the root palette", async () => {
    const theme = await themeFor(
      sources({
        user: { preferredTheme: "midnight" },
        customThemes: { midnight: { name: "Midnight", colors: { "--background": "1 2 3", "--card": "var(--background)" } } },
      }),
    );
    expect(theme).toMatchObject({ id: "midnight", name: "Midnight", mode: ThemeMode.FIXED });
    expect(theme.variables["--card"]).toBe("1 2 3");
    expect(theme.variables["--primary"]).toBe("157 95 254");
  });

  it("falls back to system for a theme that no longer exists", async () => {
    const theme = await themeFor(sources({ user: { preferredTheme: "deleted-theme" } }));
    expect(theme).toMatchObject({ id: "system", mode: ThemeMode.SYSTEM });
  });

  it("prefers the user's radius, then the admin's, and reports the default as null", () => {
    expect(radiusFor(0.5, 1)).toBe("0.5rem");
    expect(radiusFor(undefined, 1)).toBe("1rem");
    expect(radiusFor(undefined, 0.25)).toBeNull();
    expect(radiusFor()).toBeNull();
  });
});

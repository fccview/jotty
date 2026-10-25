import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import { mockFs } from "../setup";
import { mockUser, mockAuthenticateApiKey, resetApiMocks, createMockRequest, getResponseJson } from "./setup";

const mockSettings = vi.fn();
const mockThemes = vi.fn();

vi.mock("@/app/_server/actions/config/settings", () => ({ getSettings: () => mockSettings() }));
vi.mock("@/app/_server/actions/config/themes", () => ({ loadCustomThemes: () => mockThemes() }));

import { GET } from "@/app/api/theme/route";

const CSS = fs.readFileSync(path.join(process.cwd(), "app", "_styles", "themes", "colors.css"), "utf-8");

const fetchTheme = async () => GET(createMockRequest("GET", "http://localhost:3000/api/theme"));

describe("GET /api/theme", () => {
  beforeEach(() => {
    resetApiMocks();
    mockFs.readFile.mockResolvedValue(CSS);
    mockSettings.mockResolvedValue({ borderRadius: 0.25 });
    mockThemes.mockResolvedValue({ "custom-themes": { ember: { name: "Ember", colors: { "--primary": "200 50 10" } } } });
    mockFs.stat.mockResolvedValue({ size: 20 });
  });

  it("returns the owner's custom theme with radius and custom css flags", async () => {
    mockAuthenticateApiKey.mockResolvedValue({ ...mockUser, preferredTheme: "ember", preferredBorderRadius: 0.75 });
    const response = await fetchTheme();
    const body = await getResponseJson(response);
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({ id: "ember", name: "Ember", mode: "fixed", darkVariables: null, radius: "0.75rem", customCss: true });
    expect(body.data.variables["--primary"]).toBe("200 50 10");
  });

  it("falls back to system with both palettes", async () => {
    mockAuthenticateApiKey.mockResolvedValue(mockUser);
    mockFs.stat.mockRejectedValue(Object.assign(new Error("missing"), { code: "ENOENT" }));
    const body = await getResponseJson(await fetchTheme());
    expect(body.data).toMatchObject({ id: "system", mode: "system", radius: null, customCss: false });
    expect(body.data.darkVariables["--background"]).toBe("14 24 64");
  });

  it.each(["constructor", "toString", "__proto__"])("falls back to system for the inherited key %s", async (preferredTheme) => {
    mockAuthenticateApiKey.mockResolvedValue({ ...mockUser, preferredTheme });
    const body = await getResponseJson(await fetchTheme());
    expect(body.data).toMatchObject({ id: "system", mode: "system" });
  });

  it("reports no custom css for an empty file", async () => {
    mockAuthenticateApiKey.mockResolvedValue(mockUser);
    mockFs.stat.mockResolvedValue({ size: 0 });
    expect((await getResponseJson(await fetchTheme())).data.customCss).toBe(false);
  });

  it("needs an API key", async () => {
    mockAuthenticateApiKey.mockResolvedValue(null);
    expect((await fetchTheme()).status).toBe(401);
  });
});

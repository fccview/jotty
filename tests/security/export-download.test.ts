import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import os from "os";
import path from "path";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import {
  mockUser,
  mockAuthenticateApiKey,
  mockGetCurrentUser,
  mockGetAppSettings,
  resetApiMocks,
  createMockRequest,
} from "../api/setup";
import { EXPORT_TEMP_DIR } from "@/app/_consts/files";
import { GET } from "@/app/api/exports/[filename]/route";

const SANDBOX = mkdtempSync(path.join(os.tmpdir(), "jotty-exports-"));
const EXPORT_DIR = path.resolve(SANDBOX, EXPORT_TEMP_DIR);
const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(SANDBOX);
const OWN = `${mockUser.username}_content_1700000000000.zip`;
const WHOLE = "whole_data_folder_1700000000000.zip";
const LOOKALIKE = `${mockUser.username}_content_content_1700000000000.zip`;
const ADMIN = { ...mockUser, username: "boss", isAdmin: true };

const plant = (name: string) => {
  mkdirSync(EXPORT_DIR, { recursive: true });
  writeFileSync(path.join(EXPORT_DIR, name), "zip");
};

const fetchExport = async (name: string, headers: Record<string, string> = {}) =>
  GET(createMockRequest("GET", `http://localhost:3000/api/exports/${name}`, undefined, headers), {
    params: Promise.resolve({ filename: name }),
  });

afterAll(() => {
  cwdSpy.mockRestore();
  rmSync(SANDBOX, { recursive: true, force: true });
});

describe("Security: export downloads", () => {
  beforeEach(() => {
    resetApiMocks();
    cwdSpy.mockReturnValue(SANDBOX);
    mockGetAppSettings.mockResolvedValue({ success: true, data: { adminContentAccess: "yes" } });
    [OWN, WHOLE, LOOKALIKE].forEach(plant);
  });

  it("refuses somebody with no session and no api key", async () => {
    const response = await fetchExport(WHOLE, { "x-api-key": "" });

    expect(response.status).toBe(401);
    expect(existsSync(path.join(EXPORT_DIR, WHOLE))).toBe(true);
  });

  it("refuses a regular user asking for an admin export", async () => {
    mockAuthenticateApiKey.mockResolvedValue(mockUser);

    const response = await fetchExport(WHOLE);

    expect(response.status).toBe(404);
    expect(existsSync(path.join(EXPORT_DIR, WHOLE))).toBe(true);
  });

  it("refuses a regular user asking for an export named like theirs", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);

    const response = await fetchExport(LOOKALIKE);

    expect(response.status).toBe(404);
  });

  it("serves a user their own export by session or api key", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    expect((await fetchExport(OWN)).status).toBe(200);

    plant(OWN);
    mockGetCurrentUser.mockResolvedValue(null);
    mockAuthenticateApiKey.mockResolvedValue(mockUser);
    expect((await fetchExport(OWN)).status).toBe(200);
  });

  it("serves an admin with content access any export", async () => {
    mockGetCurrentUser.mockResolvedValue(ADMIN);

    expect((await fetchExport(WHOLE)).status).toBe(200);
  });

  it("refuses an admin when admin content access is off", async () => {
    mockGetCurrentUser.mockResolvedValue(ADMIN);
    mockGetAppSettings.mockResolvedValue({ success: true, data: { adminContentAccess: "no" } });

    expect((await fetchExport(WHOLE)).status).toBe(404);
  });
});

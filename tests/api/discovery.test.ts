import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  mockUser,
  mockAuthenticateApiKey,
  mockFindUserRecord,
  mockGetAppSettings,
  resetApiMocks,
  createMockRequest,
  getResponseJson,
} from "./setup";

const mockGrepSearch = vi.fn();
const mockGrepFrontmatter = vi.fn();

vi.mock("@/app/_utils/grep-utils", () => ({
  grepSearchContent: (...args: unknown[]) => mockGrepSearch(...args),
  grepExtractFrontmatter: (...args: unknown[]) => mockGrepFrontmatter(...args),
}));

import { GET as SEARCH } from "@/app/api/search/route";
import { GET as CURRENT_USER } from "@/app/api/user/route";
import { POST as REQUEST_EXPORT } from "@/app/api/exports/route";
import { buildSpec, contractsOf } from "@/app/_server/api/openapi";
import * as categories from "@/app/api/categories/route";
import * as search from "@/app/api/search/route";
import * as summary from "@/app/api/summary/route";
import * as currentUser from "@/app/api/user/route";
import * as user from "@/app/api/user/[username]/route";
import * as exportsRoute from "@/app/api/exports/route";
import * as exportFile from "@/app/api/exports/[filename]/route";
import * as logs from "@/app/api/logs/route";
import * as logStats from "@/app/api/logs/stats/route";
import * as logExport from "@/app/api/logs/export/route";
import * as logCleanup from "@/app/api/logs/cleanup/route";
import * as rebuild from "@/app/api/admin/rebuild-index/route";

const TOO_SHORT = "Query must be at least 2 characters";

const find = (query: string) => SEARCH(createMockRequest("GET", `http://localhost:3000/api/search${query}`));

describe("Discovery, user and export contracts", () => {
  beforeEach(() => {
    resetApiMocks();
    mockAuthenticateApiKey.mockResolvedValue(mockUser);
    mockGrepSearch.mockReset().mockResolvedValue([]);
    mockGrepFrontmatter.mockReset().mockResolvedValue(null);
  });

  describe("GET /api/search", () => {
    it("keeps the old message when q is missing or too short", async () => {
      for (const query of ["", "?q=a", "?q=%20%20a%20"]) {
        const response = await find(query);
        expect(response.status).toBe(400);
        expect((await getResponseJson(response)).error).toBe(TOO_SHORT);
      }
      expect(mockGrepSearch).not.toHaveBeenCalled();
    });

    it("rejects a type that is neither note nor checklist", async () => {
      expect((await find("?q=milk&type=kanban")).status).toBe(400);
    });

    it("only greps notes when asked for notes", async () => {
      mockGrepSearch.mockResolvedValue([
        { filePath: "data/notes/testuser/Food/milk.md", id: "milk", category: "Food", matchLine: "# Milk" },
      ]);
      mockGrepFrontmatter.mockResolvedValue({ title: "Milk", uuid: "n-1" });

      const data = await getResponseJson(await find("?q=milk&type=note"));

      expect(mockGrepSearch).toHaveBeenCalledTimes(1);
      expect(data).toEqual({
        query: "milk",
        results: [{ id: "milk", slug: "milk", uuid: "n-1", type: "note", title: "Milk", category: "Food" }],
        total: 1,
      });
    });

    it("logs and survives a failing grep", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      mockGrepSearch.mockRejectedValue(new Error("boom"));

      const response = await find("?q=milk");

      expect(response.status).toBe(200);
      expect((await getResponseJson(response)).total).toBe(0);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe("GET /api/user", () => {
    it("returns your profile without any secret", async () => {
      mockAuthenticateApiKey.mockResolvedValue({
        ...mockUser,
        passwordHash: "hash",
        apiKey: "key",
        mfaSecret: "totp",
        mfaRecoveryCode: "recovery",
        lastLogin: "2026-09-01T00:00:00.000Z",
      });
      mockFindUserRecord.mockResolvedValue({ ...mockUser, lastLogin: "2026-09-01T00:00:00.000Z" });

      const response = await CURRENT_USER(createMockRequest("GET", "http://localhost:3000/api/user"));
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.user.username).toBe("testuser");
      expect(data.user.lastLogin).toBe("2026-09-01T00:00:00.000Z");
      ["passwordHash", "apiKey", "mfaSecret", "mfaRecoveryCode"].forEach((secret) =>
        expect(data.user).not.toHaveProperty(secret),
      );
    });
  });

  describe("POST /api/exports", () => {
    it("treats an empty type as missing", async () => {
      mockGetAppSettings.mockResolvedValue({ success: true, data: { adminContentAccess: "yes" } });

      const response = await REQUEST_EXPORT(
        createMockRequest("POST", "http://localhost:3000/api/exports", { type: "" }),
      );

      expect(response.status).toBe(400);
      expect((await getResponseJson(response)).error).toBe("Export type is required");
    });
  });

  it("builds an OpenAPI document for every migrated route", () => {
    const contracts = contractsOf([
      categories, search, summary, currentUser, user, exportsRoute, exportFile,
      logs, logStats, logExport, logCleanup, rebuild,
    ]);
    const spec = buildSpec(contracts, { origin: "http://localhost:3000", version: "test" });

    expect(contracts).toHaveLength(13);
    expect(Object.keys(spec.paths)).toContain("/exports/{filename}");
    expect(spec.paths["/exports/{filename}"].get).toMatchObject({
      responses: { 200: { content: { "application/zip": { schema: { type: "string", format: "binary" } } } } },
    });
    expect(JSON.stringify(spec)).not.toContain("#/$defs/");
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockFs, resetAllMocks, createFormData } from "../setup";

const mockIsAdmin = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAudit = vi.fn();

vi.mock("@/app/_server/actions/users", () => ({
  isAdmin: (...args: any[]) => mockIsAdmin(...args),
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
}));

vi.mock("@/app/_server/actions/log", () => ({
  logAudit: (...args: any[]) => mockLogAudit(...args),
}));

vi.mock("@/app/_server/actions/checklist", () => ({
  getListById: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/app/_server/actions/note", () => ({
  getNoteById: vi.fn().mockResolvedValue(null),
}));

import {
  getSettings,
  getAppSettings,
  updateAppSettings,
  saveCustomCSS,
  loadCustomCSS,
  readPackageVersion,
} from "@/app/_server/actions/config";

describe("Config Actions", () => {
  beforeEach(() => {
    resetAllMocks();
    mockIsAdmin.mockResolvedValue(false);
    mockGetCurrentUser.mockResolvedValue(null);
    mockLogAudit.mockResolvedValue(undefined);
    mockFs.readFile.mockReset();
    mockFs.writeFile.mockReset();
    mockFs.access.mockReset();
    mockFs.mkdir.mockReset();
  });

  describe("getSettings", () => {
    it("should return default settings when no config files exist", async () => {
      mockFs.readFile.mockRejectedValue(new Error("ENOENT"));

      const result = await getSettings();

      expect(result).toMatchObject({
        appName: "jotty·page",
        editor: expect.objectContaining({
          enableSlashCommands: true,
          enableBubbleMenu: true,
        }),
      });
    });

    it("should merge editor settings with defaults", async () => {
      mockFs.readFile.mockResolvedValue(
        JSON.stringify({
          appName: "Custom App",
          editor: {
            enableSlashCommands: false,
          },
        }),
      );

      const result = await getSettings();

      expect(result.appName).toBe("Custom App");
      expect(result.editor.enableSlashCommands).toBe(false);
      expect(result.editor.enableBubbleMenu).toBe(true);
    });
  });

  describe("getAppSettings", () => {
    it("should return error when not admin", async () => {
      mockIsAdmin.mockResolvedValue(false);

      const result = await getAppSettings();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("should return settings when admin", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(
        JSON.stringify({
          appName: "Test App",
          appDescription: "Test Description",
        }),
      );

      const result = await getAppSettings();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("should return default settings when files not found", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockFs.readFile.mockRejectedValue(new Error("ENOENT"));

      const result = await getAppSettings();

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        appName: "",
        adminContentAccess: "yes",
      });
    });
  });

  describe("updateAppSettings", () => {
    it("should return error when not admin", async () => {
      mockGetCurrentUser.mockResolvedValue({
        username: "user",
        isAdmin: false,
      });

      const formData = createFormData({
        appName: "New App Name",
      });

      const result = await updateAppSettings(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized: Admin access required");
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "WARNING",
          success: false,
        }),
      );
    });

    it("should return error when not super admin", async () => {
      mockGetCurrentUser.mockResolvedValue({
        username: "admin",
        isAdmin: true,
        isSuperAdmin: false,
      });

      const formData = createFormData({
        appName: "New App Name",
      });

      const result = await updateAppSettings(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Only the system owner");
    });

    it("should update settings when super admin", async () => {
      mockGetCurrentUser.mockResolvedValue({
        username: "superadmin",
        isAdmin: true,
        isSuperAdmin: true,
      });
      mockFs.access.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const formData = createFormData({
        appName: "Updated App",
        appDescription: "Updated Description",
        notifyNewUpdates: "no",
        parseContent: "yes",
        maximumFileSize: "10485760",
        adminContentAccess: "yes",
      });

      const result = await updateAppSettings(formData);

      expect(result.success).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "INFO",
          action: "app_settings_updated",
          success: true,
        }),
      );
    });
  });

  describe("saveCustomCSS", () => {
    it("should return error when not admin", async () => {
      mockIsAdmin.mockResolvedValue(false);

      const result = await saveCustomCSS(".custom { color: red; }");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "WARNING",
          success: false,
        }),
      );
    });

    it("should save CSS when admin", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await saveCustomCSS(".custom { color: blue; }");

      expect(result.success).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "INFO",
          action: "custom_css_saved",
          success: true,
        }),
      );
    });
  });

  describe("loadCustomCSS", () => {
    it("should return empty string when file not found", async () => {
      mockFs.readFile.mockRejectedValue(new Error("ENOENT"));

      const result = await loadCustomCSS();

      expect(result.success).toBe(true);
      expect(result.data).toBe("");
    });

    it("should return CSS content when file exists", async () => {
      mockFs.readFile.mockResolvedValue(".custom { color: green; }");

      const result = await loadCustomCSS();

      expect(result.success).toBe(true);
      expect(result.data).toBe(".custom { color: green; }");
    });
  });

  describe("readPackageVersion", () => {
    it("should return version from package.json", async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({ version: "1.2.3" }));

      const result = await readPackageVersion();

      expect(result.success).toBe(true);
      expect(result.data).toBe("1.2.3");
    });

    it("should return error when package.json not found", async () => {
      mockFs.readFile.mockRejectedValue(new Error("ENOENT"));

      const result = await readPackageVersion();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to read package version");
    });
  });
});

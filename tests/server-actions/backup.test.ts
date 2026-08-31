import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockFs, resetAllMocks } from "../setup";

const mockIsAdmin = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAudit = vi.fn();
const mockGetSettings = vi.fn();
const mockResticAvailable = vi.fn();
const mockResticBackup = vi.fn();
const mockResticCheck = vi.fn();
const mockResticInit = vi.fn();
const mockResticSnapshots = vi.fn();
const mockResticForget = vi.fn();
const mockResticRestore = vi.fn();
const mockRevalidatePath = vi.fn();
const mockRevalidateTag = vi.fn();
const mockRearmScheduler = vi.fn();
const mockDropByPrefix = vi.fn();
const mockBroadcast = vi.fn();

vi.mock("@/app/_server/actions/users", () => ({
  isAdmin: (...args: any[]) => mockIsAdmin(...args),
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
}));

vi.mock("@/app/_server/actions/log", () => ({
  logAudit: (...args: any[]) => mockLogAudit(...args),
}));

vi.mock("@/app/_server/actions/config/settings", () => ({
  getSettings: (...args: any[]) => mockGetSettings(...args),
}));

vi.mock("@/app/_server/actions/backup/restic", () => ({
  resticAvailable: (...args: any[]) => mockResticAvailable(...args),
  resticBackup: (...args: any[]) => mockResticBackup(...args),
  resticCheck: (...args: any[]) => mockResticCheck(...args),
  resticInit: (...args: any[]) => mockResticInit(...args),
  resticSnapshots: (...args: any[]) => mockResticSnapshots(...args),
  resticForget: (...args: any[]) => mockResticForget(...args),
  resticRestore: (...args: any[]) => mockResticRestore(...args),
  withDefaults: (c: any) => ({ ...{ enabled: false, endpoint: "", bucket: "", region: "", prefix: "jotty", accessKey: "", secretKey: "", repoPassword: "", schedule: "disabled", keepDaily: 7, keepWeekly: 4 }, ...c }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: any[]) => mockRevalidatePath(...args),
  revalidateTag: (...args: any[]) => mockRevalidateTag(...args),
}));

vi.mock("@/app/_server/actions/backup/scheduler", () => ({
  rearmSchedulerFromSettings: (...args: any[]) => mockRearmScheduler(...args),
}));

vi.mock("@/app/_server/actions/lib/metadata-cache", () => ({
  dropByPrefix: (...args: any[]) => mockDropByPrefix(...args),
}));

vi.mock("@/app/_server/actions/ws/broadcast", () => ({
  broadcast: (...args: any[]) => mockBroadcast(...args),
}));

import {
  getBackupConfig,
  saveBackupConfig,
  getBackupStatus,
  runBackupNow,
  listSnapshots,
  checkRepository,
  restoreBackup,
} from "@/app/_server/actions/backup";

describe("Backup Server Actions", () => {
  beforeEach(() => {
    resetAllMocks();
    mockIsAdmin.mockResolvedValue(false);
    mockLogAudit.mockResolvedValue(undefined);
    mockGetSettings.mockResolvedValue({});
    mockResticAvailable.mockResolvedValue({ available: true, version: "restic 0.16.0", error: null });
    mockResticBackup.mockResolvedValue({ success: true, snapshotId: "abc123def456", message: "ok" });
    mockResticCheck.mockResolvedValue({ success: true, message: "ok" });
    mockResticInit.mockResolvedValue({ success: true, message: "init ok" });
    mockResticSnapshots.mockResolvedValue([]);
    mockResticForget.mockResolvedValue({ success: true, message: "ok" });
    mockResticRestore.mockResolvedValue({ success: true, message: "ok" });
    mockRevalidatePath.mockReturnValue(undefined);
    mockRevalidateTag.mockReturnValue(undefined);
    mockRearmScheduler.mockResolvedValue(undefined);
    mockDropByPrefix.mockReturnValue(undefined);
    mockBroadcast.mockResolvedValue(undefined);
    mockGetCurrentUser.mockResolvedValue({ username: "admin" });
    mockFs.readFile.mockResolvedValue("{}");
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.access.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.rename.mockResolvedValue(undefined);
    mockFs.rm.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({ isDirectory: () => true });
  });

  describe("getBackupConfig", () => {
    it("should deny non-admin users", async () => {
      mockIsAdmin.mockResolvedValue(false);
      const result = await getBackupConfig();
      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("should return sanitised config with masked secrets for admin", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockGetSettings.mockResolvedValue({
        backup: {
          enabled: true, endpoint: "https://s3.amazonaws.com", bucket: "bkt", region: "us-east-1",
          prefix: "jotty", accessKey: "AKIAxxx", secretKey: "supersecret", repoPassword: "repopw",
          schedule: "daily", keepDaily: 7, keepWeekly: 4,
        },
      });
      const result = await getBackupConfig();
      expect(result.success).toBe(true);
      const data = result.data!;
      expect(data.endpoint).toBe("https://s3.amazonaws.com");
      expect(data.hasSecretKey).toBe(true);
      expect(data.hasRepoPassword).toBe(true);
      expect(data.accessKey).toBe("••••••••");
    });

    it("should return defaults when no backup config is persisted", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockGetSettings.mockResolvedValue({});
      const result = await getBackupConfig();
      expect(result.success).toBe(true);
      expect(result.data!.enabled).toBe(false);
      expect(result.data!.schedule).toBe("disabled");
      expect(result.data!.hasSecretKey).toBe(false);
    });
  });

  describe("saveBackupConfig", () => {
    it("should deny non-admin users and log audit", async () => {
      mockIsAdmin.mockResolvedValue(false);
      const result = await saveBackupConfig({ endpoint: "http://x" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Admin access required");
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "backup_config_updated", success: false }),
      );
    });

    it("should merge patch and preserve existing secrets when mask is submitted", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockGetSettings.mockResolvedValue({
        backup: {
          enabled: false, endpoint: "old", bucket: "old-bucket", region: "", prefix: "jotty",
          accessKey: "AKIAold", secretKey: "OLD_SECRET", repoPassword: "OLD_REPO_PW",
          schedule: "disabled", keepDaily: 7, keepWeekly: 4,
        },
      });
      const result = await saveBackupConfig({
        enabled: true, endpoint: "new", bucket: "new-bucket",
        secretKey: "••••••••", repoPassword: "",
      });
      expect(result.success).toBe(true);
      const data = result.data!;
      expect(data.endpoint).toBe("new");
      expect(data.bucket).toBe("new-bucket");
      expect(data.secretKey).toBe("OLD_SECRET");
      expect(data.repoPassword).toBe("OLD_REPO_PW");
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(mockRearmScheduler).toHaveBeenCalled();
    });

    it("should accept a new secret when a real value is submitted", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockGetSettings.mockResolvedValue({
        backup: {
          enabled: false, endpoint: "old", bucket: "old", region: "", prefix: "jotty",
          accessKey: "AKIAold", secretKey: "OLD", repoPassword: "OLD", schedule: "disabled",
          keepDaily: 7, keepWeekly: 4,
        },
      });
      const result = await saveBackupConfig({ secretKey: "NEW_SECRET" });
      expect(result.success).toBe(true);
      expect(result.data!.secretKey).toBe("NEW_SECRET");
    });
  });

  describe("getBackupStatus", () => {
    it("should deny non-admin users", async () => {
      mockIsAdmin.mockResolvedValue(false);
      const result = await getBackupStatus();
      expect(result.success).toBe(false);
    });

    it("should return status with fresh restic availability for admin", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        lastRun: "2024-01-01T00:00:00.000Z",
        lastSuccess: "2024-01-01T00:00:00.000Z",
        snapshotCount: 3,
      }));
      mockResticAvailable.mockResolvedValue({ available: true, version: "restic 0.16.0", error: null });
      const result = await getBackupStatus();
      expect(result.success).toBe(true);
      expect(result.data!.resticAvailable).toBe(true);
      expect(result.data!.resticVersion).toBe("restic 0.16.0");
      expect(result.data!.snapshotCount).toBe(3);
    });
  });

  describe("runBackupNow", () => {
    it("should deny non-admin users", async () => {
      mockIsAdmin.mockResolvedValue(false);
      const result = await runBackupNow();
      expect(result.success).toBe(false);
      expect(result.error).toContain("Admin access required");
    });

    it("should error when repository not configured", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockGetSettings.mockResolvedValue({});
      const result = await runBackupNow();
      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
    });

    it("should error when restic is not available", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockGetSettings.mockResolvedValue({
        backup: {
          enabled: true, endpoint: "http://x", bucket: "b", region: "", prefix: "jotty",
          accessKey: "a", secretKey: "s", repoPassword: "pw", schedule: "daily",
          keepDaily: 7, keepWeekly: 4,
        },
      });
      mockResticAvailable.mockResolvedValue({ available: false, version: null, error: "not found" });
      const result = await runBackupNow();
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should run backup and record success", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockGetSettings.mockResolvedValue({
        backup: {
          enabled: true, endpoint: "http://x", bucket: "b", region: "", prefix: "jotty",
          accessKey: "a", secretKey: "s", repoPassword: "pw", schedule: "daily",
          keepDaily: 7, keepWeekly: 4,
        },
      });
      mockResticBackup.mockResolvedValue({ success: true, snapshotId: "snap123", message: "ok" });
      mockResticSnapshots.mockResolvedValue([{ id: "snap123", short_id: "snap123", time: "t", paths: [], hostname: "", username: "", tags: [] }]);
      const result = await runBackupNow();
      expect(result.success).toBe(true);
      expect(result.data!.snapshotId).toBe("snap123");
      expect(mockResticForget).toHaveBeenCalled();
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "backup_created", success: true }),
      );
    });

    it("should record failure when restic backup fails", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockGetSettings.mockResolvedValue({
        backup: {
          enabled: true, endpoint: "http://x", bucket: "b", region: "", prefix: "jotty",
          accessKey: "a", secretKey: "s", repoPassword: "pw", schedule: "daily",
          keepDaily: 7, keepWeekly: 4,
        },
      });
      mockResticBackup.mockResolvedValue({ success: false, snapshotId: null, message: "boom" });
      const result = await runBackupNow();
      expect(result.success).toBe(false);
      expect(result.error).toBe("boom");
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "backup_failed", success: false }),
      );
    });
  });

  describe("listSnapshots", () => {
    it("should deny non-admin users", async () => {
      mockIsAdmin.mockResolvedValue(false);
      const result = await listSnapshots();
      expect(result.success).toBe(false);
    });

    it("should return empty array when repository not configured", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockGetSettings.mockResolvedValue({});
      const result = await listSnapshots();
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("should return snapshots for admin", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockGetSettings.mockResolvedValue({
        backup: {
          enabled: true, endpoint: "http://x", bucket: "b", region: "", prefix: "jotty",
          accessKey: "a", secretKey: "s", repoPassword: "pw", schedule: "daily",
          keepDaily: 7, keepWeekly: 4,
        },
      });
      mockResticSnapshots.mockResolvedValue([
        { id: "s1", short_id: "s1", time: "2024-01-01", paths: ["/data"], hostname: "h", username: "u", tags: [] },
      ]);
      const result = await listSnapshots();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe("checkRepository", () => {
    it("should deny non-admin users", async () => {
      mockIsAdmin.mockResolvedValue(false);
      const result = await checkRepository();
      expect(result.success).toBe(false);
    });

    it("should error when endpoint/bucket missing", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockGetSettings.mockResolvedValue({});
      const result = await checkRepository();
      expect(result.success).toBe(false);
      expect(result.error).toContain("endpoint and bucket");
    });

    it("should init then check and return success", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockGetSettings.mockResolvedValue({
        backup: {
          enabled: true, endpoint: "http://x", bucket: "b", region: "", prefix: "jotty",
          accessKey: "a", secretKey: "s", repoPassword: "pw", schedule: "daily",
          keepDaily: 7, keepWeekly: 4,
        },
      });
      mockResticInit.mockResolvedValue({ success: true, message: "init ok" });
      mockResticCheck.mockResolvedValue({ success: true, message: "check ok" });
      const result = await checkRepository();
      expect(result.success).toBe(true);
      expect(mockResticInit).toHaveBeenCalled();
      expect(mockResticCheck).toHaveBeenCalled();
    });

    it("should return failure when check fails", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockGetSettings.mockResolvedValue({
        backup: {
          enabled: true, endpoint: "http://x", bucket: "b", region: "", prefix: "jotty",
          accessKey: "a", secretKey: "s", repoPassword: "pw", schedule: "daily",
          keepDaily: 7, keepWeekly: 4,
        },
      });
      mockResticInit.mockResolvedValue({ success: true, message: "init ok" });
      mockResticCheck.mockResolvedValue({ success: false, message: "check failed" });
      const result = await checkRepository();
      expect(result.success).toBe(false);
      expect(result.error).toBe("check failed");
    });
  });

  describe("restoreBackup", () => {
    it("should deny non-admin users", async () => {
      mockIsAdmin.mockResolvedValue(false);
      const result = await restoreBackup("snap1");
      expect(result.success).toBe(false);
    });

    it("should error when snapshot id is empty", async () => {
      mockIsAdmin.mockResolvedValue(true);
      const result = await restoreBackup("");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Snapshot id");
    });

    it("should perform safe-swap restore and return rollback dir name", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockGetSettings.mockResolvedValue({
        backup: {
          enabled: true, endpoint: "http://x", bucket: "b", region: "", prefix: "jotty",
          accessKey: "a", secretKey: "s", repoPassword: "pw", schedule: "daily",
          keepDaily: 7, keepWeekly: 4,
        },
      });
      mockResticRestore.mockResolvedValue({ success: true, message: "ok" });
      mockFs.access.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);
      mockFs.rm.mockResolvedValue(undefined);
      const result = await restoreBackup("snap123abc");
      expect(result.success).toBe(true);
      expect(result.data!.rollbackDir).toMatch(/^data\.pre-restore-/);
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "backup_restored", success: true }),
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("backup-status.json"),
        expect.any(String),
        "utf-8",
      );
      expect(mockRearmScheduler).toHaveBeenCalled();
      expect(mockDropByPrefix).toHaveBeenCalledWith("checklists-meta:");
      expect(mockDropByPrefix).toHaveBeenCalledWith("notes-meta:");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/admin");
      expect(mockRevalidateTag).toHaveBeenCalledWith("layout-notes", { expire: 0 });
      expect(mockRevalidateTag).toHaveBeenCalledWith("layout-checklists", { expire: 0 });
      expect(mockBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({ type: "settings", action: "updated" }),
      );
    });

    it("should fail and log when restored content has no data dir", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockGetSettings.mockResolvedValue({
        backup: {
          enabled: true, endpoint: "http://x", bucket: "b", region: "", prefix: "jotty",
          accessKey: "a", secretKey: "s", repoPassword: "pw", schedule: "daily",
          keepDaily: 7, keepWeekly: 4,
        },
      });
      mockResticRestore.mockResolvedValue({ success: true, message: "ok" });
      mockFs.access.mockRejectedValue(new Error("ENOENT"));
      const result = await restoreBackup("snap123abc");
      expect(result.success).toBe(false);
      expect(result.error).toContain("data");
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "backup_restored", success: false }),
      );
    });

    it("should preserve backup status across the data swap", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockGetSettings.mockResolvedValue({
        backup: {
          enabled: true, endpoint: "http://x", bucket: "b", region: "", prefix: "jotty",
          accessKey: "a", secretKey: "s", repoPassword: "pw", schedule: "daily",
          keepDaily: 7, keepWeekly: 4,
        },
      });
      const preRestoreStatus = {
        lastRun: "2024-01-01T00:00:00.000Z",
        lastSuccess: "2024-01-01T00:00:00.000Z",
        lastError: null,
        lastSnapshotId: "oldsnap123",
        snapshotCount: 5,
        nextRun: "2024-01-02T00:00:00.000Z",
        schedulerRunning: true,
        resticAvailable: true,
        resticVersion: "restic 0.16.0",
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(preRestoreStatus));
      mockResticSnapshots.mockResolvedValue([
        { id: "s1", short_id: "s1", time: "2024-01-01", paths: [], hostname: "", username: "", tags: [] },
        { id: "s2", short_id: "s2", time: "2024-01-01", paths: [], hostname: "", username: "", tags: [] },
      ]);
      mockResticRestore.mockResolvedValue({ success: true, message: "ok" });
      mockFs.access.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);
      mockFs.rm.mockResolvedValue(undefined);

      const result = await restoreBackup("snap123abc");
      expect(result.success).toBe(true);

      const writeCall = mockFs.writeFile.mock.calls.find(
        (c: any[]) => typeof c[0] === "string" && c[0].includes("backup-status.json"),
      );
      expect(writeCall).toBeDefined();
      const written = JSON.parse(writeCall![1] as string);
      expect(written.lastSuccess).toBe(preRestoreStatus.lastSuccess);
      expect(written.lastSnapshotId).toBe(preRestoreStatus.lastSnapshotId);
      expect(written.schedulerRunning).toBe(true);
      expect(written.snapshotCount).toBe(2);
      expect(written.lastError).toBeNull();
      expect(written.lastRun).not.toBe(preRestoreStatus.lastRun);
    });
  });
});
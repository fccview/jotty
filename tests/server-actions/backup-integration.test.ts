import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

const canRun = (() => {
  try {
    const { execSync: es } = require("child_process");
    es("docker --version", { stdio: "pipe", timeout: 10_000 });
    es("restic version", { stdio: "pipe", timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
})();

let resticModule: typeof import("@/app/_server/actions/backup/restic") | null = null;

const MINIO_URL = "http://localhost:9000";
const MINIO_USER = "minioadmin";
const MINIO_PASS = "minioadmin";
const BUCKET = "jotty-backup-test";
const REPO_PASSWORD = "test-repo-password-123";
const dockerComposeFile = path.join(process.cwd(), "docker-compose.test.yml");

async function run(cmd: string, opts?: { env?: NodeJS.ProcessEnv; timeout?: number }) {
  return execAsync(cmd, {
    timeout: opts?.timeout ?? 60_000,
    env: { ...process.env, ...(opts?.env || {}) },
  });
}

async function startMinio() {
  await run(`docker compose -f ${dockerComposeFile} up -d minio`, { timeout: 30_000 });
  let ready = false;
  for (let i = 0; i < 30 && !ready; i++) {
    try {
      await run(`curl -s -o /dev/null ${MINIO_URL}/minio/health/live`);
      ready = true;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  if (!ready) throw new Error("MinIO did not become ready in time");
}

async function stopMinio() {
  try {
    await run(`docker compose -f ${dockerComposeFile} down -v`, { timeout: 30_000 });
  } catch {
  }
}

describe.skipIf(!canRun)("backup integration (restic + MinIO)", () => {
  let tempDataDir: string;
  let backupConfig: any;

  beforeAll(async () => {
    await startMinio();
    resticModule = await import("@/app/_server/actions/backup/restic");

    tempDataDir = path.join(os.tmpdir(), `jotty-backup-test-${Date.now()}`);
    await fs.mkdir(path.join(tempDataDir, "data"), { recursive: true });
    await fs.writeFile(path.join(tempDataDir, "data", "test.md"), "# Test backup content\nHello restic!\n");
    await fs.mkdir(path.join(tempDataDir, "data", "notes"), { recursive: true });
    await fs.writeFile(path.join(tempDataDir, "data", "notes", "note1.md"), "# Note 1\nContent here.\n");

    backupConfig = {
      enabled: true,
      endpoint: MINIO_URL,
      bucket: BUCKET,
      region: "us-east-1",
      prefix: "jotty-test",
      accessKey: MINIO_USER,
      secretKey: MINIO_PASS,
      repoPassword: REPO_PASSWORD,
      schedule: "disabled" as const,
      keepDaily: 3,
      keepWeekly: 1,
    };
  }, 120_000);

  afterAll(async () => {
    await stopMinio();
    if (tempDataDir) {
      try { await fs.rm(tempDataDir, { recursive: true, force: true }); } catch {}
    }
  }, 30_000);

  it("should detect restic as available", async () => {
    const avail = await resticModule!.resticAvailable();
    expect(avail.available).toBe(true);
    expect(avail.version).toContain("restic");
  });

  it("should init the repository in MinIO", async () => {
    const result = await resticModule!.resticInit(backupConfig);
    expect(result.success).toBe(true);
  }, 60_000);

  it("should run a backup and produce a snapshot", async () => {
    const result = await resticModule!.resticBackup(backupConfig, path.join(tempDataDir, "data"));
    expect(result.success).toBe(true);
    expect(result.snapshotId).toBeTruthy();
  }, 120_000);

  it("should list snapshots with at least one entry", async () => {
    const snapshots = await resticModule!.resticSnapshots(backupConfig);
    expect(snapshots.length).toBeGreaterThanOrEqual(1);
    expect(snapshots[0].id).toBeTruthy();
    expect(snapshots[0].paths.length).toBeGreaterThan(0);
  }, 30_000);

  it("should check repository integrity", async () => {
    const result = await resticModule!.resticCheck(backupConfig);
    expect(result.success).toBe(true);
  }, 60_000);

  it("should restore a snapshot to a temp dir and verify content", async () => {
    const snapshots = await resticModule!.resticSnapshots(backupConfig);
    expect(snapshots.length).toBeGreaterThan(0);
    const snapId = snapshots[0].id;

    const restoreDir = path.join(os.tmpdir(), `jotty-restore-${Date.now()}`);
    await fs.mkdir(restoreDir, { recursive: true });

    const result = await resticModule!.resticRestore(backupConfig, snapId, restoreDir);
    expect(result.success).toBe(true);

    const restoredFile = path.join(restoreDir, "data", "test.md");
    const content = await fs.readFile(restoredFile, "utf-8");
    expect(content).toContain("Hello restic!");

    const restoredNote = path.join(restoreDir, "data", "notes", "note1.md");
    const noteContent = await fs.readFile(restoredNote, "utf-8");
    expect(noteContent).toContain("Note 1");

    await fs.rm(restoreDir, { recursive: true, force: true });
  }, 120_000);

  it("should run a second backup (incremental) and list two snapshots", async () => {
    await fs.appendFile(
      path.join(tempDataDir, "data", "test.md"),
      "\nAppended line for incremental backup.\n",
    );
    const result = await resticModule!.resticBackup(backupConfig, path.join(tempDataDir, "data"));
    expect(result.success).toBe(true);
    const snapshots = await resticModule!.resticSnapshots(backupConfig);
    expect(snapshots.length).toBeGreaterThanOrEqual(2);
  }, 120_000);

  it("should apply retention policy without error", async () => {
    const result = await resticModule!.resticForget(backupConfig, 3, 1);
    expect(result.success).toBe(true);
  }, 120_000);
});
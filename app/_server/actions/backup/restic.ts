import { spawn } from "child_process";
import path from "path";
import {
  BackupConfig,
  BackupSnapshot,
  DEFAULT_BACKUP_CONFIG,
} from "@/app/_types/backup";
import {
  RESTIC_BIN_DEFAULT,
  RESTIC_BIN_ENV,
} from "@/app/_consts/backup";

const spawnPromise = (
  bin: string,
  args: string[],
  opts: { env: NodeJS.ProcessEnv; timeoutMs: number; cwd?: string },
): Promise<{ stdout: string; stderr: string }> => {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      env: opts.env,
      stdio: ["ignore", "pipe", "pipe"],
      ...(opts.cwd ? { cwd: opts.cwd } : {}),
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (err?: Error & { code?: string; stdout?: string; stderr?: string }) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      const stdout = Buffer.concat(stdoutChunks).toString("utf-8");
      const stderr = Buffer.concat(stderrChunks).toString("utf-8");
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    };

    child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    child.on("error", (err: Error & { code?: string }) => {
      finish(err);
    });

    child.on("close", (code: number | null) => {
      if (code === 0) {
        finish();
      } else {
        const err = new Error(
          `restic exited with code ${code}`,
        ) as Error & { code?: string; stdout?: string; stderr?: string };
        finish(err);
      }
    });

    if (opts.timeoutMs > 0) {
      timer = setTimeout(() => {
        try { child.kill("SIGKILL"); } catch { /* already dead */ }
        const err = new Error(
          `restic timed out after ${opts.timeoutMs}ms`,
        ) as Error & { code?: string; stdout?: string; stderr?: string };
        err.code = "ETIMEDOUT";
        finish(err);
      }, opts.timeoutMs);
    }
  });
};

export const getResticBin = (): string => {
  return process.env[RESTIC_BIN_ENV] || RESTIC_BIN_DEFAULT;
};

export interface ResticAvailability {
  available: boolean;
  version: string | null;
  error: string | null;
}

export const resticAvailable = async (): Promise<ResticAvailability> => {
  const bin = getResticBin();
  try {
    const { stdout } = await spawnPromise(bin, ["version"], {
      env: process.env,
      timeoutMs: 10_000,
    });
    const firstLine = stdout.trim().split("\n")[0];
    return { available: true, version: firstLine, error: null };
  } catch (err: any) {
    const code = err?.code;
    if (code === "ENOENT") {
      return {
        available: false,
        version: null,
        error: `restic binary not found (looked for "${bin}"). Install restic or set ${RESTIC_BIN_ENV}.`,
      };
    }
    return {
      available: false,
      version: null,
      error: err?.message || "Failed to run restic",
    };
  }
};

export const buildRepository = (config: BackupConfig): string => {
  const schemeMatch = config.endpoint.match(/^(https?:)\/\//);
  const scheme = schemeMatch ? schemeMatch[1] : "";
  const endpoint = config.endpoint
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const prefix = config.prefix.replace(/^\/+|\/+$/g, "");
  const bucket = config.bucket.replace(/^\/+|\/+$/g, "");
  const repoPath = prefix
    ? `${endpoint}/${bucket}/${prefix}`
    : `${endpoint}/${bucket}`;
  return scheme
    ? `s3:${scheme}//${repoPath}`
    : `s3:${repoPath}`;
};

export const buildResticEnv = (
  config: BackupConfig,
  inherit: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv => ({
  ...inherit,
  AWS_ACCESS_KEY_ID: config.accessKey,
  AWS_SECRET_ACCESS_KEY: config.secretKey,
  RESTIC_REPOSITORY: buildRepository(config),
  RESTIC_PASSWORD: config.repoPassword,
  AWS_REGION: config.region || "us-east-1",
});

const runRestic = async <T = string>(
  args: string[],
  config: BackupConfig,
  opts: { json?: boolean; timeoutMs?: number; cwd?: string } = {},
): Promise<T> => {
  const bin = getResticBin();
  const env = buildResticEnv(config);
  const finalArgs = opts.json ? [...args, "--json"] : args;
  const { stdout } = await spawnPromise(bin, finalArgs, {
    env,
    timeoutMs: opts.timeoutMs ?? 120_000,
    ...(opts.cwd ? { cwd: opts.cwd } : {}),
  });
  if (!opts.json) return stdout as unknown as T;
  try {
    return JSON.parse(stdout) as T;
  } catch {
    return stdout as unknown as T;
  }
};

export const withDefaults = (config: Partial<BackupConfig> | undefined): BackupConfig => ({
  ...DEFAULT_BACKUP_CONFIG,
  ...(config || {}),
});

export const resticInit = async (
  config: BackupConfig,
): Promise<{ success: boolean; message: string }> => {
  try {
    await runRestic(["init"], config, { timeoutMs: 60_000 });
    return { success: true, message: "Repository initialised" };
  } catch (err: any) {
    const stderr = String(err?.stderr || err?.message || "");
    if (/already|exists|config file/i.test(stderr)) {
      return { success: true, message: "Repository already initialised" };
    }
    return {
      success: false,
      message: stderr || "Failed to initialise repository",
    };
  }
};

export const resticCheck = async (
  config: BackupConfig,
): Promise<{ success: boolean; message: string }> => {
  try {
    await runRestic(["check"], config, { timeoutMs: 120_000 });
    return { success: true, message: "Repository check passed" };
  } catch (err: any) {
    return {
      success: false,
      message: String(err?.stderr || err?.message || "Repository check failed"),
    };
  }
};

interface ResticBackupOutput {
  message_type: string;
  snapshot_id?: string;
  files_new?: number;
  files_changed?: number;
  data_added_b?: number;
  summary?: {
    snapshot_id?: string;
    files_new?: number;
    files_changed?: number;
    data_added_b?: number;
  };
}

export const resticBackup = async (
  config: BackupConfig,
  sourceDir: string,
): Promise<{ success: boolean; snapshotId: string | null; message: string }> => {
  try {
    const parentDir = path.dirname(sourceDir);
    const baseName = path.basename(sourceDir);
    const result = await runRestic<ResticBackupOutput>(
      ["backup", baseName],
      config,
      { json: true, timeoutMs: 30 * 60 * 1000, cwd: parentDir },
    );
    const snapshotId =
      result.snapshot_id || result.summary?.snapshot_id || null;
    return {
      success: true,
      snapshotId,
      message: snapshotId
        ? `Backup completed (snapshot ${snapshotId.slice(0, 8)})`
        : "Backup completed",
    };
  } catch (err: any) {
    return {
      success: false,
      snapshotId: null,
      message: String(err?.stderr || err?.message || "Backup failed"),
    };
  }
};

interface ResticSnapshotRaw {
  id?: string;
  short_id?: string;
  time?: string;
  paths?: string[];
  hostname?: string;
  username?: string;
  tags?: string[];
}

export const resticSnapshots = async (
  config: BackupConfig,
): Promise<BackupSnapshot[]> => {
  try {
    const raw = await runRestic<ResticSnapshotRaw[]>(
      ["snapshots"],
      config,
      { json: true, timeoutMs: 30_000 },
    );
    if (!Array.isArray(raw)) return [];
    return raw
      .map((s) => ({
        id: s.id || "",
        short_id: s.short_id || "",
        time: s.time || "",
        paths: s.paths || [],
        hostname: s.hostname || "",
        username: s.username || "",
        tags: s.tags || [],
      }))
      .sort((a, b) => (a.time < b.time ? 1 : -1));
  } catch {
    return [];
  }
};

export const resticForget = async (
  config: BackupConfig,
  keepDaily: number,
  keepWeekly: number,
): Promise<{ success: boolean; message: string }> => {
  if (keepDaily <= 0 && keepWeekly <= 0) {
    return { success: true, message: "Retention disabled" };
  }
  const args: string[] = ["forget"];
  if (keepDaily > 0) args.push("--keep-daily", String(keepDaily));
  if (keepWeekly > 0) args.push("--keep-weekly", String(keepWeekly));
  args.push("--prune");
  try {
    await runRestic(args, config, { timeoutMs: 5 * 60 * 1000 });
    return { success: true, message: "Retention applied" };
  } catch (err: any) {
    return {
      success: false,
      message: String(err?.stderr || err?.message || "Retention failed"),
    };
  }
};

export const resticRestore = async (
  config: BackupConfig,
  snapshotId: string,
  targetDir: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    await runRestic(
      ["restore", snapshotId, "--target", targetDir],
      config,
      { timeoutMs: 30 * 60 * 1000 },
    );
    return { success: true, message: `Restored ${snapshotId.slice(0, 8)} to ${targetDir}` };
  } catch (err: any) {
    return {
      success: false,
      message: String(err?.stderr || err?.message || "Restore failed"),
    };
  }
};

export const resolveRestoreTarget = (baseDir: string): string =>
  path.isAbsolute(baseDir) ? baseDir : path.join(process.cwd(), baseDir);
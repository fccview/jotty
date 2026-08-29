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

/**
 * Spawn a process and collect stdout/stderr into strings, resolving when the
 * process exits. We use `spawn` (not `execFile`) because `execFile`/`promisify`
 * has been observed to hang indefinitely on some platforms when the child
 * process writes to stdout while also holding an open network socket — the
 * pipe never appears to drain. `spawn` with explicit stream listeners avoids
 * this entirely and works consistently across macOS, Linux, and Docker.
 *
 * On error (non-zero exit, spawn failure, or timeout) we reject with an object
 * that includes `stdout`, `stderr`, and `message`, mirroring the shape that
 * callers previously destructured from `execFile` errors.
 */
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
      // ENOENT means the binary wasn't found — preserve that code for callers.
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

/**
 * Resolve the restic binary path. The admin can override via the `RESTIC_BIN`
 * env var (handy for Docker images that ship restic in a custom location);
 * otherwise we fall back to `restic` resolved against PATH.
 */
export const getResticBin = (): string => {
  return process.env[RESTIC_BIN_ENV] || RESTIC_BIN_DEFAULT;
};

/** Outcome of a restic availability probe. */
export interface ResticAvailability {
  available: boolean;
  version: string | null;
  error: string | null;
}

/**
 * Probe whether restic is installed and runnable. Returns the version string
 * when found so the UI can display it. Never throws — the caller decides what
 * to do with an unavailable binary.
 */
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

/**
 * Build the restic repository string in the S3 format restic expects:
 * `s3:<scheme>://<endpoint>/<bucket>/<prefix>`. The endpoint may or may not
 * include a scheme; we preserve it so restic uses the correct protocol (HTTP
 * for local MinIO, HTTPS for cloud S3). Without a scheme restic defaults to
 * HTTPS, which breaks against plain-HTTP endpoints like a local MinIO.
 * We normalise to ensure exactly one `s3:` prefix and no double slashes.
 */
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

/**
 * Build the environment for a restic invocation. We merge the inherited env
 * (so PATH etc. still work) with the S3 + repo credentials. Keeping this in
 * one place means every restic call uses identical auth wiring.
 */
export const buildResticEnv = (
  config: BackupConfig,
  inherit: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv => ({
  ...inherit,
  AWS_ACCESS_KEY_ID: config.accessKey,
  AWS_SECRET_ACCESS_KEY: config.secretKey,
  RESTIC_REPOSITORY: buildRepository(config),
  RESTIC_PASSWORD: config.repoPassword,
  // S3-compatible providers often need the region set; default to "us-east-1".
  AWS_REGION: config.region || "us-east-1",
});

/** Run a restic subcommand and return stdout (parsed as JSON when requested). */
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
    // restic sometimes prints warnings before the JSON; fall back to raw.
    return stdout as unknown as T;
  }
};

/** Merge partial config onto defaults so missing fields don't crash restic. */
export const withDefaults = (config: Partial<BackupConfig> | undefined): BackupConfig => ({
  ...DEFAULT_BACKUP_CONFIG,
  ...(config || {}),
});

/**
 * Initialise a new restic repository (`restic init`). Idempotent in practice —
 * restic returns a non-zero exit if the repo already exists, which we treat as
 * success since the repo is usable either way.
 */
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

/**
 * Check repository integrity (`restic check`). Used by the "Test connection"
 * button to verify credentials + connectivity.
 */
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

/** Parsed `restic backup` JSON output (subset of fields we use). */
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

/**
 * Run a backup of `sourceDir` into the configured repository. Returns the new
 * snapshot id on success.
 *
 * We set restic's working directory to the *parent* of `sourceDir` and pass
 * only the basename (e.g. `data`) as the backup target. This is critical for
 * restore: restic preserves the path you give it in the snapshot. If we pass
 * an absolute path like `/app/data`, restic recreates the entire `/app/data`
 * tree inside the restore target. By using a relative path (`data`), the
 * snapshot root is `data/`, so restoring puts the contents directly into the
 * target directory — which is what the safe-swap restore logic expects.
 */
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

/** Raw shape of a `restic snapshots --json` entry. */
interface ResticSnapshotRaw {
  id?: string;
  short_id?: string;
  time?: string;
  paths?: string[];
  hostname?: string;
  username?: string;
  tags?: string[];
}

/**
 * List snapshots in the repository, newest first. Returns an empty array if the
 * repo is empty (restic returns `[]` in that case) or on a read error.
 */
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

/**
 * Apply retention policy via `restic forget`. Only prunes when at least one
 * keep flag is set. Errors are non-fatal (they don't invalidate the backup).
 */
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

/**
 * Restore a snapshot into `targetDir`. Since `resticBackup` uses a relative
 * path (cwd = parent, target = `data`), the snapshot root is `data/`, so restic
 * recreates `data/` inside the target: `<targetDir>/data/...`. The caller
 * validates and swaps the restored `data/` into place.
 */
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

/** Convenience: return the absolute path restic would restore into. */
export const resolveRestoreTarget = (baseDir: string): string =>
  path.isAbsolute(baseDir) ? baseDir : path.join(process.cwd(), baseDir);
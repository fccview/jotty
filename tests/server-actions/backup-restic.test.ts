import { describe, it, expect, beforeEach, vi } from "vitest";

// We only unit-test the pure helpers here (buildRepository, buildResticEnv,
// withDefaults, getResticBin). The subprocess-backed functions are exercised
// end-to-end against a real MinIO + restic in the integration test.

import {
  buildRepository,
  buildResticEnv,
  withDefaults,
  getResticBin,
} from "@/app/_server/actions/backup/restic";
import { DEFAULT_BACKUP_CONFIG } from "@/app/_types/backup";

describe("backup/restic helpers", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("getResticBin", () => {
    it("returns the RESTIC_BIN env override when set", async () => {
      process.env.RESTIC_BIN = "/usr/local/bin/restic-custom";
      expect(getResticBin()).toBe("/usr/local/bin/restic-custom");
      delete process.env.RESTIC_BIN;
    });

    it("falls back to 'restic' when no override is set", () => {
      delete process.env.RESTIC_BIN;
      expect(getResticBin()).toBe("restic");
    });
  });

  describe("buildRepository", () => {
    it("builds an s3: repo string with prefix, preserving the scheme", () => {
      const repo = buildRepository({
        ...DEFAULT_BACKUP_CONFIG,
        endpoint: "https://s3.amazonaws.com",
        bucket: "my-bucket",
        prefix: "jotty",
      });
      expect(repo).toBe("s3:https://s3.amazonaws.com/my-bucket/jotty");
    });

    it("omits the prefix segment when prefix is empty", () => {
      const repo = buildRepository({
        ...DEFAULT_BACKUP_CONFIG,
        endpoint: "https://s3.amazonaws.com",
        bucket: "my-bucket",
        prefix: "",
      });
      expect(repo).toBe("s3:https://s3.amazonaws.com/my-bucket");
    });

    it("strips a trailing slash from the endpoint", () => {
      const repo = buildRepository({
        ...DEFAULT_BACKUP_CONFIG,
        endpoint: "https://s3.amazonaws.com/",
        bucket: "my-bucket",
        prefix: "jotty",
      });
      expect(repo).toBe("s3:https://s3.amazonaws.com/my-bucket/jotty");
    });

    it("strips leading/trailing slashes from bucket and prefix", () => {
      const repo = buildRepository({
        ...DEFAULT_BACKUP_CONFIG,
        endpoint: "https://s3.amazonaws.com",
        bucket: "/my-bucket/",
        prefix: "/jotty/",
      });
      expect(repo).toBe("s3:https://s3.amazonaws.com/my-bucket/jotty");
    });

    it("handles a MinIO endpoint with port and http scheme", () => {
      const repo = buildRepository({
        ...DEFAULT_BACKUP_CONFIG,
        endpoint: "http://localhost:9000",
        bucket: "backups",
        prefix: "jotty",
      });
      expect(repo).toBe("s3:http://localhost:9000/backups/jotty");
    });

    it("preserves an http scheme for local MinIO (not defaulting to HTTPS)", () => {
      const repo = buildRepository({
        ...DEFAULT_BACKUP_CONFIG,
        endpoint: "http://minio:9000",
        bucket: "backups",
        prefix: "jotty",
      });
      expect(repo).toBe("s3:http://minio:9000/backups/jotty");
    });

    it("falls back to schemeless s3: when endpoint has no scheme", () => {
      const repo = buildRepository({
        ...DEFAULT_BACKUP_CONFIG,
        endpoint: "s3.amazonaws.com",
        bucket: "my-bucket",
        prefix: "jotty",
      });
      expect(repo).toBe("s3:s3.amazonaws.com/my-bucket/jotty");
    });
  });

  describe("buildResticEnv", () => {
    it("sets AWS + RESTIC env vars from the config", () => {
      const env = buildResticEnv(
        {
          ...DEFAULT_BACKUP_CONFIG,
          endpoint: "https://s3.amazonaws.com",
          bucket: "bkt",
          prefix: "jotty",
          accessKey: "AKIA...",
          secretKey: "SHHH",
          repoPassword: "repo-pw",
          region: "eu-west-1",
        },
        { PATH: "/usr/bin" } as unknown as NodeJS.ProcessEnv,
      );
      expect(env.AWS_ACCESS_KEY_ID).toBe("AKIA...");
      expect(env.AWS_SECRET_ACCESS_KEY).toBe("SHHH");
      expect(env.RESTIC_REPOSITORY).toBe("s3:https://s3.amazonaws.com/bkt/jotty");
      expect(env.RESTIC_PASSWORD).toBe("repo-pw");
      expect(env.AWS_REGION).toBe("eu-west-1");
      // Inherits the provided env too.
      expect(env.PATH).toBe("/usr/bin");
    });

    it("defaults AWS_REGION to us-east-1 when region is empty", () => {
      const env = buildResticEnv(
        { ...DEFAULT_BACKUP_CONFIG, region: "" },
        {} as unknown as NodeJS.ProcessEnv,
      );
      expect(env.AWS_REGION).toBe("us-east-1");
    });
  });

  describe("withDefaults", () => {
    it("returns full defaults for undefined input", () => {
      const result = withDefaults(undefined);
      expect(result).toEqual(DEFAULT_BACKUP_CONFIG);
    });

    it("merges a partial config over defaults", () => {
      const result = withDefaults({ endpoint: "http://x", bucket: "b" });
      expect(result.endpoint).toBe("http://x");
      expect(result.bucket).toBe("b");
      // Untouched fields keep their defaults.
      expect(result.keepDaily).toBe(DEFAULT_BACKUP_CONFIG.keepDaily);
      expect(result.enabled).toBe(false);
    });
  });
});
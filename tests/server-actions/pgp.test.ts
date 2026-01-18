import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockFs, resetAllMocks, createFormData } from "../setup";

const mockGetCurrentUser = vi.fn();
const mockUpdateUserSettings = vi.fn();
const mockServerWriteFile = vi.fn();
const mockServerReadFile = vi.fn();
const mockServerDeleteFile = vi.fn();
const mockEnsureDir = vi.fn();
const mockLogAudit = vi.fn();

vi.mock("@/app/_server/actions/users", () => ({
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
  updateUserSettings: (...args: any[]) => mockUpdateUserSettings(...args),
}));

vi.mock("@/app/_server/actions/file", () => ({
  ensureDir: (...args: any[]) => mockEnsureDir(...args),
  serverWriteFile: (...args: any[]) => mockServerWriteFile(...args),
  serverReadFile: (...args: any[]) => mockServerReadFile(...args),
  serverDeleteFile: (...args: any[]) => mockServerDeleteFile(...args),
}));

vi.mock("@/app/_server/actions/log", () => ({
  logAudit: (...args: any[]) => mockLogAudit(...args),
}));

vi.mock("openpgp", () => ({
  generateKey: vi.fn().mockResolvedValue({
    publicKey:
      "-----BEGIN PGP PUBLIC KEY-----\nmockPublicKey\n-----END PGP PUBLIC KEY-----",
    privateKey:
      "-----BEGIN PGP PRIVATE KEY-----\nmockPrivateKey\n-----END PGP PRIVATE KEY-----",
    revocationCertificate: "mock-revocation",
  }),
  readKey: vi.fn().mockResolvedValue({
    getFingerprint: () => "ABCD1234FINGERPRINT",
    getCreationTime: () => new Date("2024-01-01"),
    getAlgorithmInfo: () => ({ bits: 4096 }),
  }),
  readPrivateKey: vi.fn().mockResolvedValue({}),
  decryptKey: vi.fn().mockResolvedValue({}),
  createMessage: vi.fn().mockResolvedValue({}),
  encrypt: vi
    .fn()
    .mockResolvedValue(
      "-----BEGIN PGP MESSAGE-----\nencrypted\n-----END PGP MESSAGE-----",
    ),
  readMessage: vi.fn().mockResolvedValue({}),
  decrypt: vi
    .fn()
    .mockResolvedValue({ data: "decrypted content", signatures: [] }),
}));

import {
  generateKeyPair,
  importKeys,
  exportKeys,
  getStoredKeys,
  encryptNoteContent,
  decryptNoteContent,
  deleteKeys,
} from "@/app/_server/actions/pgp";

describe("PGP Actions", () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetCurrentUser.mockResolvedValue({ username: "testuser" });
    mockUpdateUserSettings.mockResolvedValue({ success: true });
    mockEnsureDir.mockResolvedValue(undefined);
    mockServerWriteFile.mockResolvedValue(undefined);
    mockServerReadFile.mockResolvedValue("");
    mockServerDeleteFile.mockResolvedValue(undefined);
    mockLogAudit.mockResolvedValue(undefined);
    mockFs.access.mockReset();
  });

  describe("generateKeyPair", () => {
    it("should return error when not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const formData = createFormData({ passphrase: "testpass" });
      const result = await generateKeyPair(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should return error when passphrase is missing", async () => {
      const formData = createFormData({});
      const result = await generateKeyPair(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Passphrase is required");
    });

    it("should generate key pair and save to files", async () => {
      const formData = createFormData({
        passphrase: "secretpassphrase",
        name: "Test User",
        email: "test@example.com",
      });

      const result = await generateKeyPair(formData);

      expect(result.success).toBe(true);
      expect(result.data?.publicKey).toContain("PUBLIC KEY");
      expect(result.data?.privateKey).toContain("PRIVATE KEY");
      expect(result.data?.fingerprint).toBeDefined();
      expect(mockServerWriteFile).toHaveBeenCalledTimes(2);
      expect(mockUpdateUserSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          encryptionSettings: expect.objectContaining({
            hasKeys: true,
          }),
        }),
      );
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "encryption_keys_generated",
          success: true,
        }),
      );
    });
  });

  describe("importKeys", () => {
    it("should return error when not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const formData = createFormData({
        publicKey: "key",
        privateKey: "key",
      });
      const result = await importKeys(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should return error when keys are missing", async () => {
      const formData = createFormData({ publicKey: "only-public" });
      const result = await importKeys(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Both public and private keys are required");
    });

    it("should import valid keys", async () => {
      const formData = createFormData({
        publicKey:
          "-----BEGIN PGP PUBLIC KEY-----\nkey\n-----END PGP PUBLIC KEY-----",
        privateKey:
          "-----BEGIN PGP PRIVATE KEY-----\nkey\n-----END PGP PRIVATE KEY-----",
      });

      const result = await importKeys(formData);

      expect(result.success).toBe(true);
      expect(result.data?.fingerprint).toBeDefined();
      expect(mockServerWriteFile).toHaveBeenCalledTimes(2);
    });
  });

  describe("exportKeys", () => {
    it("should return error when not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const result = await exportKeys("public");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should return public key", async () => {
      mockServerReadFile.mockResolvedValue(
        "-----BEGIN PGP PUBLIC KEY-----\nkey\n-----END PGP PUBLIC KEY-----",
      );

      const result = await exportKeys("public");

      expect(result.success).toBe(true);
      expect(result.data?.key).toContain("PUBLIC KEY");
    });

    it("should return private key", async () => {
      mockServerReadFile.mockResolvedValue(
        "-----BEGIN PGP PRIVATE KEY-----\nkey\n-----END PGP PRIVATE KEY-----",
      );

      const result = await exportKeys("private");

      expect(result.success).toBe(true);
      expect(result.data?.key).toContain("PRIVATE KEY");
    });

    it("should return error when key not found", async () => {
      mockServerReadFile.mockResolvedValue("");

      const result = await exportKeys("public");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("getStoredKeys", () => {
    it("should return error when not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const result = await getStoredKeys();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should return hasKeys false when no keys stored", async () => {
      mockServerReadFile.mockResolvedValue("");

      const result = await getStoredKeys();

      expect(result.success).toBe(true);
      expect(result.data?.hasKeys).toBe(false);
    });

    it("should return key metadata when keys exist", async () => {
      mockServerReadFile.mockResolvedValue(
        "-----BEGIN PGP PUBLIC KEY-----\nkey\n-----END PGP PUBLIC KEY-----",
      );

      const result = await getStoredKeys();

      expect(result.success).toBe(true);
      expect(result.data?.hasKeys).toBe(true);
      expect(result.data?.metadata).toBeDefined();
      expect(result.data?.metadata?.keyFingerprint).toBe("ABCD1234FINGERPRINT");
    });
  });

  describe("encryptNoteContent", () => {
    it("should return error when not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const formData = createFormData({ content: "test" });
      const result = await encryptNoteContent(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should return error when content is missing", async () => {
      const formData = createFormData({});
      const result = await encryptNoteContent(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Content is required");
    });

    it("should encrypt content with stored key", async () => {
      mockServerReadFile.mockResolvedValue(
        "-----BEGIN PGP PUBLIC KEY-----\nkey\n-----END PGP PUBLIC KEY-----",
      );

      const formData = createFormData({
        content: "Secret message",
        useStoredKey: "true",
      });

      const result = await encryptNoteContent(formData);

      expect(result.success).toBe(true);
      expect(result.data?.encryptedContent).toContain("PGP MESSAGE");
    });

    it("should return error when no stored key found", async () => {
      mockServerReadFile.mockResolvedValue("");

      const formData = createFormData({
        content: "Secret message",
        useStoredKey: "true",
      });

      const result = await encryptNoteContent(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("No stored public key found");
    });
  });

  describe("decryptNoteContent", () => {
    it("should return error when not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const formData = createFormData({
        encryptedContent: "encrypted",
        passphrase: "pass",
      });
      const result = await decryptNoteContent(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should return error when encrypted content is missing", async () => {
      const formData = createFormData({ passphrase: "pass" });
      const result = await decryptNoteContent(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Encrypted content is required");
    });

    it("should return error when passphrase is missing", async () => {
      const formData = createFormData({ encryptedContent: "data" });
      const result = await decryptNoteContent(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Passphrase is required");
    });

    it("should decrypt content with stored key", async () => {
      mockServerReadFile.mockResolvedValue(
        "-----BEGIN PGP PRIVATE KEY-----\nkey\n-----END PGP PRIVATE KEY-----",
      );

      const formData = createFormData({
        encryptedContent:
          "-----BEGIN PGP MESSAGE-----\ndata\n-----END PGP MESSAGE-----",
        passphrase: "secretpass",
        useStoredKey: "true",
      });

      const result = await decryptNoteContent(formData);

      expect(result.success).toBe(true);
      expect(result.data?.decryptedContent).toBe("decrypted content");
    });
  });

  describe("deleteKeys", () => {
    it("should return error when not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const result = await deleteKeys();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should delete keys and update settings", async () => {
      const result = await deleteKeys();

      expect(result.success).toBe(true);
      expect(mockServerDeleteFile).toHaveBeenCalledTimes(2);
      expect(mockUpdateUserSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          encryptionSettings: expect.objectContaining({
            hasKeys: false,
          }),
        }),
      );
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "encryption_keys_deleted",
          success: true,
        }),
      );
    });
  });
});

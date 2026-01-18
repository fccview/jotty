import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetAllMocks, createFormData } from "../setup";

const mockLogAudit = vi.fn();

vi.mock("@/app/_server/actions/log", () => ({
  logAudit: (...args: any[]) => mockLogAudit(...args),
}));

vi.mock("libsodium-wrappers-sumo", () => ({
  default: {
    ready: Promise.resolve(),
    randombytes_buf: vi.fn().mockReturnValue(new Uint8Array(24)),
    crypto_pwhash_SALTBYTES: 16,
    crypto_aead_xchacha20poly1305_ietf_KEYBYTES: 32,
    crypto_aead_xchacha20poly1305_ietf_NPUBBYTES: 24,
    crypto_pwhash_OPSLIMIT_INTERACTIVE: 2,
    crypto_pwhash_MEMLIMIT_INTERACTIVE: 67108864,
    crypto_pwhash_ALG_DEFAULT: 2,
    crypto_pwhash: vi.fn().mockReturnValue(new Uint8Array(32)),
    crypto_aead_xchacha20poly1305_ietf_encrypt: vi
      .fn()
      .mockReturnValue(new Uint8Array([1, 2, 3])),
    crypto_aead_xchacha20poly1305_ietf_decrypt: vi
      .fn()
      .mockReturnValue(new Uint8Array([116, 101, 115, 116])),
    to_hex: vi.fn().mockImplementation((arr) =>
      Array.from(arr as Uint8Array)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    ),
    from_hex: vi
      .fn()
      .mockImplementation(
        (hex: string) =>
          new Uint8Array(
            hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [],
          ),
      ),
    to_string: vi.fn().mockReturnValue("decrypted content"),
  },
}));

import { encryptXChaCha, decryptXChaCha } from "@/app/_server/actions/xchacha";

describe("XChaCha Actions", () => {
  beforeEach(() => {
    resetAllMocks();
    mockLogAudit.mockResolvedValue(undefined);
  });

  describe("encryptXChaCha", () => {
    it("should return error when content is missing", async () => {
      const formData = createFormData({ passphrase: "secret" });

      const result = await encryptXChaCha(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Missing data");
    });

    it("should return error when passphrase is missing", async () => {
      const formData = createFormData({ content: "secret content" });

      const result = await encryptXChaCha(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Missing data");
    });

    it("should encrypt content successfully", async () => {
      const formData = createFormData({
        content: "My secret message",
        passphrase: "strongpassword",
      });

      const result = await encryptXChaCha(formData);

      expect(result.success).toBe(true);
      expect(result.data?.encryptedContent).toBeDefined();

      const encrypted = JSON.parse(result.data!.encryptedContent);
      expect(encrypted.alg).toBe("xchacha20");
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.nonce).toBeDefined();
      expect(encrypted.data).toBeDefined();
    });

    it("should log encryption event", async () => {
      const formData = createFormData({
        content: "Secret",
        passphrase: "password",
      });

      await encryptXChaCha(formData);

      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "INFO",
          action: "note_encrypted",
          category: "encryption",
          success: true,
          metadata: { method: "xchacha20" },
        }),
      );
    });

    it("should skip audit log when flag is set", async () => {
      const formData = createFormData({
        content: "Secret",
        passphrase: "password",
        skipAuditLog: "true",
      });

      await encryptXChaCha(formData);

      expect(mockLogAudit).not.toHaveBeenCalled();
    });
  });

  describe("decryptXChaCha", () => {
    it("should return error when encrypted content is missing", async () => {
      const formData = createFormData({ passphrase: "secret" });

      const result = await decryptXChaCha(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Missing data");
    });

    it("should return error when passphrase is missing", async () => {
      const formData = createFormData({
        encryptedContent: '{"alg":"xchacha20"}',
      });

      const result = await decryptXChaCha(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Missing data");
    });

    it("should return error for invalid JSON format", async () => {
      const formData = createFormData({
        encryptedContent: "not-valid-json",
        passphrase: "password",
      });

      const result = await decryptXChaCha(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid encrypted format");
    });

    it("should return error for algorithm mismatch", async () => {
      const formData = createFormData({
        encryptedContent: JSON.stringify({ alg: "aes256" }),
        passphrase: "password",
      });

      const result = await decryptXChaCha(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Algorithm mismatch");
    });

    it("should decrypt content successfully", async () => {
      const encrypted = {
        alg: "xchacha20",
        salt: "00".repeat(16),
        nonce: "00".repeat(24),
        data: "010203",
      };

      const formData = createFormData({
        encryptedContent: JSON.stringify(encrypted),
        passphrase: "correctpassword",
      });

      const result = await decryptXChaCha(formData);

      expect(result.success).toBe(true);
      expect(result.data?.decryptedContent).toBe("decrypted content");
    });
  });

  describe("Encryption/Decryption integration", () => {
    it("should produce valid encrypted format", async () => {
      const formData = createFormData({
        content: "Integration test content",
        passphrase: "testpassword",
      });

      const encryptResult = await encryptXChaCha(formData);

      expect(encryptResult.success).toBe(true);

      const encrypted = JSON.parse(encryptResult.data!.encryptedContent);
      expect(encrypted).toHaveProperty("alg", "xchacha20");
      expect(encrypted).toHaveProperty("salt");
      expect(encrypted).toHaveProperty("nonce");
      expect(encrypted).toHaveProperty("data");
    });
  });
});

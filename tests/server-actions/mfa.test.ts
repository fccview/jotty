import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockFs, resetAllMocks, createFormData } from "../setup";

const mockGetUsername = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockGetUserByUsername = vi.fn();
const mockUpdateUserSettings = vi.fn();
const mockReadJsonFile = vi.fn();
const mockWriteJsonFile = vi.fn();
const mockLogAudit = vi.fn();
const mockGetSettings = vi.fn();

vi.mock("@/app/_server/actions/users", () => ({
  getUsername: (...args: any[]) => mockGetUsername(...args),
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
  getUserByUsername: (...args: any[]) => mockGetUserByUsername(...args),
  updateUserSettings: (...args: any[]) => mockUpdateUserSettings(...args),
}));

vi.mock("@/app/_server/actions/file", () => ({
  readJsonFile: (...args: any[]) => mockReadJsonFile(...args),
  writeJsonFile: (...args: any[]) => mockWriteJsonFile(...args),
}));

vi.mock("@/app/_server/actions/log", () => ({
  logAudit: (...args: any[]) => mockLogAudit(...args),
}));

vi.mock("@/app/_server/actions/config", () => ({
  getSettings: (...args: any[]) => mockGetSettings(...args),
}));

vi.mock("speakeasy", () => ({
  default: {
    generateSecret: vi.fn().mockReturnValue({
      base32: "JBSWY3DPEHPK3PXP",
      otpauth_url: "otpauth://totp/Test:user?secret=JBSWY3DPEHPK3PXP",
    }),
    totp: {
      verify: vi.fn().mockReturnValue(false),
    },
  },
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mockQRCode"),
  },
}));

import {
  generateMfaSecret,
  verifyAndEnableMfa,
  verifyMfaCode,
  verifyRecoveryCode,
  disableMfa,
  regenerateRecoveryCode,
  adminDisableUserMfa,
  getMfaStatus,
} from "@/app/_server/actions/mfa";
import speakeasy from "speakeasy";

describe("MFA Actions", () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetUsername.mockResolvedValue("testuser");
    mockGetCurrentUser.mockResolvedValue({
      username: "testuser",
      isAdmin: false,
    });
    mockGetUserByUsername.mockResolvedValue({
      username: "testuser",
      passwordHash: "hashedpassword123",
      mfaEnabled: false,
    });
    mockUpdateUserSettings.mockResolvedValue({ success: true });
    mockReadJsonFile.mockResolvedValue([]);
    mockWriteJsonFile.mockResolvedValue(undefined);
    mockLogAudit.mockResolvedValue(undefined);
    mockGetSettings.mockResolvedValue({ appName: "Test App" });
  });

  describe("generateMfaSecret", () => {
    it("should return error when not authenticated", async () => {
      mockGetUsername.mockResolvedValue(null);

      const result = await generateMfaSecret();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should generate MFA secret and QR code", async () => {
      const result = await generateMfaSecret();

      expect(result.success).toBe(true);
      expect(result.data?.secret).toBeDefined();
      expect(result.data?.qrCode).toContain("data:image");
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "INFO",
          action: "mfa_secret_generated",
          success: true,
        }),
      );
    });
  });

  describe("verifyAndEnableMfa", () => {
    it("should return error when not authenticated", async () => {
      mockGetUsername.mockResolvedValue(null);

      const result = await verifyAndEnableMfa("123456", "JBSWY3DPEHPK3PXP");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should return error when verification code is invalid", async () => {
      vi.mocked(speakeasy.totp.verify).mockReturnValue(false);

      const result = await verifyAndEnableMfa("000000", "JBSWY3DPEHPK3PXP");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid verification code");
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "WARNING",
          action: "mfa_enable_failed",
        }),
      );
    });

    it("should enable MFA and return recovery code when verified", async () => {
      vi.mocked(speakeasy.totp.verify).mockReturnValue(true);

      const result = await verifyAndEnableMfa("123456", "JBSWY3DPEHPK3PXP");

      expect(result.success).toBe(true);
      expect(result.data?.recoveryCode).toBeDefined();
      expect(result.data?.recoveryCode).toHaveLength(32);
      expect(mockUpdateUserSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          mfaEnabled: true,
        }),
      );
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "INFO",
          action: "mfa_enabled",
          success: true,
        }),
      );
    });
  });

  describe("verifyMfaCode", () => {
    it("should return error when not authenticated", async () => {
      mockGetUsername.mockResolvedValue(null);

      const result = await verifyMfaCode("123456");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should return error when MFA not enabled", async () => {
      mockGetUserByUsername.mockResolvedValue({
        username: "testuser",
        mfaEnabled: false,
      });

      const result = await verifyMfaCode("123456");

      expect(result.success).toBe(false);
      expect(result.error).toBe("MFA not enabled");
    });

    it("should return error when code is invalid", async () => {
      mockGetUserByUsername.mockResolvedValue({
        username: "testuser",
        passwordHash: "hash",
        mfaEnabled: true,
        mfaSecret: JSON.stringify({
          alg: "xchacha20",
          salt: "aa",
          nonce: "bb",
          data: "cc",
        }),
      });
      vi.mocked(speakeasy.totp.verify).mockReturnValue(false);

      const result = await verifyMfaCode("000000");

      expect(result.success).toBe(false);
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "WARNING",
          action: "mfa_verification_failed",
        }),
      );
    });
  });

  describe("verifyRecoveryCode", () => {
    it("should return error when not authenticated", async () => {
      mockGetUsername.mockResolvedValue(null);

      const result = await verifyRecoveryCode("RECOVERY123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should return error when MFA not enabled", async () => {
      mockGetUserByUsername.mockResolvedValue({
        username: "testuser",
        mfaEnabled: false,
      });

      const result = await verifyRecoveryCode("RECOVERY123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("MFA not enabled");
    });

    it("should return error when recovery code is invalid", async () => {
      mockGetUserByUsername.mockResolvedValue({
        username: "testuser",
        mfaEnabled: true,
        mfaRecoveryCode: "different-hashed-code",
      });

      const result = await verifyRecoveryCode("WRONGCODE");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid recovery code");
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "WARNING",
          action: "mfa_backup_code_failed",
        }),
      );
    });
  });

  describe("getMfaStatus", () => {
    it("should return error when not authenticated", async () => {
      mockGetUsername.mockResolvedValue(null);

      const result = await getMfaStatus();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should return MFA disabled status", async () => {
      mockGetUserByUsername.mockResolvedValue({
        username: "testuser",
        mfaEnabled: false,
      });

      const result = await getMfaStatus();

      expect(result.success).toBe(true);
      expect(result.data?.enabled).toBe(false);
    });

    it("should return MFA enabled status with enrollment date", async () => {
      const enrolledAt = "2024-01-01T00:00:00.000Z";
      mockGetUserByUsername.mockResolvedValue({
        username: "testuser",
        mfaEnabled: true,
        mfaEnrolledAt: enrolledAt,
      });

      const result = await getMfaStatus();

      expect(result.success).toBe(true);
      expect(result.data?.enabled).toBe(true);
      expect(result.data?.enrolledAt).toBe(enrolledAt);
    });

    it("should return error when user not found", async () => {
      mockGetUserByUsername.mockResolvedValue(null);

      const result = await getMfaStatus();

      expect(result.success).toBe(false);
      expect(result.error).toBe("User not found");
    });
  });

  describe("adminDisableUserMfa", () => {
    it("should return error when not admin", async () => {
      mockGetCurrentUser.mockResolvedValue({
        username: "user",
        isAdmin: false,
      });

      const result = await adminDisableUserMfa("targetuser", "RECOVERY123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("should return error when target user not found", async () => {
      mockGetCurrentUser.mockResolvedValue({
        username: "admin",
        isAdmin: true,
      });
      mockGetUserByUsername.mockResolvedValue(null);

      const result = await adminDisableUserMfa("nonexistent", "RECOVERY123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("User not found");
    });

    it("should return error when MFA not enabled for user", async () => {
      mockGetCurrentUser.mockResolvedValue({
        username: "admin",
        isAdmin: true,
      });
      mockGetUserByUsername.mockResolvedValue({
        username: "targetuser",
        mfaEnabled: false,
      });

      const result = await adminDisableUserMfa("targetuser", "RECOVERY123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("MFA not enabled for this user");
    });

    it("should return error when recovery code is invalid", async () => {
      mockGetCurrentUser.mockResolvedValue({
        username: "admin",
        isAdmin: true,
      });
      mockGetUserByUsername.mockResolvedValue({
        username: "targetuser",
        mfaEnabled: true,
        mfaRecoveryCode: "correct-hashed-code",
      });

      const result = await adminDisableUserMfa("targetuser", "WRONGCODE");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid recovery code");
    });
  });
});

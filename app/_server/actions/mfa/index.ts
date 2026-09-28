"use server";

import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { getCurrentUser, getUsername } from "../users";
import { findUserRecord, mutateUsers, patchUserFields } from "../users/records";
import { logAudit } from "../log";
import { getSettings } from "../config";
import _sodium from "libsodium-wrappers-sumo";
import { createHash, randomBytes } from "crypto";
import { Result } from "@/app/_types";

let sodium: any;
const _getSodium = async () => {
    if (!sodium) {
        await _sodium.ready;
        sodium = _sodium;
    }
    return sodium;
};

const _encryptSecret = async (secret: string, username: string): Promise<string> => {
    const sod = await _getSodium();

    const user = await findUserRecord(username);
    if (!user) {
        throw new Error("User not found");
    }

    const passphrase = user.passwordHash;
    const salt = sod.randombytes_buf(sod.crypto_pwhash_SALTBYTES);

    const key = sod.crypto_pwhash(
        sod.crypto_aead_xchacha20poly1305_ietf_KEYBYTES,
        passphrase,
        salt,
        sod.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        sod.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        sod.crypto_pwhash_ALG_DEFAULT
    );

    const nonce = sod.randombytes_buf(sod.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
    const ciphertext = sod.crypto_aead_xchacha20poly1305_ietf_encrypt(
        secret,
        null,
        null,
        nonce,
        key
    );

    const packageData = {
        alg: "xchacha20",
        salt: sod.to_hex(salt),
        nonce: sod.to_hex(nonce),
        data: sod.to_hex(ciphertext)
    };

    return JSON.stringify(packageData);
};

const _decryptSecret = async (encryptedSecret: string, username: string): Promise<string> => {
    const sod = await _getSodium();
    const pkg = JSON.parse(encryptedSecret);

    const user = await findUserRecord(username);
    if (!user) {
        throw new Error("User not found");
    }

    const passphrase = user.passwordHash;
    const salt = sod.from_hex(pkg.salt);
    const nonce = sod.from_hex(pkg.nonce);
    const ciphertext = sod.from_hex(pkg.data);

    const key = sod.crypto_pwhash(
        sod.crypto_aead_xchacha20poly1305_ietf_KEYBYTES,
        passphrase,
        salt,
        sod.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        sod.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        sod.crypto_pwhash_ALG_DEFAULT
    );

    const decrypted = sod.crypto_aead_xchacha20poly1305_ietf_decrypt(
        null,
        ciphertext,
        null,
        nonce,
        key
    );

    return sod.to_string(decrypted);
};

export const decryptMfaSecret = _decryptSecret;

const _generateRecoveryCode = (): string => {
    return randomBytes(16).toString('hex').toUpperCase();
};

const _hashRecoveryCode = (code: string): string => {
    return createHash("sha256").update(code).digest("hex");
};

export const generateMfaSecret = async (): Promise<Result<{ secret: string; qrCode: string }>> => {
    try {
        const username = await getUsername();
        if (!username) {
            return { success: false, error: "Not authenticated" };
        }

        const settings = await getSettings();
        const appName = settings?.appName || "jotty·page";
        const isRwMarkable = settings?.isRwMarkable || false;

        const secret = speakeasy.generateSecret({
            length: 32,
        });

        const encodedIssuer = encodeURIComponent(appName);
        const encodedName = encodeURIComponent(username);
        const otpauthUrl = `otpauth://totp/${encodedIssuer}:${encodedName}?secret=${secret.base32}&issuer=${encodedIssuer}`;

        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
            errorCorrectionLevel: "H",
            width: 300,
            margin: 2,
            color: {
                dark: isRwMarkable ? "#2563EB" : "#8B5CF6",
                light: "#F9F9F9",
            },
        });

        await logAudit({
            level: "INFO",
            action: "mfa_secret_generated",
            category: "security",
            success: true,
        });

        return {
            success: true,
            data: {
                secret: secret.base32,
                qrCode: qrCodeDataUrl,
            },
        };
    } catch (error) {
        console.error("Generate MFA secret error:", error);
        await logAudit({
            level: "ERROR",
            action: "mfa_secret_generated",
            category: "security",
            success: false,
            errorMessage: "Failed to generate MFA secret",
        });
        return { success: false, error: "Failed to generate MFA secret" };
    }
};

export const verifyAndEnableMfa = async (token: string, secret: string): Promise<Result<{ recoveryCode: string }>> => {
    try {
        const username = await getUsername();
        if (!username) {
            return { success: false, error: "Not authenticated" };
        }

        const verified = speakeasy.totp.verify({
            secret,
            encoding: "base32",
            token,
            window: 2,
        });

        if (!verified) {
            await logAudit({
                level: "WARNING",
                action: "mfa_enable_failed",
                category: "security",
                success: false,
                errorMessage: "Invalid verification code",
            });
            return { success: false, error: "Invalid verification code" };
        }

        const recoveryCode = _generateRecoveryCode();
        const hashedRecoveryCode = _hashRecoveryCode(recoveryCode);

        const encryptedSecret = await _encryptSecret(secret, username);

        const saved = await patchUserFields(username, {
            mfaEnabled: true,
            mfaSecret: encryptedSecret,
            mfaRecoveryCode: hashedRecoveryCode,
            mfaEnrolledAt: new Date().toISOString(),
        });

        if (!saved) {
            return { success: false, error: "Failed to enable MFA" };
        }

        await logAudit({
            level: "INFO",
            action: "mfa_enabled",
            category: "security",
            success: true,
        });

        return {
            success: true,
            data: { recoveryCode },
        };
    } catch (error) {
        console.error("Enable MFA error:", error);
        await logAudit({
            level: "ERROR",
            action: "mfa_enabled",
            category: "security",
            success: false,
            errorMessage: "Failed to enable MFA",
        });
        return { success: false, error: "Failed to enable MFA" };
    }
};

export const verifyMfaCode = async (code: string): Promise<Result<null>> => {
    try {
        const username = await getUsername();
        if (!username) {
            return { success: false, error: "Not authenticated" };
        }

        const user = await findUserRecord(username);

        if (!user || !user.mfaEnabled || !user.mfaSecret) {
            return { success: false, error: "MFA not enabled" };
        }

        const secret = await _decryptSecret(user.mfaSecret, username);

        const verified = speakeasy.totp.verify({
            secret,
            encoding: "base32",
            token: code,
            window: 2,
        });

        if (!verified) {
            await logAudit({
                level: "WARNING",
                action: "mfa_verification_failed",
                category: "security",
                success: false,
                errorMessage: "Invalid MFA code",
            });
            return { success: false, error: "Invalid code" };
        }

        await logAudit({
            level: "INFO",
            action: "mfa_verification_success",
            category: "security",
            success: true,
        });

        return { success: true, data: null };
    } catch (error) {
        console.error("Verify MFA code error:", error);
        await logAudit({
            level: "ERROR",
            action: "mfa_verification_failed",
            category: "security",
            success: false,
            errorMessage: "MFA verification error",
        });
        return { success: false, error: "Verification failed" };
    }
};

export const verifyRecoveryCode = async (code: string): Promise<Result<null>> => {
    try {
        const username = await getUsername();
        if (!username) {
            return { success: false, error: "Not authenticated" };
        }

        const user = await findUserRecord(username);

        if (!user || !user.mfaEnabled || !user.mfaRecoveryCode) {
            return { success: false, error: "MFA not enabled" };
        }

        const hashedCode = _hashRecoveryCode(code);

        if (hashedCode !== user.mfaRecoveryCode) {
            await logAudit({
                level: "WARNING",
                action: "mfa_backup_code_failed",
                category: "security",
                success: false,
                errorMessage: "Invalid recovery code",
            });
            return { success: false, error: "Invalid recovery code" };
        }

        await logAudit({
            level: "INFO",
            action: "mfa_backup_code_used",
            category: "security",
            success: true,
        });

        return { success: true, data: null };
    } catch (error) {
        console.error("Verify recovery code error:", error);
        await logAudit({
            level: "ERROR",
            action: "mfa_backup_code_failed",
            category: "security",
            success: false,
            errorMessage: "Recovery code verification error",
        });
        return { success: false, error: "Verification failed" };
    }
};

export const disableMfa = async (code: string): Promise<Result<null>> => {
    try {
        const username = await getUsername();
        if (!username) {
            return { success: false, error: "Not authenticated" };
        }

        const verification = await verifyMfaCode(code);
        if (!verification.success) {
            return verification;
        }

        const saved = await patchUserFields(username, {
            mfaEnabled: false,
            mfaSecret: undefined,
            mfaRecoveryCode: undefined,
            mfaEnrolledAt: undefined,
        });

        if (!saved) {
            return { success: false, error: "Failed to disable MFA" };
        }

        await logAudit({
            level: "INFO",
            action: "mfa_disabled",
            category: "security",
            success: true,
        });

        return { success: true, data: null };
    } catch (error) {
        console.error("Disable MFA error:", error);
        await logAudit({
            level: "ERROR",
            action: "mfa_disabled",
            category: "security",
            success: false,
            errorMessage: "Failed to disable MFA",
        });
        return { success: false, error: "Failed to disable MFA" };
    }
};


export const regenerateRecoveryCode = async (code: string): Promise<Result<{ recoveryCode: string }>> => {
    try {
        const username = await getUsername();
        if (!username) {
            return { success: false, error: "Not authenticated" };
        }

        const verification = await verifyMfaCode(code);
        if (!verification.success) {
            return { success: false, error: verification.error || "Verification failed" };
        }

        const recoveryCode = _generateRecoveryCode();
        const hashedRecoveryCode = _hashRecoveryCode(recoveryCode);

        const saved = await patchUserFields(username, {
            mfaRecoveryCode: hashedRecoveryCode,
        });

        if (!saved) {
            return { success: false, error: "Failed to regenerate recovery code" };
        }

        await logAudit({
            level: "INFO",
            action: "mfa_backup_codes_regenerated",
            category: "security",
            success: true,
        });

        return {
            success: true,
            data: { recoveryCode },
        };
    } catch (error) {
        console.error("Regenerate recovery code error:", error);
        await logAudit({
            level: "ERROR",
            action: "mfa_backup_codes_regenerated",
            category: "security",
            success: false,
            errorMessage: "Failed to regenerate recovery code",
        });
        return { success: false, error: "Failed to regenerate recovery code" };
    }
};

export const adminDisableUserMfa = async (username: string, recoveryCode: string): Promise<Result<null>> => {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.isAdmin) {
            return { success: false, error: "Unauthorized" };
        }

        const targetUser = await findUserRecord(username);
        if (!targetUser) {
            return { success: false, error: "User not found" };
        }

        if (!targetUser.mfaEnabled || !targetUser.mfaRecoveryCode) {
            return { success: false, error: "MFA not enabled for this user" };
        }

        const hashedCode = _hashRecoveryCode(recoveryCode);

        if (hashedCode !== targetUser.mfaRecoveryCode) {
            await logAudit({
                level: "WARNING",
                action: "mfa_disabled",
                category: "security",
                success: false,
                errorMessage: "Invalid recovery code provided by admin",
                metadata: { targetUser: username },
            });
            return { success: false, error: "Invalid recovery code" };
        }

        const disabled = await mutateUsers((users) => {
            const userIndex = users.findIndex((u) => u.username === username);

            if (userIndex === -1) return null;

            users[userIndex].mfaEnabled = false;
            users[userIndex].mfaSecret = undefined;
            users[userIndex].mfaRecoveryCode = undefined;
            users[userIndex].mfaEnrolledAt = undefined;

            return true;
        });

        if (!disabled) {
            return { success: false, error: "User not found" };
        }

        await logAudit({
            level: "INFO",
            action: "mfa_disabled",
            category: "security",
            success: true,
            metadata: { targetUser: username, disabledBy: currentUser.username },
        });

        return { success: true, data: null };
    } catch (error) {
        console.error("Admin disable MFA error:", error);
        await logAudit({
            level: "ERROR",
            action: "mfa_disabled",
            category: "security",
            success: false,
            errorMessage: "Failed to disable MFA",
        });
        return { success: false, error: "Failed to disable MFA" };
    }
};

export const getMfaStatus = async (): Promise<Result<{ enabled: boolean; enrolledAt?: string }>> => {
    try {
        const username = await getUsername();
        if (!username) {
            return { success: false, error: "Not authenticated" };
        }

        const user = await findUserRecord(username);

        if (!user) {
            return { success: false, error: "User not found" };
        }

        return {
            success: true,
            data: {
                enabled: user.mfaEnabled || false,
                enrolledAt: user.mfaEnrolledAt,
            },
        };
    } catch (error) {
        console.error("Get MFA status error:", error);
        return { success: false, error: "Failed to get MFA status" };
    }
};

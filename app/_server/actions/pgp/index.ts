"use server";

import fs from "fs/promises";
import path from "path";
import * as openpgp from "openpgp";
import { getCurrentUser } from "@/app/_server/actions/users";
import { updateUserSettings } from "@/app/_server/actions/users";
import {
  ensureDir,
  serverWriteFile,
  serverReadFile,
  serverDeleteFile,
} from "@/app/_server/actions/file";
import { Result, User } from "@/app/_types";
import { PGPKeyMetadata } from "@/app/_types/encryption";

const _getEncryptionDir = async (username: string): Promise<string> => {
  const user = await getCurrentUser();
  if (user?.encryptionSettings?.customKeyPath) {
    return user.encryptionSettings.customKeyPath;
  }
  return path.join(process.cwd(), "data", "encryption", username);
};

export const generateKeyPair = async (
  formData: FormData
): Promise<
  Result<{ publicKey: string; privateKey: string; fingerprint: string }>
> => {
  try {
    const user = await getCurrentUser();
    if (!user?.username) {
      return { success: false, error: "Not authenticated" };
    }

    const passphrase = formData.get("passphrase") as string;
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;

    if (!passphrase) {
      return { success: false, error: "Passphrase is required" };
    }

    const { privateKey, publicKey, revocationCertificate } =
      await openpgp.generateKey({
        type: "rsa",
        rsaBits: 4096,
        userIDs: [
          {
            name: name || user.username,
            email:
              email || `${user.username}@${process.env.APP_URL || "jotty.local"}`,
          },
        ],
        passphrase,
        format: "armored",
      });

    const publicKeyObj = await openpgp.readKey({ armoredKey: publicKey });
    const fingerprint = publicKeyObj.getFingerprint();

    const keysDir = await _getEncryptionDir(user.username);
    await ensureDir(keysDir);

    await serverWriteFile(path.join(keysDir, "public.asc"), publicKey);
    await serverWriteFile(path.join(keysDir, "private.asc"), privateKey);

    await updateUserSettings({
      encryptionSettings: {
        hasKeys: true,
        autoDecrypt: true,
      },
    });

    return {
      success: true,
      data: { publicKey, privateKey, fingerprint },
    };
  } catch (error) {
    console.error("Error generating key pair:", error);
    return { success: false, error: "Failed to generate key pair" };
  }
};

export const importKeys = async (
  formData: FormData
): Promise<Result<{ fingerprint: string }>> => {
  try {
    const user = await getCurrentUser();
    if (!user?.username) {
      return { success: false, error: "Not authenticated" };
    }

    const publicKey = formData.get("publicKey") as string;
    const privateKey = formData.get("privateKey") as string;

    if (!publicKey || !privateKey) {
      return {
        success: false,
        error: "Both public and private keys are required",
      };
    }

    try {
      const publicKeyObj = await openpgp.readKey({ armoredKey: publicKey });
      const fingerprint = publicKeyObj.getFingerprint();

      const keysDir = await _getEncryptionDir(user.username);
      await ensureDir(keysDir);

      await serverWriteFile(path.join(keysDir, "public.asc"), publicKey);
      await serverWriteFile(path.join(keysDir, "private.asc"), privateKey);

      await updateUserSettings({
        encryptionSettings: {
          hasKeys: true,
          autoDecrypt: true,
        },
      });

      return { success: true, data: { fingerprint } };
    } catch (keyError) {
      console.error("Invalid keys:", keyError);
      return {
        success: false,
        error: "Invalid keys. Ensure they are valid ASCII-armored PGP keys.",
      };
    }
  } catch (error) {
    console.error("Error importing keys:", error);
    return { success: false, error: "Failed to import keys" };
  }
};

export const exportKeys = async (
  keyType: "public" | "private"
): Promise<Result<{ key: string }>> => {
  try {
    const user = await getCurrentUser();
    if (!user?.username) {
      return { success: false, error: "Not authenticated" };
    }

    const keysDir = await _getEncryptionDir(user.username);
    const keyPath = path.join(keysDir, `${keyType}.asc`);

    const key = await serverReadFile(keyPath);

    if (!key) {
      return {
        success: false,
        error: `${keyType === "public" ? "Public" : "Private"} key not found`,
      };
    }

    return { success: true, data: { key } };
  } catch (error) {
    console.error(`Error exporting ${keyType} key:`, error);
    return {
      success: false,
      error: `Failed to export ${keyType === "public" ? "public" : "private"} key`,
    };
  }
};


export const getStoredKeys = async (): Promise<
  Result<{
    hasKeys: boolean;
    metadata?: PGPKeyMetadata;
  }>
> => {
  try {
    const user = await getCurrentUser();
    if (!user?.username) {
      return { success: false, error: "Not authenticated" };
    }

    const keysDir = await _getEncryptionDir(user.username);
    const publicKeyPath = path.join(keysDir, "public.asc");

    try {
      const publicKey = await serverReadFile(publicKeyPath);
      if (!publicKey) {
        return { success: true, data: { hasKeys: false } };
      }

      const publicKeyObj = await openpgp.readKey({ armoredKey: publicKey });
      const fingerprint = publicKeyObj.getFingerprint();
      const keyCreationTime = publicKeyObj.getCreationTime();
      const algorithmInfo = publicKeyObj.getAlgorithmInfo();
      const algorithm = algorithmInfo?.bits === 4096 ? "rsa4096" : "imported";

      const metadata: PGPKeyMetadata = {
        keyFingerprint: fingerprint,
        createdAt: keyCreationTime ? new Date(keyCreationTime).toISOString() : new Date().toISOString(),
        algorithm,
      };

      return { success: true, data: { hasKeys: true, metadata } };
    } catch {
      return { success: true, data: { hasKeys: false } };
    }
  } catch (error) {
    console.error("Error checking stored keys:", error);
    return { success: false, error: "Failed to check stored keys" };
  }
};

export const encryptNoteContent = async (
  formData: FormData
): Promise<Result<{ encryptedContent: string }>> => {
  try {
    const user = await getCurrentUser();
    if (!user?.username) {
      return { success: false, error: "Not authenticated" };
    }

    const content = formData.get("content") as string;
    const useStoredKey = formData.get("useStoredKey") as string;
    let publicKey = formData.get("publicKey") as string;

    if (!content) {
      return { success: false, error: "Content is required" };
    }

    if (useStoredKey === "true") {
      const keysDir = await _getEncryptionDir(user.username);
      publicKey = await serverReadFile(path.join(keysDir, "public.asc"));

      if (!publicKey) {
        return { success: false, error: "No stored public key found" };
      }
    } else if (!publicKey) {
      return { success: false, error: "Public key is required" };
    }

    const publicKeyObj = await openpgp.readKey({ armoredKey: publicKey });

    const encrypted = await openpgp.encrypt({
      message: await openpgp.createMessage({ text: content }),
      encryptionKeys: publicKeyObj,
    });

    return { success: true, data: { encryptedContent: encrypted } };
  } catch (error) {
    console.error("Error encrypting note:", error);
    return { success: false, error: "Failed to encrypt note content" };
  }
};

export const decryptNoteContent = async (
  formData: FormData
): Promise<Result<{ decryptedContent: string }>> => {
  try {
    const user = await getCurrentUser();
    if (!user?.username) {
      return { success: false, error: "Not authenticated" };
    }

    const encryptedContent = formData.get("encryptedContent") as string;
    const passphrase = formData.get("passphrase") as string;
    const useStoredKey = formData.get("useStoredKey") as string;
    let privateKey = formData.get("privateKey") as string | undefined;

    if (!encryptedContent) {
      return { success: false, error: "Encrypted content is required" };
    }

    if (!passphrase) {
      return { success: false, error: "Passphrase is required" };
    }

    if (useStoredKey === "true") {
      const keysDir = await _getEncryptionDir(user.username);
      privateKey = await serverReadFile(path.join(keysDir, "private.asc"));

      if (!privateKey) {
        return { success: false, error: "No stored private key found" };
      }
    } else if (!privateKey) {
      return { success: false, error: "Private key is required" };
    }

    try {
      const privateKeyObj = await openpgp.readPrivateKey({
        armoredKey: privateKey,
      });

      const decryptedKey = await openpgp.decryptKey({
        privateKey: privateKeyObj,
        passphrase,
      });

      const message = await openpgp.readMessage({
        armoredMessage: encryptedContent,
      });

      const { data: decrypted } = await openpgp.decrypt({
        message,
        decryptionKeys: decryptedKey,
      });

      return { success: true, data: { decryptedContent: decrypted as string } };
    } catch (decryptError) {
      console.error("Decryption error:", decryptError);
      return {
        success: false,
        error:
          "Failed to decrypt. Check your passphrase and ensure the private key matches.",
      };
    }
  } catch (error) {
    console.error("Error decrypting note:", error);
    return { success: false, error: "Failed to decrypt note" };
  }
};

export const setCustomKeyPath = async (
  customPath: string
): Promise<Result<{ user: User }>> => {
  try {
    const user = await getCurrentUser();
    if (!user?.username) {
      return { success: false, error: "Not authenticated" };
    }

    try {
      await fs.access(customPath);
    } catch {
      return { success: false, error: "Custom path is not accessible" };
    }

    const result = await updateUserSettings({
      encryptionSettings: {
        hasKeys: user.encryptionSettings?.hasKeys ?? false,
        autoDecrypt: user.encryptionSettings?.autoDecrypt ?? true,
        customKeyPath: customPath,
      },
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error || "Failed to set custom key path" };
    }

    return { success: true, data: { user: result.data.user } };
  } catch (error) {
    console.error("Error setting custom key path:", error);
    return { success: false, error: "Failed to set custom key path" };
  }
};

export const deleteKeys = async (): Promise<Result<null>> => {
  try {
    const user = await getCurrentUser();
    if (!user?.username) {
      return { success: false, error: "Not authenticated" };
    }

    const keysDir = await _getEncryptionDir(user.username);

    await serverDeleteFile(path.join(keysDir, "public.asc"));
    await serverDeleteFile(path.join(keysDir, "private.asc"));

    await updateUserSettings({
      encryptionSettings: {
        hasKeys: false,
        autoDecrypt: true,
      },
    });

    return { success: true, data: null };
  } catch (error) {
    console.error("Error deleting keys:", error);
    return { success: false, error: "Failed to delete keys" };
  }
};

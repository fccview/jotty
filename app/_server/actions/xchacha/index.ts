"use server";

import _sodium from "libsodium-wrappers-sumo";
import { Result } from "@/app/_types";
import { logAudit } from "@/app/_server/actions/log";

let sodium: any;
const getSodium = async () => {
  if (!sodium) {
    await _sodium.ready;
    sodium = _sodium;
  }
  return sodium;
};

export const encryptXChaCha = async (
  formData: FormData
): Promise<Result<{ encryptedContent: string }>> => {
  try {
    const sod = await getSodium();
    const content = formData.get("content") as string;
    const passphrase = formData.get("passphrase") as string;

    if (!content || !passphrase) return { success: false, error: "Missing data" };

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
      content,
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

    await logAudit({
      level: "INFO",
      action: "note_encrypted",
      category: "encryption",
      success: true,
      metadata: { method: "xchacha20" },
    });

    return {
      success: true,
      data: { encryptedContent: JSON.stringify(packageData) }
    };

  } catch (error) {
    await logAudit({
      level: "ERROR",
      action: "note_encrypted",
      category: "encryption",
      success: false,
      errorMessage: "XChaCha encryption failed",
    });
    console.error("XChaCha Encryption Error:", error);
    return { success: false, error: "Encryption failed" };
  }
};

export const decryptXChaCha = async (
  formData: FormData
): Promise<Result<{ decryptedContent: string }>> => {
  try {
    const sod = await getSodium();
    const encryptedString = formData.get("encryptedContent") as string;
    const passphrase = formData.get("passphrase") as string;

    if (!encryptedString || !passphrase) return { success: false, error: "Missing data" };

    let pkg;
    try {
      pkg = JSON.parse(encryptedString);
    } catch {
      return { success: false, error: "Invalid encrypted format" };
    }

    if (pkg.alg !== "xchacha20") {
      return { success: false, error: "Algorithm mismatch" };
    }

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

    await logAudit({
      level: "INFO",
      action: "note_decrypted",
      category: "encryption",
      success: true,
      metadata: { method: "xchacha20" },
    });

    return {
      success: true,
      data: { decryptedContent: sod.to_string(decrypted) }
    };

  } catch (error) {
    await logAudit({
      level: "WARNING",
      action: "note_decrypted",
      category: "encryption",
      success: false,
      errorMessage: "XChaCha decryption failed - wrong password",
    });
    console.error("XChaCha Decryption Error:", error);
    return { success: false, error: "Decryption failed (Wrong password?)" };
  }
};

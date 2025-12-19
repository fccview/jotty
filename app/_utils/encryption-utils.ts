import { EncryptionMethod } from "@/app/_types";

export const detectEncryptionMethod = (content: string): EncryptionMethod | null => {
  if (!content) return null;
  if (content.includes("-----BEGIN PGP MESSAGE-----")) return "pgp";
  if (isValidXChaChaJSON(content)) return "xchacha";
  return null;
};

export const isValidXChaChaJSON = (content: string): boolean => {
  if (!content) return false;
  try {
    const parsed = JSON.parse(content);
    return parsed.alg === "xchacha20" && parsed.salt && parsed.nonce && parsed.data;
  } catch {
    return false;
  }
};

export const isEncrypted = (content: string): boolean => {
  return detectEncryptionMethod(content) !== null;
};
export type EncryptionMethod = "pgp" | "xchacha";

export interface PGPKeyMetadata {
  keyFingerprint: string;
  createdAt: string;
  algorithm: string;
}

export interface EncryptionSettings {
  method: EncryptionMethod;
  autoDecrypt: boolean;
  hasKeys: boolean;
  customKeyPath?: string;
}

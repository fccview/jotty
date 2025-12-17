export interface PGPKeyMetadata {
  keyFingerprint: string;
  createdAt: string;
  algorithm: string;
}

export interface EncryptionSettings {
  autoDecrypt: boolean;
  hasKeys: boolean;
  customKeyPath?: string;
}

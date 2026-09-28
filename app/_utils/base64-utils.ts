const BINARY_CHUNK = 0x8000;
const LATIN1_HIGH = /[\u0080-\u00ff]/;
const BEYOND_LATIN1 = /[^\u0000-\u00ff]/;

const strictUtf8 = new TextDecoder("utf-8", { fatal: true });

const bytesToBinary = (bytes: Uint8Array): string => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += BINARY_CHUNK) {
    binary += String.fromCharCode(
      ...Array.from(bytes.subarray(i, i + BINARY_CHUNK)),
    );
  }
  return binary;
};

const binaryToBytes = (binary: string): Uint8Array =>
  Uint8Array.from(binary, (char) => char.charCodeAt(0));

const tryUtf8 = (bytes: Uint8Array): string | null => {
  try {
    return strictUtf8.decode(bytes);
  } catch {
    return null;
  }
};

export const utf8ToBase64 = (text: string): string =>
  btoa(bytesToBinary(new TextEncoder().encode(text)));

export const base64ToText = (base64: string): string => {
  const binary = atob(base64);
  return tryUtf8(binaryToBytes(binary)) ?? binary;
};

export const repairMojibake = (text: string): string => {
  if (!LATIN1_HIGH.test(text) || BEYOND_LATIN1.test(text)) return text;
  return tryUtf8(binaryToBytes(text)) ?? text;
};

export const base64ToSvg = (base64: string): string =>
  repairMojibake(base64ToText(base64));

/**
 * @fccview here!
 * Majority of the tests were blatantly made with AI.
 * 
 * I have set up a dozen, so there are coding standards, I have obviously went through all of them, but there's not much to check really.
 * I swear this has saved me HOURS and Jotty feels so much more stable because of it. This is LITERALLY what llms were made for I swear!
 */

import { vi, beforeAll, afterAll } from "vitest";

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = vi.fn();
  console.warn = vi.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

export const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

export const mockRedirect = vi.fn();
export const mockRevalidatePath = vi.fn();

vi.mock("next/headers", () => ({
  cookies: () => mockCookies,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

export const mockFs = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
  access: vi.fn(),
  rename: vi.fn(),
  rm: vi.fn(),
  unlink: vi.fn(),
};

vi.mock("fs/promises", () => ({
  default: mockFs,
  ...mockFs,
}));

vi.mock("openpgp", () => ({
  generateKey: vi.fn().mockResolvedValue({
    privateKey: "mock-private-key",
    publicKey: "mock-public-key",
  }),
  readKey: vi.fn().mockResolvedValue({}),
  readPrivateKey: vi.fn().mockResolvedValue({}),
  encrypt: vi.fn().mockResolvedValue("mock-encrypted"),
  decrypt: vi.fn().mockResolvedValue({ data: "mock-decrypted" }),
  createMessage: vi.fn().mockResolvedValue({}),
  readMessage: vi.fn().mockResolvedValue({}),
}));

vi.mock("libsodium-wrappers-sumo", () => ({
  default: {
    ready: Promise.resolve(),
    crypto_pwhash: vi.fn().mockReturnValue(new Uint8Array(32)),
    crypto_secretbox_easy: vi.fn().mockReturnValue(new Uint8Array(32)),
    crypto_secretbox_open_easy: vi.fn().mockReturnValue(new Uint8Array(32)),
    randombytes_buf: vi.fn().mockReturnValue(new Uint8Array(24)),
    crypto_pwhash_ALG_ARGON2ID13: 2,
    crypto_pwhash_ALG_DEFAULT: 2,
    crypto_pwhash_SALTBYTES: 16,
    crypto_pwhash_OPSLIMIT_INTERACTIVE: 2,
    crypto_pwhash_MEMLIMIT_INTERACTIVE: 67108864,
    crypto_secretbox_NONCEBYTES: 24,
    crypto_aead_xchacha20poly1305_ietf_KEYBYTES: 32,
    crypto_aead_xchacha20poly1305_ietf_NPUBBYTES: 24,
    crypto_aead_xchacha20poly1305_ietf_encrypt: vi
      .fn()
      .mockReturnValue(new Uint8Array(32)),
    crypto_aead_xchacha20poly1305_ietf_decrypt: vi
      .fn()
      .mockReturnValue(new Uint8Array(32)),
    from_base64: vi.fn().mockReturnValue(new Uint8Array(32)),
    to_base64: vi.fn().mockReturnValue("mock-base64"),
    from_string: vi.fn().mockReturnValue(new Uint8Array(32)),
    to_string: vi.fn().mockReturnValue("mock-string"),
    to_hex: vi.fn().mockReturnValue("mock-hex"),
    from_hex: vi.fn().mockReturnValue(new Uint8Array(32)),
  },
  ready: Promise.resolve(),
}));

vi.mock("simple-git", () => ({
  default: vi.fn().mockReturnValue({
    init: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    log: vi.fn().mockResolvedValue({ all: [] }),
    show: vi.fn().mockResolvedValue(""),
    raw: vi.fn().mockResolvedValue(""),
  }),
  simpleGit: vi.fn().mockReturnValue({
    init: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    log: vi.fn().mockResolvedValue({ all: [] }),
    show: vi.fn().mockResolvedValue(""),
    raw: vi.fn().mockResolvedValue(""),
  }),
}));

vi.mock("speakeasy", () => ({
  default: {
    generateSecret: vi.fn().mockReturnValue({
      base32: "JBSWY3DPEHPK3PXP",
      otpauth_url: "otpauth://totp/Test:user?secret=JBSWY3DPEHPK3PXP",
    }),
    totp: {
      verify: vi.fn().mockReturnValue(true),
    },
  },
  generateSecret: vi.fn().mockReturnValue({
    base32: "JBSWY3DPEHPK3PXP",
    otpauth_url: "otpauth://totp/Test:user?secret=JBSWY3DPEHPK3PXP",
  }),
  totp: {
    verify: vi.fn().mockReturnValue(true),
  },
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mock"),
  },
  toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mock"),
}));

vi.mock("unified", () => ({
  unified: vi.fn().mockReturnValue({
    use: vi.fn().mockReturnThis(),
    process: vi.fn().mockResolvedValue({ toString: () => "" }),
  }),
}));

vi.mock("js-beautify", () => ({
  html: vi.fn().mockImplementation((html: string) => html),
}));

vi.mock("unist-util-visit", () => ({
  visit: vi.fn(),
}));

vi.mock("@/app/_utils/markdown-utils", () => ({
  sanitizeMarkdown: vi.fn().mockImplementation((content: string) => content),
  convertMarkdownToHtml: vi
    .fn()
    .mockImplementation((content: string) => content),
  createTurndownService: vi.fn().mockReturnValue({
    turndown: vi.fn().mockImplementation((html: string) => html),
  }),
  extractHeadings: vi.fn().mockReturnValue([]),
  htmlToMarkdown: vi.fn().mockImplementation((html: string) => html),
}));

vi.mock("@/app/_utils/checklist-utils", () => ({
  listToMarkdown: vi.fn().mockReturnValue("# Test\n- [ ] Item"),
  parseMarkdown: vi.fn().mockReturnValue({
    id: "test",
    title: "Test",
    items: [],
  }),
  isItemCompleted: vi.fn().mockReturnValue(false),
  formatTime: vi.fn().mockReturnValue("0s"),
  getCompletionRate: vi.fn().mockReturnValue(0),
}));

export const mockLock = vi.fn().mockResolvedValue(undefined);
export const mockUnlock = vi.fn().mockResolvedValue(undefined);

vi.mock("proper-lockfile", () => ({
  lock: mockLock,
  unlock: mockUnlock,
}));

export function resetAllMocks() {
  vi.clearAllMocks();
  mockCookies.get.mockReset();
  mockCookies.set.mockReset();
  mockCookies.delete.mockReset();
  mockRedirect.mockReset();
  mockRevalidatePath.mockReset();
  mockFs.readFile.mockReset();
  mockFs.writeFile.mockReset();
  mockFs.mkdir.mockReset();
  mockFs.readdir.mockReset();
  mockFs.stat.mockReset();
  mockFs.access.mockReset();
  mockFs.rename.mockReset();
  mockFs.rm.mockReset();
  mockFs.unlink.mockReset();
  mockLock.mockReset();
  mockUnlock.mockReset();
}

export function createFormData(data: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.append(key, value);
  }
  return formData;
}

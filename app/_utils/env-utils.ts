export function isEnvEnabled(value: string | boolean | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return value;

  if (!value) return false;

  const lower = value.trim().toLowerCase();
  return lower !== "no" && lower !== "false" && lower !== "0";
}

export const isSecureEnv = (): boolean =>
  process.env.NODE_ENV === "production" && isEnvEnabled(process.env.HTTPS);

export const getSessionCookieName = (): string =>
  isSecureEnv() ? "__Host-session" : "session";

export const getMfaPendingCookieName = (): string =>
  isSecureEnv() ? "__Host-mfa-pending" : "mfa-pending";

// @deprecated SSO_MODE is deprecated, use AUTH_MODE instead
export const getAuthMode = (): string | undefined =>
  process.env.AUTH_MODE || process.env.SSO_MODE;

const NODE_NAME = /^[A-Za-z0-9_-]{1,64}$/;

export const clusterNode = (): string | undefined => {
  const node = process.env.JOTTY_NODE?.trim();
  if (!node) return undefined;
  if (!NODE_NAME.test(node)) {
    throw new Error(`JOTTY_NODE "${node}" can only use letters, numbers, "-" and "_"`);
  }
  return node;
};

export function isDebugFlag(flag: string): boolean {
  const v = process.env.DEBUGGER;
  if (!v || typeof v !== "string") return false;
  const trimmed = v.trim();

  if (trimmed === "*") return true;

  const parts = trimmed.split(",").map((s) => s.trim().toLowerCase());
  return parts.includes(flag.toLowerCase());
}

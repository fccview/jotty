export const OIDC_LOGIN_URL = "/api/oidc/login";
export const OIDC_CALLBACK_PATH = "/api/oidc/callback";
export const LOGIN_PATH = "/auth/login";
export const SSO_ERROR_PARAM = "error";

export enum OidcCookies {
  VERIFIER = "oidc_verifier",
  STATE = "oidc_state",
  NONCE = "oidc_nonce",
}

export enum SsoErrorCodes {
  UNAUTHORIZED = "unauthorized",
  UNREACHABLE = "sso_unreachable",
  MISCONFIGURED = "sso_misconfigured",
  CALLBACK_FAILED = "sso_callback_failed",
}

export const SSO_ERROR_KEYS: Record<SsoErrorCodes, string> = {
  [SsoErrorCodes.UNAUTHORIZED]: "notAuthorized",
  [SsoErrorCodes.UNREACHABLE]: "ssoUnreachable",
  [SsoErrorCodes.MISCONFIGURED]: "ssoMisconfigured",
  [SsoErrorCodes.CALLBACK_FAILED]: "ssoCallbackFailed",
};

const isSsoErrorCode = (code: string): code is SsoErrorCodes =>
  Object.values<string>(SsoErrorCodes).includes(code);

export const ssoErrorKey = (code: string | null): string | null =>
  code && isSsoErrorCode(code) ? SSO_ERROR_KEYS[code] : null;

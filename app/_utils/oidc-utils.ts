import { NextResponse } from "next/server";
import { errors } from "jose";
import { LOGIN_PATH, SSO_ERROR_PARAM, SsoErrorCodes } from "@/app/_consts/sso";

const WELL_KNOWN = ".well-known/openid-configuration";
const SERVER_ERROR_STATUS = 500;
const ACCESS_DENIED = "access_denied";
const INVALID_GRANT = "invalid_grant";
const PROVIDER_DOWN_ERRORS = ["server_error", "temporarily_unavailable"];

export interface OidcDiscovery {
  issuer?: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  jwks_uri?: string;
  userinfo_endpoint?: string;
  end_session_endpoint?: string;
}

type DiscoveryField = keyof OidcDiscovery;

export class SsoFailure extends Error {
  constructor(
    readonly code: SsoErrorCodes,
    message: string,
  ) {
    super(message);
    this.name = "SsoFailure";
  }
}

export const describeError = (error: unknown): string => {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause instanceof Error ? ` (${error.cause.message})` : "";
  return `${error.message}${cause}`;
};

export const loginRedirect = (appUrl: string, code?: SsoErrorCodes) =>
  NextResponse.redirect(
    code ? `${appUrl}${LOGIN_PATH}?${SSO_ERROR_PARAM}=${code}` : `${appUrl}${LOGIN_PATH}`,
  );

export const refuseSso = (
  appUrl: string,
  stage: string,
  error: unknown,
  fallback: SsoErrorCodes,
) => {
  const code = error instanceof SsoFailure ? error.code : fallback;
  console.error(`SSO ${stage} - ${code}: ${describeError(error)}`);
  return loginRedirect(appUrl, code);
};

export const statusFailure = (status: number): SsoErrorCodes =>
  status >= SERVER_ERROR_STATUS ? SsoErrorCodes.UNREACHABLE : SsoErrorCodes.MISCONFIGURED;

export const discoveryUrlFor = (issuer: string): string => {
  if (issuer.includes(WELL_KNOWN)) return issuer;
  return issuer.endsWith("/") ? `${issuer}${WELL_KNOWN}` : `${issuer}/${WELL_KNOWN}`;
};

const hasFields = <K extends DiscoveryField>(
  body: unknown,
  fields: readonly K[],
): body is OidcDiscovery & Record<K, string> => {
  if (typeof body !== "object" || body === null) return false;
  const record: Record<string, unknown> = { ...body };
  return fields.every((field) => typeof record[field] === "string" && record[field] !== "");
};

export const fetchDiscovery = async <K extends DiscoveryField>(
  issuer: string,
  required: readonly K[],
): Promise<OidcDiscovery & Record<K, string>> => {
  const url = discoveryUrlFor(issuer);
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch (error) {
    throw new SsoFailure(
      SsoErrorCodes.UNREACHABLE,
      `discovery request to ${url} failed: ${describeError(error)}`,
    );
  }

  if (!response.ok) {
    throw new SsoFailure(
      statusFailure(response.status),
      `discovery at ${url} answered ${response.status} ${response.statusText}`,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new SsoFailure(
      SsoErrorCodes.MISCONFIGURED,
      `discovery at ${url} is not JSON: ${describeError(error)}`,
    );
  }

  if (!hasFields(body, required)) {
    throw new SsoFailure(
      SsoErrorCodes.MISCONFIGURED,
      `discovery at ${url} is missing one of: ${required.join(", ")}`,
    );
  }

  return body;
};

export const toProviderUrl = (value: string, label: string): URL => {
  try {
    return new URL(value);
  } catch (error) {
    throw new SsoFailure(
      SsoErrorCodes.MISCONFIGURED,
      `${label} "${value}" is not a valid URL: ${describeError(error)}`,
    );
  }
};

export const providerErrorCode = (oauthError: string): SsoErrorCodes => {
  if (oauthError === ACCESS_DENIED) return SsoErrorCodes.UNAUTHORIZED;
  if (PROVIDER_DOWN_ERRORS.includes(oauthError)) return SsoErrorCodes.UNREACHABLE;
  return SsoErrorCodes.MISCONFIGURED;
};

export const tokenErrorCode = (status: number, oauthError?: string): SsoErrorCodes => {
  if (status >= SERVER_ERROR_STATUS) return SsoErrorCodes.UNREACHABLE;
  if (oauthError === INVALID_GRANT) return SsoErrorCodes.CALLBACK_FAILED;
  return SsoErrorCodes.MISCONFIGURED;
};

export const jwtErrorCode = (error: unknown): SsoErrorCodes => {
  if (error instanceof errors.JWKSTimeout) return SsoErrorCodes.UNREACHABLE;
  if (error instanceof errors.JOSEError) return SsoErrorCodes.MISCONFIGURED;
  return SsoErrorCodes.UNREACHABLE;
};

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getEnvOrFile } from "@/app/_server/actions/file";
import { isSecureEnv, isDebugFlag, getAuthMode } from "@/app/_utils/env-utils";
import { OIDC_CALLBACK_PATH, OidcCookies, SsoErrorCodes } from "@/app/_consts/sso";
import {
  SsoFailure,
  fetchDiscovery,
  loginRedirect,
  refuseSso,
  toProviderUrl,
} from "@/app/_utils/oidc-utils";

const debugProxy = isDebugFlag("proxy");
const OIDC_COOKIE_MAX_AGE = 600;

export const dynamic = "force-dynamic";

const base64UrlEncode = (buffer: Buffer) =>
  buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const sha256 = (input: string) => crypto.createHash("sha256").update(input).digest();

const startLogin = async (appUrl: string) => {
  let issuer = process.env.OIDC_ISSUER || "";
  if (issuer && !issuer.endsWith("/")) {
    issuer = `${issuer}/`;
  }
  const clientId = await getEnvOrFile("OIDC_CLIENT_ID", "OIDC_CLIENT_ID_FILE");

  if (!issuer || !clientId) {
    throw new SsoFailure(
      SsoErrorCodes.MISCONFIGURED,
      `${issuer ? "OIDC_CLIENT_ID" : "OIDC_ISSUER"} is not set`,
    );
  }

  const discovery = await fetchDiscovery(issuer, ["authorization_endpoint"]);
  const url = toProviderUrl(discovery.authorization_endpoint, "authorization_endpoint");

  const verifier = base64UrlEncode(crypto.randomBytes(32));
  const challenge = base64UrlEncode(sha256(verifier));
  const state = base64UrlEncode(crypto.randomBytes(16));
  const nonce = base64UrlEncode(crypto.randomBytes(16));

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${appUrl}${OIDC_CALLBACK_PATH}`);

  const groupsScope = process.env.OIDC_GROUPS_SCOPE ?? "groups";
  const baseScope = "openid profile email";

  const shouldIncludeGroupsScope =
    process.env.OIDC_ADMIN_GROUPS &&
    groupsScope &&
    groupsScope.toLowerCase() !== "no" &&
    groupsScope.toLowerCase() !== "false";

  url.searchParams.set(
    "scope",
    shouldIncludeGroupsScope ? `${baseScope} ${groupsScope}` : baseScope,
  );
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);

  if (debugProxy) {
    console.log("SSO LOGIN - url", url);
  }

  const cookieOptions = {
    httpOnly: true,
    secure: isSecureEnv(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: OIDC_COOKIE_MAX_AGE,
  };

  const response = NextResponse.redirect(url);
  response.cookies.set(OidcCookies.VERIFIER, verifier, cookieOptions);
  response.cookies.set(OidcCookies.STATE, state, cookieOptions);
  response.cookies.set(OidcCookies.NONCE, nonce, cookieOptions);
  return response;
};

export async function GET(request: NextRequest) {
  const authMode = getAuthMode();
  const appUrl = process.env.APP_URL || request.nextUrl.origin;

  if (authMode && authMode?.toLowerCase() !== "oidc") {
    if (debugProxy) {
      console.log("SSO LOGIN - ssoMode is not oidc");
    }

    return loginRedirect(appUrl);
  }

  try {
    return await startLogin(appUrl);
  } catch (error) {
    return refuseSso(appUrl, "LOGIN", error, SsoErrorCodes.MISCONFIGURED);
  }
}

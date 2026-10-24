import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getEnvOrFile } from "@/app/_server/actions/file";
import { getAuthMode } from "@/app/_utils/env-utils";
import { ensureUser } from "@/app/_server/actions/users/ensure-user";
import { jwtVerify, createRemoteJWKSet, decodeJwt } from "jose";
import { createSession } from "@/app/_server/actions/session/store";
import {
  ensureCorDirsAndFiles,
  readJsonFile,
} from "@/app/_server/actions/file";
import { USERS_FILE } from "@/app/_consts/files";
import { logAudit } from "@/app/_server/actions/log";
import { isDebugFlag, isSecureEnv, getSessionCookieName } from "@/app/_utils/env-utils";
import { OIDC_CALLBACK_PATH, OidcCookies, SsoErrorCodes } from "@/app/_consts/sso";
import {
  SsoFailure,
  describeError,
  fetchDiscovery,
  jwtErrorCode,
  loginRedirect,
  providerErrorCode,
  refuseSso,
  tokenErrorCode,
  toProviderUrl,
} from "@/app/_utils/oidc-utils";

const debugProxy = isDebugFlag("proxy");

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function checkClaims(
  allowedClaimValues: string | undefined,
  availableClaimValues: string[] | string,
) {
  let available: string[] = [];
  if (Array.isArray(availableClaimValues)) {
    available = availableClaimValues;
  } else if (typeof availableClaimValues === "string") {
    available = availableClaimValues.split(/[\s,]+/).filter(Boolean);
  }

  const filteredAllowedClaimValues: string[] = (allowedClaimValues || "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);

  const isAllowed =
    filteredAllowedClaimValues.length > 0 &&
    filteredAllowedClaimValues.some((g) => available.includes(g));

  return isAllowed;
}

const readOauthError = async (response: Response): Promise<string | undefined> => {
  try {
    const body: { error?: unknown } = await response.json();
    return typeof body.error === "string" ? body.error : undefined;
  } catch (error) {
    console.error("SSO CALLBACK - token error response is not JSON:", describeError(error));
    return undefined;
  }
};

const completeLogin = async (request: NextRequest, appUrl: string) => {
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

  const params = request.nextUrl.searchParams;
  const providerError = params.get("error");
  if (providerError) {
    throw new SsoFailure(
      providerErrorCode(providerError),
      `provider returned "${providerError}": ${params.get("error_description") || "no description"}`,
    );
  }

  const code = params.get("code");
  const state = params.get("state");
  const savedState = request.cookies.get(OidcCookies.STATE)?.value;
  const verifier = request.cookies.get(OidcCookies.VERIFIER)?.value;
  const nonce = request.cookies.get(OidcCookies.NONCE)?.value;
  if (!code || !state || !savedState || state !== savedState || !verifier) {
    throw new SsoFailure(
      SsoErrorCodes.CALLBACK_FAILED,
      "missing code, state or verifier, or state mismatch (expired login, blocked cookies or another tab)",
    );
  }

  const discovery = await fetchDiscovery(issuer, ["token_endpoint", "jwks_uri"]);
  const tokenEndpoint = toProviderUrl(discovery.token_endpoint, "token_endpoint");
  const oidcIssuer = discovery.issuer;

  const JWKS = createRemoteJWKSet(toProviderUrl(discovery.jwks_uri, "jwks_uri"));

  const redirectUri = `${appUrl}${OIDC_CALLBACK_PATH}`;
  const clientSecret = await getEnvOrFile(
    "OIDC_CLIENT_SECRET",
    "OIDC_CLIENT_SECRET_FILE",
  );
  const body = new URLSearchParams();

  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set("redirect_uri", redirectUri);
  body.set("client_id", clientId);
  body.set("code_verifier", verifier);

  if (clientSecret) {
    body.set("client_secret", clientSecret);
  }

  let tokenRes: Response;
  try {
    tokenRes = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (error) {
    throw new SsoFailure(
      SsoErrorCodes.UNREACHABLE,
      `token request to ${tokenEndpoint.origin} failed: ${describeError(error)}`,
    );
  }

  if (!tokenRes.ok) {
    const oauthError = await readOauthError(tokenRes);
    throw new SsoFailure(
      tokenErrorCode(tokenRes.status, oauthError),
      `token endpoint answered ${tokenRes.status} ${oauthError || tokenRes.statusText} (check client id, client secret and redirect URI)`,
    );
  }

  let token: { id_token?: string; access_token?: string };
  try {
    token = await tokenRes.json();
  } catch (error) {
    throw new SsoFailure(
      SsoErrorCodes.MISCONFIGURED,
      `token response is not JSON: ${describeError(error)}`,
    );
  }
  const idToken = token.id_token;
  const accessToken = token.access_token;
  if (!idToken) {
    throw new SsoFailure(
      SsoErrorCodes.MISCONFIGURED,
      "token response has no id_token (is the openid scope allowed for this client?)",
    );
  }

  if (debugProxy) {
    console.log("ID_TOKEN_DEBUG:", {
      tokenLength: idToken.length,
      tokenStart: idToken.substring(0, 50),
      tokenParts: idToken.split(".").length,
      isValidJWT: /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
        idToken,
      ),
    });
  }

  let claims: { [key: string]: any };
  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: oidcIssuer,
      audience: clientId,
      clockTolerance: 5,
    });
    claims = payload;
  } catch (error) {
    if (debugProxy) {
      console.error("ID_TOKEN_ERROR_DEBUG:", {
        tokenLength: idToken?.length,
        tokenStructure: idToken?.split(".").length,
        error: describeError(error),
      });
    }
    throw new SsoFailure(
      jwtErrorCode(error),
      `ID token validation failed: ${describeError(error)}`,
    );
  }

  if (nonce && claims.nonce && claims.nonce !== nonce) {
    throw new SsoFailure(SsoErrorCodes.CALLBACK_FAILED, "ID token nonce does not match");
  }

  const missingIdentityClaims = !claims.preferred_username && !claims.email;
  const missingAuthzClaims = !claims.groups && !claims.roles;
  const needsUserinfo =
    (missingIdentityClaims || missingAuthzClaims) &&
    discovery.userinfo_endpoint &&
    accessToken;

  if (needsUserinfo) {
    try {
      if (debugProxy) {
        console.log(
          "OIDC USERINFO FALLBACK - Critical claims missing from ID token, fetching from userinfo endpoint:",
          {
            hasPreferredUsername: !!claims.preferred_username,
            hasEmail: !!claims.email,
            hasGroups: !!claims.groups,
            hasRoles: !!claims.roles,
            missingIdentityClaims,
            missingAuthzClaims,
            userinfoEndpoint: discovery.userinfo_endpoint,
            hasAccessToken: !!accessToken,
          },
        );
      }

      const userinfoResponse = await fetch(discovery.userinfo_endpoint!, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (userinfoResponse.ok) {
        const contentType = userinfoResponse.headers.get("content-type") || "";
        let userinfoClaims: any;

        if (contentType.includes("jwt")) {
          const jwtString = await userinfoResponse.text();
          userinfoClaims = decodeJwt(jwtString);

          if (debugProxy) {
            console.log(
              "OIDC USERINFO FALLBACK - Received JWT response from userinfo endpoint, decoded claims:",
              userinfoClaims,
            );
          }
        } else {
          userinfoClaims = await userinfoResponse.json();

          if (debugProxy) {
            console.log(
              "OIDC USERINFO FALLBACK - Successfully fetched claims from userinfo endpoint:",
              userinfoClaims,
            );
          }
        }

        claims = { ...userinfoClaims, ...claims };

        await logAudit({
          level: "DEBUG",
          action: "login",
          category: "auth",
          success: true,
          username: "system",
          metadata: {
            oidcUserinfoFallback: true,
            userinfoEndpoint: discovery.userinfo_endpoint,
            claimsFetched: Object.keys(userinfoClaims),
          },
        });
      } else {
        if (debugProxy) {
          console.warn(
            "OIDC USERINFO FALLBACK - Userinfo endpoint request failed, continuing with ID token claims:",
            {
              status: userinfoResponse.status,
              statusText: userinfoResponse.statusText,
            },
          );
        }
      }
    } catch (error) {
      if (debugProxy) {
        console.warn(
          "OIDC USERINFO FALLBACK - Error fetching from userinfo endpoint, continuing with ID token claims:",
          error,
        );
      }
    }
  }

  const preferred = claims.preferred_username as string | undefined;
  const email = claims.email as string | undefined;
  const sub = claims.sub as string | undefined;
  let username =
    preferred || (email ? email.split("@")[0] : undefined) || sub || "";

  if (debugProxy) {
    console.log("SSO CALLBACK - claims", claims);
  }

  if (!username) {
    throw new SsoFailure(
      SsoErrorCodes.MISCONFIGURED,
      "ID token has no preferred_username, email or sub claim",
    );
  }

  const isInAdminGroup = checkClaims(
    process.env.OIDC_ADMIN_GROUPS,
    claims.groups,
  );
  const isInAdminRole = checkClaims(process.env.OIDC_ADMIN_ROLES, claims.roles);

  const isAdmin = isInAdminGroup || isInAdminRole;

  if (debugProxy) {
    console.log("SSO CALLBACK - groups processing:", {
      envOidcAdminGroups: process.env.OIDC_ADMIN_GROUPS,
      envOidcAdminRoles: process.env.OIDC_ADMIN_ROLES,
      claimsGroups: claims.groups,
      claimsRoles: claims.roles,
      isInAdminGroup,
      isInAdminRole,
    });
  }

  if (process.env.OIDC_USER_GROUPS || process.env.OIDC_USER_ROLES) {
    const isInAllowedGroup = checkClaims(
      process.env.OIDC_USER_GROUPS,
      claims.groups,
    );
    const isInAllowedRole = checkClaims(
      process.env.OIDC_USER_ROLES,
      claims.roles,
    );

    if (debugProxy) {
      console.log("SSO CALLBACK - user authorization check:", {
        envOidcUserGroups: process.env.OIDC_USER_GROUPS,
        envOidcUserRoles: process.env.OIDC_USER_ROLES,
        claimsGroups: claims.groups,
        claimsRoles: claims.roles,
        isInAllowedGroup,
        isInAllowedRole,
        isAdmin,
      });
    }

    if (!isInAllowedGroup && !isInAllowedRole && !isAdmin) {
      if (debugProxy) {
        console.log("SSO CALLBACK - user not authorized:", {
          username,
          requiredGroups: process.env.OIDC_USER_GROUPS,
          requiredRoles: process.env.OIDC_USER_ROLES,
          userGroups: claims.groups,
          userRoles: claims.roles,
        });
      }

      await logAudit({
        level: "WARNING",
        action: "login",
        category: "auth",
        success: false,
        username,
        metadata: {
          reason: "user_not_in_allowed_groups",
          requiredGroups: process.env.OIDC_USER_GROUPS,
          requiredRoles: process.env.OIDC_USER_ROLES,
          userGroups: claims.groups,
          userRoles: claims.roles,
        },
      });

      return loginRedirect(appUrl, SsoErrorCodes.UNAUTHORIZED);
    }
  }

  const users = (await readJsonFile(USERS_FILE)) || [];
  if (users.length === 0) {
    await ensureCorDirsAndFiles();
  }

  await ensureUser(username, isAdmin);

  const sessionId = base64UrlEncode(crypto.randomBytes(32));
  const response = NextResponse.redirect(`${appUrl}/`);
  response.cookies.set(getSessionCookieName(), sessionId, {
    httpOnly: true,
    secure: isSecureEnv(),
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  await createSession(sessionId, username, "sso");

  response.cookies.delete(OidcCookies.VERIFIER);
  response.cookies.delete(OidcCookies.STATE);
  response.cookies.delete(OidcCookies.NONCE);
  return response;
};

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL || request.nextUrl.origin;

  if (getAuthMode() !== "oidc") {
    return loginRedirect(appUrl);
  }

  try {
    return await completeLogin(request, appUrl);
  } catch (error) {
    return refuseSso(appUrl, "CALLBACK", error, SsoErrorCodes.CALLBACK_FAILED);
  }
}

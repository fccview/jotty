import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { NOTES_FOLDER } from "@/app/_consts/notes";
import { lock, unlock } from "proper-lockfile";
import { jwtVerify, createRemoteJWKSet, decodeJwt } from "jose";
import { createSession } from "@/app/_server/actions/session";
import { ensureCorDirsAndFiles, readJsonFile } from "@/app/_server/actions/file";
import { USERS_FILE } from "@/app/_consts/files";
import { logAudit } from "@/app/_server/actions/log";

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function checkClaims(allowedClaimValues: string | undefined, availableClaimValues: string[] | string) {
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
    filteredAllowedClaimValues.length > 0 && filteredAllowedClaimValues.some((g) => available.includes(g));

  return isAllowed;
}

async function ensureUser(username: string, isAdmin: boolean) {
  const usersFile = path.join(process.cwd(), "data", "users", "users.json");
  await fs.mkdir(path.dirname(usersFile), { recursive: true });

  await lock(usersFile);
  try {
    let users: any[] = [];
    try {
      const content = await fs.readFile(usersFile, "utf-8");
      if (content) {
        users = JSON.parse(content);
      }
    } catch { }

    if (users.length === 0) {
      users.push({
        username,
        passwordHash: "",
        isAdmin: true,
        isSuperAdmin: true,
        createdAt: new Date().toISOString(),
      });
      if (process.env.DEBUGGER) {
        console.log(
          "SSO CALLBACK - Created first user as super admin:",
          username
        );
      }
    } else {
      const existing = users.find((u) => u.username === username);
      if (!existing) {
        users.push({
          username,
          passwordHash: "",
          isAdmin,
          createdAt: new Date().toISOString(),
        });
        if (process.env.DEBUGGER) {
          console.log("SSO CALLBACK - Created new user:", {
            username,
            isAdmin,
          });
        }
      } else {
        const wasAdmin = existing.isAdmin;
        if (isAdmin && !existing.isAdmin) {
          existing.isAdmin = true;
          if (process.env.DEBUGGER) {
            console.log("SSO CALLBACK - Updated existing user to admin:", {
              username,
              wasAdmin,
              nowAdmin: true,
            });
          }
        } else if (process.env.DEBUGGER) {
          console.log("SSO CALLBACK - User already exists:", {
            username,
            currentIsAdmin: existing.isAdmin,
            requestedAdmin: isAdmin,
          });
        }
      }
    }
    await fs.writeFile(usersFile, JSON.stringify(users, null, 2));
  } finally {
    await unlock(usersFile);
  }

  const checklistDir = path.join(
    process.cwd(),
    "data",
    CHECKLISTS_FOLDER,
    username
  );
  const notesDir = path.join(process.cwd(), "data", NOTES_FOLDER, username);
  await fs.mkdir(checklistDir, { recursive: true });
  await fs.mkdir(notesDir, { recursive: true });
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL || request.nextUrl.origin;

  if (process.env.SSO_MODE !== "oidc") {
    return NextResponse.redirect(`${appUrl}/auth/login`);
  }

  let issuer = process.env.OIDC_ISSUER || "";
  if (issuer && !issuer.endsWith("/")) {
    issuer = `${issuer}/`;
  }
  const clientId = process.env.OIDC_CLIENT_ID || "";
  if (!issuer || !clientId) {
    return NextResponse.redirect(`${appUrl}/auth/login`);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get("oidc_state")?.value;
  const verifier = request.cookies.get("oidc_verifier")?.value;
  const nonce = request.cookies.get("oidc_nonce")?.value;
  if (!code || !state || !savedState || state !== savedState || !verifier) {
    return NextResponse.redirect(`${appUrl}/auth/login`);
  }

  const discoveryUrl = issuer.endsWith("/")
    ? `${issuer}.well-known/openid-configuration`
    : `${issuer}/.well-known/openid-configuration`;
  const discoveryRes = await fetch(discoveryUrl, { cache: "no-store" });
  if (!discoveryRes.ok) {
    return NextResponse.redirect(`${appUrl}/auth/login`);
  }
  const discovery = (await discoveryRes.json()) as {
    token_endpoint: string;
    jwks_uri: string;
    issuer: string;
    userinfo_endpoint?: string;
  };
  const tokenEndpoint = discovery.token_endpoint;
  const jwksUri = discovery.jwks_uri;
  const oidcIssuer = discovery.issuer;

  const JWKS = createRemoteJWKSet(new URL(jwksUri));

  const redirectUri = `${appUrl}/api/oidc/callback`;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;
  const body = new URLSearchParams();

  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set("redirect_uri", redirectUri);
  body.set("client_id", clientId);
  body.set("code_verifier", verifier);

  if (clientSecret) {
    body.set("client_secret", clientSecret);
  }

  const tokenRes = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/auth/login`);
  }
  const token = (await tokenRes.json()) as {
    id_token?: string;
    access_token?: string;
  };
  const idToken = token.id_token;
  const accessToken = token.access_token;
  if (!idToken) {
    return NextResponse.redirect(`${appUrl}/auth/login`);
  }

  if (process.env.DEBUGGER) {
    console.log("ID_TOKEN_DEBUG:", {
      tokenLength: idToken.length,
      tokenStart: idToken.substring(0, 50),
      tokenParts: idToken.split('.').length,
      isValidJWT: /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(idToken)
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
    console.error("ID Token validation failed:", error);
    if (process.env.DEBUGGER) {
      console.error("ID_TOKEN_ERROR_DEBUG:", {
        tokenLength: idToken?.length,
        tokenStructure: idToken?.split('.').length,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    return NextResponse.redirect(`${appUrl}/auth/login`);
  }

  if (nonce && claims.nonce && claims.nonce !== nonce) {
    return NextResponse.redirect(`${appUrl}/auth/login`);
  }

  const missingIdentityClaims = !claims.preferred_username && !claims.email;
  const missingAuthzClaims = !claims.groups && !claims.roles;
  const needsUserinfo =
    (missingIdentityClaims || missingAuthzClaims) &&
    discovery.userinfo_endpoint &&
    accessToken;

  if (needsUserinfo) {
    try {
      if (process.env.DEBUGGER) {
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
          }
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

          if (process.env.DEBUGGER) {
            console.log(
              "OIDC USERINFO FALLBACK - Received JWT response from userinfo endpoint, decoded claims:",
              userinfoClaims
            );
          }
        } else {
          userinfoClaims = await userinfoResponse.json();

          if (process.env.DEBUGGER) {
            console.log(
              "OIDC USERINFO FALLBACK - Successfully fetched claims from userinfo endpoint:",
              userinfoClaims
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
        if (process.env.DEBUGGER) {
          console.warn(
            "OIDC USERINFO FALLBACK - Userinfo endpoint request failed, continuing with ID token claims:",
            {
              status: userinfoResponse.status,
              statusText: userinfoResponse.statusText,
            }
          );
        }
      }
    } catch (error) {
      if (process.env.DEBUGGER) {
        console.warn(
          "OIDC USERINFO FALLBACK - Error fetching from userinfo endpoint, continuing with ID token claims:",
          error
        );
      }
    }
  }

  const preferred = claims.preferred_username as string | undefined;
  const email = claims.email as string | undefined;
  const sub = claims.sub as string | undefined;
  let username =
    preferred || (email ? email.split("@")[0] : undefined) || sub || "";

  if (process.env.DEBUGGER) {
    console.log("SSO CALLBACK - claims", claims);
  }

  if (!username) {
    return NextResponse.redirect(`${appUrl}/auth/login`);
  }

  const isInAdminGroup = checkClaims(process.env.OIDC_ADMIN_GROUPS, claims.groups);
  const isInAdminRole = checkClaims(process.env.OIDC_ADMIN_ROLES, claims.roles);

  const isAdmin = isInAdminGroup || isInAdminRole;

  if (process.env.DEBUGGER) {
    console.log("SSO CALLBACK - groups processing:", {
      envOidcAdminGroups: process.env.OIDC_ADMIN_GROUPS,
      envOidcAdminRoles: process.env.OIDC_ADMIN_ROLES,
      claimsGroups: claims.groups,
      claimsRoles: claims.roles,
      isInAdminGroup,
      isInAdminRole,
    });
  }

  const users = (await readJsonFile(USERS_FILE)) || [];
  if (users.length === 0) {
    await ensureCorDirsAndFiles();
  }

  await ensureUser(username, isAdmin);

  const sessionId = base64UrlEncode(crypto.randomBytes(32));
  const cookieName =
    process.env.NODE_ENV === "production" && process.env.HTTPS === "true"
      ? "__Host-session"
      : "session";
  const response = NextResponse.redirect(`${appUrl}/`);
  response.cookies.set(cookieName, sessionId, {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" && process.env.HTTPS === "true",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  const sessionsFile = path.join(
    process.cwd(),
    "data",
    "users",
    "sessions.json"
  );
  await fs.mkdir(path.dirname(sessionsFile), { recursive: true });

  await lock(sessionsFile);
  try {
    let sessions: Record<string, string> = {};
    try {
      const content = await fs.readFile(sessionsFile, "utf-8");
      if (content) {
        sessions = JSON.parse(content);
      }
    } catch { }
    sessions[sessionId] = username;
    await fs.writeFile(sessionsFile, JSON.stringify(sessions, null, 2));
  } finally {
    await unlock(sessionsFile);
  }

  await createSession(sessionId, username, "sso");

  response.cookies.delete("oidc_verifier");
  response.cookies.delete("oidc_state");
  response.cookies.delete("oidc_nonce");
  return response;
}

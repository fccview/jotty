import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { NOTES_FOLDER } from "@/app/_consts/notes";
import { lock, unlock } from "proper-lockfile";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { createSession } from "@/app/_server/actions/session";

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
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
    } catch {}

    if (users.length === 0) {
      users.push({
        username,
        passwordHash: "",
        isAdmin: true,
        isSuperAdmin: true,
        createdAt: new Date().toISOString(),
      });
    } else {
      const existing = users.find((u) => u.username === username);
      if (!existing) {
        users.push({
          username,
          passwordHash: "",
          isAdmin,
          createdAt: new Date().toISOString(),
        });
      } else if (isAdmin && !existing.isAdmin) {
        existing.isAdmin = true;
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
  const token = (await tokenRes.json()) as { id_token?: string };
  const idToken = token.id_token;
  if (!idToken) {
    return NextResponse.redirect(`${appUrl}/auth/login`);
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
    return NextResponse.redirect(`${appUrl}/auth/login`);
  }

  if (nonce && claims.nonce && claims.nonce !== nonce) {
    return NextResponse.redirect(`${appUrl}/auth/login`);
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

  const groups = (claims.groups || []) as string[];
  const adminGroups = (process.env.OIDC_ADMIN_GROUPS || "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
  const isAdmin =
    adminGroups.length > 0 && groups.some((g) => adminGroups.includes(g));

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
    } catch {}
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

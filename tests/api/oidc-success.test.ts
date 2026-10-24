import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import http from "http";
import { AddressInfo } from "net";
import crypto from "crypto";
import path from "path";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { NextRequest, NextResponse } from "next/server";
import { JWTPayload, SignJWT, exportJWK, generateKeyPair } from "jose";

const { home, root } = vi.hoisted(() => {
  const os = process.getBuiltinModule("os");
  const fs = process.getBuiltinModule("fs");
  const nodePath = process.getBuiltinModule("path");
  const previous = process.cwd();

  process.chdir(fs.mkdtempSync(nodePath.join(os.tmpdir(), "jotty-oidc-success-")));

  return { home: previous, root: process.cwd() };
});

vi.unmock("fs/promises");

const mockLogAudit = vi.fn();

vi.mock("@/app/_server/actions/log", () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
}));

vi.mock("next/headers", () => ({
  cookies: () => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }),
  headers: () => ({
    get: (name: string) => (name === "user-agent" ? "Sso Test Browser" : null),
  }),
}));

import { GET as LOGIN } from "@/app/api/oidc/login/route";
import { GET as CALLBACK } from "@/app/api/oidc/callback/route";
import { OidcCookies, SsoErrorCodes } from "@/app/_consts/sso";
import { SESSION_DATA_FILE, SESSIONS_FILE, USERS_FILE } from "@/app/_consts/files";
import { User } from "@/app/_types";
import { SessionData } from "@/app/_server/actions/session/store";

const APP = "http://jotty.test";
const CLIENT_ID = "jotty-client";
const KID = "test-key";
const REALM = "/realms/jotty";
const ADMIN_GROUP = "jotty-admins";
const USER_GROUP = "jotty-users";
const OIDC_COOKIE_NAMES = Object.values(OidcCookies);

interface Grant {
  nonce: string;
  challenge: string;
  redirectUri: string;
}

interface Provider {
  issuer: string;
  claims: Record<string, unknown>;
  userinfo: Record<string, unknown> | null;
  secret: string | null;
  grants: Map<string, Grant>;
  tokenBodies: URLSearchParams[];
  userinfoCalls: number;
}

let server: http.Server;
let signKey: CryptoKey;
let publicJwk: Record<string, unknown>;

const provider: Provider = {
  issuer: "",
  claims: {},
  userinfo: null,
  secret: null,
  grants: new Map(),
  tokenBodies: [],
  userinfoCalls: 0,
};

const b64url = (buffer: Buffer) => buffer.toString("base64url");
const challengeOf = (verifier: string) =>
  b64url(crypto.createHash("sha256").update(verifier).digest());

const send = (res: http.ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

const readBody = (req: http.IncomingMessage): Promise<string> =>
  new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => resolve(raw));
  });

const signIdToken = (grant: Grant) =>
  new SignJWT({ ...provider.claims, nonce: grant.nonce } as JWTPayload)
    .setProtectedHeader({ alg: "RS256", kid: KID })
    .setIssuer(provider.issuer)
    .setAudience(CLIENT_ID)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(signKey);

const issueTokens = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  const form = new URLSearchParams(await readBody(req));
  provider.tokenBodies.push(form);
  const grant = provider.grants.get(form.get("code") || "");
  const verifier = form.get("code_verifier") || "";

  if (!grant || challengeOf(verifier) !== grant.challenge) {
    return send(res, 400, { error: "invalid_grant" });
  }
  if (form.get("redirect_uri") !== grant.redirectUri || form.get("client_id") !== CLIENT_ID) {
    return send(res, 400, { error: "invalid_request" });
  }
  if (provider.secret !== (form.get("client_secret") ?? null)) {
    return send(res, 401, { error: "invalid_client" });
  }

  provider.grants.delete(form.get("code") || "");
  send(res, 200, {
    token_type: "Bearer",
    access_token: "access-for-test",
    id_token: await signIdToken(grant),
  });
};

const serveUserinfo = (req: http.IncomingMessage, res: http.ServerResponse) => {
  provider.userinfoCalls += 1;
  if (req.headers.authorization !== "Bearer access-for-test" || !provider.userinfo) {
    return send(res, 401, { error: "invalid_token" });
  }
  send(res, 200, provider.userinfo);
};

const route = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  const url = new URL(req.url || "/", provider.issuer);
  const base = url.pathname.replace(REALM, "");

  if (base === "/.well-known/openid-configuration") {
    return send(res, 200, {
      issuer: provider.issuer,
      authorization_endpoint: `${provider.issuer}/protocol/auth`,
      token_endpoint: `${provider.issuer}/protocol/token`,
      jwks_uri: `${provider.issuer}/protocol/certs`,
      userinfo_endpoint: `${provider.issuer}/protocol/userinfo`,
    });
  }
  if (base === "/protocol/certs") return send(res, 200, { keys: [publicJwk] });
  if (base === "/protocol/token" && req.method === "POST") return issueTokens(req, res);
  if (base === "/protocol/userinfo") return serveUserinfo(req, res);
  send(res, 404, { error: "not_found" });
};

const authorize = (location: URL) => {
  const code = b64url(crypto.randomBytes(12));
  provider.grants.set(code, {
    nonce: location.searchParams.get("nonce") || "",
    challenge: location.searchParams.get("code_challenge") || "",
    redirectUri: location.searchParams.get("redirect_uri") || "",
  });
  return code;
};

const cookieHeader = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((line) => line.split(";")[0])
    .join("; ");

const signIn = async () => {
  const login = await LOGIN(new NextRequest(`${APP}/api/oidc/login`));
  const location = new URL(login.headers.get("location") || "");
  const code = authorize(location);
  const state = location.searchParams.get("state") || "";
  const callback = await CALLBACK(
    new NextRequest(`${APP}/api/oidc/callback?code=${code}&state=${state}`, {
      headers: { cookie: cookieHeader(login) },
    }),
  );
  return { login, location, callback };
};

const dataPath = (file: string) => path.join(root, file);
const readJson = <T>(file: string, fallback: T): T =>
  existsSync(dataPath(file)) ? JSON.parse(readFileSync(dataPath(file), "utf-8")) : fallback;
const users = () => readJson<User[]>(USERS_FILE, []);
const userNamed = (name: string) => users().find((user) => user.username === name);
const sessions = () => readJson<Record<string, string>>(SESSIONS_FILE, {});
const sessionMeta = () => readJson<Record<string, SessionData>>(SESSION_DATA_FILE, {});

const seedUsers = (records: Partial<User>[]) => {
  mkdirSync(path.dirname(dataPath(USERS_FILE)), { recursive: true });
  writeFileSync(dataPath(USERS_FILE), JSON.stringify(records));
};

const setCookieLine = (response: Response, name: string) =>
  response.headers.getSetCookie().find((line) => line.startsWith(`${name}=`)) || "";

const expectSignedIn = (callback: NextResponse, username: string, cookieName = "session") => {
  expect(callback.status).toBe(307);
  expect(callback.headers.get("location")).toBe(`${APP}/`);

  const sessionCookie = callback.cookies.get(cookieName);
  expect(sessionCookie?.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(sessionCookie).toMatchObject({
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  const sessionId = sessionCookie?.value || "";
  expect(sessions()[sessionId]).toBe(username);
  expect(sessionMeta()[sessionId]).toMatchObject({
    id: sessionId,
    username,
    loginType: "sso",
    userAgent: "Sso Test Browser",
  });

  OIDC_COOKIE_NAMES.forEach((name) => {
    expect(callback.cookies.get(name)?.value).toBe("");
    expect(setCookieLine(callback, name)).toContain("Expires=Thu, 01 Jan 1970");
  });

  expect(existsSync(path.join(root, "data", "notes", username))).toBe(true);
  expect(existsSync(path.join(root, "data", "checklists", username))).toBe(true);
  return sessionCookie;
};

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  signKey = pair.privateKey;
  publicJwk = { ...(await exportJWK(pair.publicKey)), kid: KID, alg: "RS256", use: "sig" };
  server = http.createServer((req, res) => {
    route(req, res).catch((error) => {
      console.error("test provider blew up:", error);
      send(res, 500, { error: "server_error" });
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  provider.issuer = `http://127.0.0.1:${(server.address() as AddressInfo).port}${REALM}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  process.chdir(home);
  rmSync(root, { recursive: true, force: true });
});

beforeEach(() => {
  rmSync(path.join(root, "data"), { recursive: true, force: true });
  seedUsers([]);
  provider.claims = {};
  provider.userinfo = null;
  provider.secret = null;
  provider.grants.clear();
  provider.tokenBodies = [];
  provider.userinfoCalls = 0;
  mockLogAudit.mockClear();
  vi.stubEnv("AUTH_MODE", "oidc");
  vi.stubEnv("APP_URL", APP);
  vi.stubEnv("OIDC_ISSUER", provider.issuer);
  vi.stubEnv("OIDC_CLIENT_ID", CLIENT_ID);
  vi.stubEnv("OIDC_CLIENT_SECRET", "");
  vi.stubEnv("OIDC_CLIENT_ID_FILE", "");
  vi.stubEnv("OIDC_CLIENT_SECRET_FILE", "");
  vi.stubEnv("OIDC_ADMIN_GROUPS", "");
  vi.stubEnv("OIDC_ADMIN_ROLES", "");
  vi.stubEnv("OIDC_USER_GROUPS", "");
  vi.stubEnv("OIDC_USER_ROLES", "");
  vi.stubEnv("OIDC_GROUPS_SCOPE", undefined);
  vi.stubEnv("HTTPS", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("oidc login hands off to the provider", () => {
  it("builds a PKCE authorization request and parks verifier, state and nonce in cookies", async () => {
    const login = await LOGIN(new NextRequest(`${APP}/api/oidc/login`));
    const location = new URL(login.headers.get("location") || "");

    expect(login.status).toBe(307);
    expect(`${location.origin}${location.pathname}`).toBe(`${provider.issuer}/protocol/auth`);
    expect(Object.fromEntries(location.searchParams)).toMatchObject({
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: `${APP}/api/oidc/callback`,
      scope: "openid profile email",
      code_challenge_method: "S256",
    });

    const verifier = login.cookies.get(OidcCookies.VERIFIER)?.value || "";
    expect(challengeOf(verifier)).toBe(location.searchParams.get("code_challenge"));
    expect(login.cookies.get(OidcCookies.STATE)?.value).toBe(location.searchParams.get("state"));
    expect(login.cookies.get(OidcCookies.NONCE)?.value).toBe(location.searchParams.get("nonce"));
    OIDC_COOKIE_NAMES.forEach((name) =>
      expect(login.cookies.get(name)).toMatchObject({
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      }),
    );
  });

  it("asks for the groups scope only when admin groups are configured", async () => {
    vi.stubEnv("OIDC_ADMIN_GROUPS", ADMIN_GROUP);
    const scopeOf = async () =>
      new URL(
        (await LOGIN(new NextRequest(`${APP}/api/oidc/login`))).headers.get("location") || "",
      ).searchParams.get("scope");

    expect(await scopeOf()).toBe("openid profile email groups");
    vi.stubEnv("OIDC_GROUPS_SCOPE", "memberships");
    expect(await scopeOf()).toBe("openid profile email memberships");
    vi.stubEnv("OIDC_GROUPS_SCOPE", "no");
    expect(await scopeOf()).toBe("openid profile email");
  });

  it("falls back to the request origin when APP_URL is not set", async () => {
    vi.stubEnv("APP_URL", "");
    const login = await LOGIN(new NextRequest("http://origin.test/api/oidc/login"));
    const location = new URL(login.headers.get("location") || "");
    expect(location.searchParams.get("redirect_uri")).toBe("http://origin.test/api/oidc/callback");
  });
});

describe("oidc callback signs people in", () => {
  it("makes the very first SSO user a superadmin using preferred_username", async () => {
    provider.claims = { sub: "sub-alice", preferred_username: "alice", email: "alice@corp.test", groups: [] };
    const { callback } = await signIn();

    expectSignedIn(callback, "alice");
    expect(users()).toHaveLength(1);
    expect(userNamed("alice")).toMatchObject({
      username: "alice",
      passwordHash: "",
      isAdmin: true,
      isSuperAdmin: true,
    });
    expect(provider.userinfoCalls).toBe(0);
  });

  it("signs the first SSO user in on a fresh instance with no users file yet", async () => {
    rmSync(dataPath(USERS_FILE), { force: true });
    provider.claims = { sub: "sub-fresh", preferred_username: "fresh", groups: [] };
    const { callback } = await signIn();

    expectSignedIn(callback, "fresh");
    expect(userNamed("fresh")).toMatchObject({ isAdmin: true, isSuperAdmin: true });
  });

  it("recovers an instance left with an empty users file by the old seeding", async () => {
    writeFileSync(dataPath(USERS_FILE), "");
    provider.claims = { sub: "sub-empty", preferred_username: "empty", groups: [] };
    const { callback } = await signIn();

    expectSignedIn(callback, "empty");
    expect(users()).toHaveLength(1);
  });

  it("refuses to overwrite a users file that is not valid JSON", async () => {
    writeFileSync(dataPath(USERS_FILE), "[{ broken");
    provider.claims = { sub: "sub-broken", preferred_username: "broken", groups: [] };
    const { callback } = await signIn();

    expect(callback.headers.get("location")).toContain("error=");
    expect(readFileSync(dataPath(USERS_FILE), "utf-8")).toBe("[{ broken");
  });

  it("derives the username from the email local part when preferred_username is missing", async () => {
    seedUsers([{ username: "owner", isAdmin: true, isSuperAdmin: true, passwordHash: "x" }]);
    provider.claims = { sub: "sub-bob", email: "bob.smith@corp.test", groups: ["staff"] };
    const { callback } = await signIn();

    expectSignedIn(callback, "bob.smith");
    expect(userNamed("bob.smith")).toMatchObject({ isAdmin: false });
    expect(userNamed("bob.smith")?.isSuperAdmin).toBeUndefined();
    expect(userNamed("owner")).toMatchObject({ isAdmin: true, isSuperAdmin: true, passwordHash: "x" });
  });

  it("promotes a member of OIDC_ADMIN_GROUPS to admin", async () => {
    vi.stubEnv("OIDC_ADMIN_GROUPS", `other, ${ADMIN_GROUP}`);
    seedUsers([{ username: "owner", isAdmin: true, isSuperAdmin: true, passwordHash: "x" }]);
    provider.claims = { sub: "sub-carol", preferred_username: "carol", groups: [ADMIN_GROUP, "staff"] };
    const { location, callback } = await signIn();

    expect(location.searchParams.get("scope")).toBe("openid profile email groups");
    expectSignedIn(callback, "carol");
    expect(userNamed("carol")).toMatchObject({ isAdmin: true });
    expect(userNamed("carol")?.isSuperAdmin).toBeUndefined();
  });

  it("keeps somebody outside OIDC_ADMIN_GROUPS a regular user", async () => {
    vi.stubEnv("OIDC_ADMIN_GROUPS", ADMIN_GROUP);
    seedUsers([{ username: "owner", isAdmin: true, isSuperAdmin: true, passwordHash: "x" }]);
    provider.claims = { sub: "sub-dave", preferred_username: "dave", groups: "staff readers" };
    const { callback } = await signIn();

    expectSignedIn(callback, "dave");
    expect(userNamed("dave")).toMatchObject({ isAdmin: false });
  });

  it("upgrades an existing regular user who is now in the admin group, without duplicating them", async () => {
    vi.stubEnv("OIDC_ADMIN_GROUPS", ADMIN_GROUP);
    seedUsers([
      { username: "owner", isAdmin: true, isSuperAdmin: true, passwordHash: "x" },
      { username: "erin", isAdmin: false, passwordHash: "", createdAt: "2024-01-01T00:00:00.000Z" },
    ]);
    provider.claims = { sub: "sub-erin", preferred_username: "erin", groups: [ADMIN_GROUP] };
    const { callback } = await signIn();

    expectSignedIn(callback, "erin");
    expect(users().filter((user) => user.username === "erin")).toHaveLength(1);
    expect(userNamed("erin")).toMatchObject({ isAdmin: true, createdAt: "2024-01-01T00:00:00.000Z" });
  });

  it("never demotes an existing admin who lost the admin group", async () => {
    vi.stubEnv("OIDC_ADMIN_GROUPS", ADMIN_GROUP);
    seedUsers([
      { username: "owner", isAdmin: true, isSuperAdmin: true, passwordHash: "x" },
      { username: "fran", isAdmin: true, passwordHash: "" },
    ]);
    provider.claims = { sub: "sub-fran", preferred_username: "fran", groups: ["staff"] };
    expectSignedIn((await signIn()).callback, "fran");
    expect(userNamed("fran")).toMatchObject({ isAdmin: true });
  });

  it("promotes through OIDC_ADMIN_ROLES too", async () => {
    vi.stubEnv("OIDC_ADMIN_ROLES", "jotty-admin");
    seedUsers([{ username: "owner", isAdmin: true, isSuperAdmin: true, passwordHash: "x" }]);
    provider.claims = { sub: "sub-gus", preferred_username: "gus", roles: ["jotty-admin"] };
    expectSignedIn((await signIn()).callback, "gus");
    expect(userNamed("gus")).toMatchObject({ isAdmin: true });
  });

  it("fills missing identity and groups from the userinfo endpoint", async () => {
    vi.stubEnv("OIDC_ADMIN_GROUPS", ADMIN_GROUP);
    seedUsers([{ username: "owner", isAdmin: true, isSuperAdmin: true, passwordHash: "x" }]);
    provider.claims = { sub: "sub-hana" };
    provider.userinfo = { sub: "sub-hana", preferred_username: "hana", groups: [ADMIN_GROUP] };
    const { callback } = await signIn();

    expectSignedIn(callback, "hana");
    expect(provider.userinfoCalls).toBe(1);
    expect(userNamed("hana")).toMatchObject({ isAdmin: true });
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ oidcUserinfoFallback: true }) }),
    );
  });

  it("falls back to sub when nobody supplies a name", async () => {
    seedUsers([{ username: "owner", isAdmin: true, isSuperAdmin: true, passwordHash: "x" }]);
    provider.claims = { sub: "sub-ivy", groups: [] };
    expectSignedIn((await signIn()).callback, "sub-ivy");
  });

  it("uses __Host-session with the secure flag behind HTTPS in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("HTTPS", "true");
    provider.claims = { sub: "sub-jo", preferred_username: "jo" };
    const { login, callback } = await signIn();

    OIDC_COOKIE_NAMES.forEach((name) => expect(login.cookies.get(name)?.secure).toBe(true));
    const sessionCookie = expectSignedIn(callback, "jo", "__Host-session");
    expect(sessionCookie?.secure).toBe(true);
    expect(callback.cookies.get("session")).toBeUndefined();
  });
});

describe("oidc client authentication variants", () => {
  it("works as a public PKCE client with no secret", async () => {
    provider.claims = { sub: "s", preferred_username: "pub" };
    expectSignedIn((await signIn()).callback, "pub");

    const body = provider.tokenBodies[0];
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("client_id")).toBe(CLIENT_ID);
    expect(body.get("redirect_uri")).toBe(`${APP}/api/oidc/callback`);
    expect(body.get("code_verifier")).toBeTruthy();
    expect(body.has("client_secret")).toBe(false);
  });

  it("sends OIDC_CLIENT_SECRET alongside the PKCE verifier", async () => {
    vi.stubEnv("OIDC_CLIENT_SECRET", "shh-env");
    provider.secret = "shh-env";
    provider.claims = { sub: "s", preferred_username: "conf" };
    expectSignedIn((await signIn()).callback, "conf");
    expect(provider.tokenBodies[0].get("client_secret")).toBe("shh-env");
    expect(provider.tokenBodies[0].get("code_verifier")).toBeTruthy();
  });

  it("reads the client id and secret from *_FILE variables", async () => {
    const secrets = path.join(root, "secrets");
    mkdirSync(secrets, { recursive: true });
    writeFileSync(path.join(secrets, "id"), `${CLIENT_ID}\n`);
    writeFileSync(path.join(secrets, "secret"), "shh-file\n");
    vi.stubEnv("OIDC_CLIENT_ID", "");
    vi.stubEnv("OIDC_CLIENT_ID_FILE", path.join(secrets, "id"));
    vi.stubEnv("OIDC_CLIENT_SECRET", "ignored-when-file-set");
    vi.stubEnv("OIDC_CLIENT_SECRET_FILE", path.join(secrets, "secret"));
    provider.secret = "shh-file";
    provider.claims = { sub: "s", preferred_username: "filed" };

    expectSignedIn((await signIn()).callback, "filed");
    expect(provider.tokenBodies[0].get("client_secret")).toBe("shh-file");
  });

  it("accepts an issuer given with a trailing slash", async () => {
    vi.stubEnv("OIDC_ISSUER", `${provider.issuer}/`);
    provider.claims = { sub: "s", preferred_username: "slash" };
    expectSignedIn((await signIn()).callback, "slash");
  });
});

describe("oidc allowed groups bouncer", () => {
  beforeEach(() => {
    vi.stubEnv("OIDC_USER_GROUPS", USER_GROUP);
    seedUsers([{ username: "owner", isAdmin: true, isSuperAdmin: true, passwordHash: "x" }]);
  });

  it("lets in a member of OIDC_USER_GROUPS", async () => {
    provider.claims = { sub: "s", preferred_username: "kai", groups: [USER_GROUP] };
    expectSignedIn((await signIn()).callback, "kai");
    expect(userNamed("kai")).toMatchObject({ isAdmin: false });
  });

  it("lets an admin group member in even without the user group", async () => {
    vi.stubEnv("OIDC_ADMIN_GROUPS", ADMIN_GROUP);
    provider.claims = { sub: "s", preferred_username: "lee", groups: [ADMIN_GROUP] };
    expectSignedIn((await signIn()).callback, "lee");
    expect(userNamed("lee")).toMatchObject({ isAdmin: true });
  });

  it("sends an outsider back with ?error=unauthorized and creates nothing", async () => {
    provider.claims = { sub: "s", preferred_username: "mallory", groups: ["contractors"] };
    const before = readFileSync(dataPath(USERS_FILE), "utf-8");
    const { callback } = await signIn();

    expect(callback.status).toBe(307);
    expect(callback.headers.get("location")).toBe(
      `${APP}/auth/login?error=${SsoErrorCodes.UNAUTHORIZED}`,
    );
    expect(callback.cookies.get("session")).toBeUndefined();
    expect(readFileSync(dataPath(USERS_FILE), "utf-8")).toBe(before);
    expect(Object.values(sessions())).not.toContain("mallory");
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "WARNING",
        success: false,
        username: "mallory",
        metadata: expect.objectContaining({ reason: "user_not_in_allowed_groups" }),
      }),
    );
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as LOGIN } from "@/app/api/oidc/login/route";
import { GET as CALLBACK } from "@/app/api/oidc/callback/route";
import { OidcCookies, SSO_ERROR_KEYS, SsoErrorCodes, ssoErrorKey } from "@/app/_consts/sso";
import { providerErrorCode, tokenErrorCode } from "@/app/_utils/oidc-utils";
import en from "@/app/_translations/en.json";

vi.mock("@/app/_server/actions/file", () => ({
  getEnvOrFile: async (envVar: string) => process.env[envVar] || "",
  readJsonFile: vi.fn().mockResolvedValue([]),
  ensureCorDirsAndFiles: vi.fn(),
}));

vi.mock("@/app/_server/actions/users/ensure-user", () => ({ ensureUser: vi.fn() }));
vi.mock("@/app/_server/actions/session/store", () => ({ createSession: vi.fn() }));
vi.mock("@/app/_server/actions/log", () => ({ logAudit: vi.fn() }));

const APP = "http://jotty.test";
const ISSUER = "https://idp.test/realms/jotty";
const SECRET = "super-secret-value";
const STATE = "state-123";
const fetchMock = vi.fn();
const savedEnv = { ...process.env };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const discovery = {
  issuer: ISSUER,
  authorization_endpoint: `${ISSUER}/auth`,
  token_endpoint: `${ISSUER}/token`,
  jwks_uri: `${ISSUER}/certs`,
};

const errorOf = (response: Response) =>
  new URL(response.headers.get("location") || "").searchParams.get("error");

const callback = (query: string, cookies = true) =>
  CALLBACK(
    new NextRequest(`${APP}/api/oidc/callback?${query}`, {
      headers: cookies
        ? { cookie: `${OidcCookies.STATE}=${STATE}; ${OidcCookies.VERIFIER}=v; ${OidcCookies.NONCE}=n` }
        : {},
    }),
  );

const fakeIdToken = () => {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "RS256", kid: "k1" })}.${part({ sub: "alice" })}.c2ln`;
};

beforeEach(() => {
  process.env.AUTH_MODE = "oidc";
  process.env.APP_URL = APP;
  process.env.OIDC_ISSUER = ISSUER;
  process.env.OIDC_CLIENT_ID = "jotty";
  process.env.OIDC_CLIENT_SECRET = SECRET;
  fetchMock.mockReset();
  vi.mocked(console.error).mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  process.env = { ...savedEnv };
  vi.unstubAllGlobals();
});

describe("sso error codes", () => {
  it("maps every code to an English translation", () => {
    Object.values(SsoErrorCodes).forEach((code) => {
      const key = ssoErrorKey(code);
      expect(key).toBe(SSO_ERROR_KEYS[code]);
      expect(en.auth[key as keyof typeof en.auth]).toBeTruthy();
    });
  });

  it("ignores codes it does not know", () => {
    expect(ssoErrorKey("totally_made_up")).toBeNull();
    expect(ssoErrorKey(null)).toBeNull();
  });

  it("sorts provider and token errors into the right bucket", () => {
    expect(providerErrorCode("access_denied")).toBe(SsoErrorCodes.UNAUTHORIZED);
    expect(providerErrorCode("temporarily_unavailable")).toBe(SsoErrorCodes.UNREACHABLE);
    expect(providerErrorCode("unauthorized_client")).toBe(SsoErrorCodes.MISCONFIGURED);
    expect(tokenErrorCode(502)).toBe(SsoErrorCodes.UNREACHABLE);
    expect(tokenErrorCode(400, "invalid_grant")).toBe(SsoErrorCodes.CALLBACK_FAILED);
    expect(tokenErrorCode(401, "invalid_client")).toBe(SsoErrorCodes.MISCONFIGURED);
  });
});

describe("oidc login bouncer", () => {
  it("sends local-only instances to the plain login page", async () => {
    process.env.AUTH_MODE = "local";
    const response = await LOGIN(new NextRequest(`${APP}/api/oidc/login`));
    expect(response.headers.get("location")).toBe(`${APP}/auth/login`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("flags a missing issuer as misconfigured without calling out", async () => {
    delete process.env.OIDC_ISSUER;
    const response = await LOGIN(new NextRequest(`${APP}/api/oidc/login`));
    expect(errorOf(response)).toBe(SsoErrorCodes.MISCONFIGURED);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(String(vi.mocked(console.error).mock.calls[0][0])).toContain("OIDC_ISSUER");
  });

  it("flags a dead provider as unreachable and logs the real cause", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed", { cause: new Error("getaddrinfo ENOTFOUND idp.test") }));
    const response = await LOGIN(new NextRequest(`${APP}/api/oidc/login`));
    expect(response.status).toBe(307);
    expect(errorOf(response)).toBe(SsoErrorCodes.UNREACHABLE);
    expect(String(vi.mocked(console.error).mock.calls[0][0])).toContain("ENOTFOUND");
  });

  it.each([
    [404, SsoErrorCodes.MISCONFIGURED],
    [503, SsoErrorCodes.UNREACHABLE],
  ])("maps a %s discovery answer to %s", async (status, code) => {
    fetchMock.mockResolvedValue(new Response("nope", { status }));
    expect(errorOf(await LOGIN(new NextRequest(`${APP}/api/oidc/login`)))).toBe(code);
  });

  it("flags discovery that is not JSON or lacks endpoints as misconfigured", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html>", { status: 200 }));
    expect(errorOf(await LOGIN(new NextRequest(`${APP}/api/oidc/login`)))).toBe(SsoErrorCodes.MISCONFIGURED);
    fetchMock.mockResolvedValueOnce(json({ issuer: ISSUER }));
    expect(errorOf(await LOGIN(new NextRequest(`${APP}/api/oidc/login`)))).toBe(SsoErrorCodes.MISCONFIGURED);
    fetchMock.mockResolvedValueOnce(json({ authorization_endpoint: "not a url" }));
    expect(errorOf(await LOGIN(new NextRequest(`${APP}/api/oidc/login`)))).toBe(SsoErrorCodes.MISCONFIGURED);
  });

  it("still redirects a healthy provider to its authorization endpoint", async () => {
    fetchMock.mockResolvedValue(json(discovery));
    const response = await LOGIN(new NextRequest(`${APP}/api/oidc/login`));
    const location = new URL(response.headers.get("location") || "");
    expect(location.origin + location.pathname).toBe(discovery.authorization_endpoint);
    expect(location.searchParams.get("redirect_uri")).toBe(`${APP}/api/oidc/callback`);
    expect(response.cookies.get(OidcCookies.STATE)?.value).toBeTruthy();
  });
});

describe("oidc callback bouncer", () => {
  it("treats a provider access_denied as unauthorized", async () => {
    const response = await callback("error=access_denied&error_description=nope");
    expect(errorOf(response)).toBe(SsoErrorCodes.UNAUTHORIZED);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a state mismatch or missing cookies as a failed callback", async () => {
    expect(errorOf(await callback(`code=c&state=other`))).toBe(SsoErrorCodes.CALLBACK_FAILED);
    expect(errorOf(await callback(`code=c&state=${STATE}`, false))).toBe(SsoErrorCodes.CALLBACK_FAILED);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("flags a rejected client secret as misconfigured without leaking it", async () => {
    fetchMock
      .mockResolvedValueOnce(json(discovery))
      .mockResolvedValueOnce(json({ error: "invalid_client" }, 401));
    const response = await callback(`code=c&state=${STATE}`);
    const location = response.headers.get("location") || "";
    expect(errorOf(response)).toBe(SsoErrorCodes.MISCONFIGURED);
    expect(location).not.toContain(SECRET);
    const logged = vi.mocked(console.error).mock.calls.flat().map(String).join(" ");
    expect(logged).toContain("invalid_client");
    expect(logged).not.toContain(SECRET);
  });

  it("flags a reused code as a failed callback", async () => {
    fetchMock
      .mockResolvedValueOnce(json(discovery))
      .mockResolvedValueOnce(json({ error: "invalid_grant" }, 400));
    expect(errorOf(await callback(`code=c&state=${STATE}`))).toBe(SsoErrorCodes.CALLBACK_FAILED);
  });

  it("flags an unreachable token endpoint as unreachable", async () => {
    fetchMock.mockResolvedValueOnce(json(discovery)).mockRejectedValueOnce(new TypeError("fetch failed"));
    expect(errorOf(await callback(`code=c&state=${STATE}`))).toBe(SsoErrorCodes.UNREACHABLE);
  });

  it("flags a token response without an id_token as misconfigured", async () => {
    fetchMock.mockResolvedValueOnce(json(discovery)).mockResolvedValueOnce(json({ access_token: "a" }));
    expect(errorOf(await callback(`code=c&state=${STATE}`))).toBe(SsoErrorCodes.MISCONFIGURED);
  });

  it("flags an unreachable key set as unreachable", async () => {
    fetchMock.mockImplementation(async (url: string | URL) => {
      const target = String(url);
      if (target.endsWith("/certs")) throw new TypeError("fetch failed");
      if (target.endsWith("/token")) return json({ id_token: fakeIdToken() });
      return json(discovery);
    });
    expect(errorOf(await callback(`code=c&state=${STATE}`))).toBe(SsoErrorCodes.UNREACHABLE);
  });

  it("flags a malformed id_token as misconfigured", async () => {
    fetchMock.mockResolvedValueOnce(json(discovery)).mockResolvedValueOnce(json({ id_token: "not.a.jwt" }));
    expect(errorOf(await callback(`code=c&state=${STATE}`))).toBe(SsoErrorCodes.MISCONFIGURED);
  });
});

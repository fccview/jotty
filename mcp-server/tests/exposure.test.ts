import { afterEach, describe, expect, it } from "bun:test";
import { DEFAULT_CONFIG, loadConfig } from "../src/config/load.ts";
import type { ServerConfig } from "../src/config/schema.ts";
import { Transport } from "../src/config/schema.ts";
import { createOriginCheck, exposureRefusal } from "../src/server/exposure.ts";
import { createSidecar, startHttp } from "../src/server/http.ts";
import { makeCtx } from "./helpers.ts";

const server = (overrides: Partial<ServerConfig>): ServerConfig => ({
  ...DEFAULT_CONFIG.server,
  transport: Transport.Http,
  ...overrides,
});

const ask = (headers: Record<string, string>) => new Request("http://x/mcp", { method: "POST", headers });

const ENV_KEYS = ["JOTTY_MCP_BIND_HOST", "JOTTY_MCP_ALLOWED_HOSTS", "JOTTY_MCP_ALLOWED_ORIGINS", "JOTTY_MCP_ALLOW_NO_AUTH"];

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

describe("http exposure", () => {
  it("binds to loopback unless told otherwise", () => {
    expect(loadConfig().server.host).toBe("127.0.0.1");
    process.env.JOTTY_MCP_BIND_HOST = "0.0.0.0";
    expect(loadConfig().server.host).toBe("0.0.0.0");
  });

  it("reads the allow lists and the opt-in", () => {
    process.env.JOTTY_MCP_ALLOWED_HOSTS = "jotty.example.com, mcp.example.com:443";
    process.env.JOTTY_MCP_ALLOWED_ORIGINS = "https://jotty.example.com";
    process.env.JOTTY_MCP_ALLOW_NO_AUTH = "true";

    const { allowedHosts, allowedOrigins, allowNoAuth } = loadConfig().server;
    expect(allowedHosts).toEqual(["jotty.example.com", "mcp.example.com:443"]);
    expect(allowedOrigins).toEqual(["https://jotty.example.com"]);
    expect(allowNoAuth).toBe(true);
  });

  it.each(["", "changeme"])("refuses to expose %j beyond loopback", (authToken) => {
    expect(exposureRefusal(server({ host: "0.0.0.0", authToken }))).toContain("Refusing");
  });

  it("allows a weak token on loopback or with the opt-in", () => {
    expect(exposureRefusal(server({ host: "127.0.0.1", authToken: "" }))).toBeNull();
    expect(exposureRefusal(server({ host: "localhost", authToken: "changeme" }))).toBeNull();
    expect(exposureRefusal(server({ host: "0.0.0.0", authToken: "", allowNoAuth: true }))).toBeNull();
    expect(exposureRefusal(server({ host: "0.0.0.0", authToken: "a-real-secret" }))).toBeNull();
  });

  it("does not start when the refusal applies", () => {
    const ctx = makeCtx("http://127.0.0.1:1");
    ctx.config.server = server({ host: "0.0.0.0", port: 0, authToken: "changeme" });
    expect(() => startHttp(createSidecar(ctx), ctx.config)).toThrow("Refusing");
  });

  it("only answers loopback host names when bound to loopback", () => {
    const check = createOriginCheck(server({ host: "127.0.0.1" }));

    expect(check(ask({ host: "127.0.0.1:3001" }))).toBeNull();
    expect(check(ask({ host: "localhost:3001" }))).toBeNull();
    expect(check(ask({ host: "evil.example:3001" }))).toContain("Host");
  });

  it("refuses browser origins that are neither loopback nor the same host", () => {
    const check = createOriginCheck(server({ host: "0.0.0.0" }));

    expect(check(ask({ host: "nas.lan:1133" }))).toBeNull();
    expect(check(ask({ host: "nas.lan:1133", origin: "http://nas.lan:1133" }))).toBeNull();
    expect(check(ask({ host: "nas.lan:1133", origin: "http://localhost:6274" }))).toBeNull();
    expect(check(ask({ host: "nas.lan:1133", origin: "https://evil.example" }))).toContain("Origin");
  });

  it("follows the configured lists for reverse proxies", () => {
    const check = createOriginCheck(
      server({ host: "0.0.0.0", allowedHosts: ["mcp.example.com"], allowedOrigins: ["https://app.example.com"] }),
    );

    expect(check(ask({ host: "mcp.example.com", origin: "https://app.example.com" }))).toBeNull();
    expect(check(ask({ host: "other.example.com" }))).toContain("Host");
    expect(check(ask({ host: "mcp.example.com", origin: "http://localhost:3000" }))).toContain("Origin");
  });

  it("answers a hostile origin with 403 before touching a session", async () => {
    const ctx = makeCtx("http://127.0.0.1:1");
    ctx.config.server = server({ host: "127.0.0.1", authToken: "secret" });
    const sidecar = createSidecar(ctx);

    const response = await sidecar.fetch(
      new Request("http://127.0.0.1/mcp", {
        method: "POST",
        headers: { host: "127.0.0.1", origin: "https://evil.example", authorization: "Bearer secret" },
        body: "{}",
      }),
    );

    expect(response.status).toBe(403);
    expect(sidecar.pool.size()).toBe(0);
    await sidecar.close();
  });
});

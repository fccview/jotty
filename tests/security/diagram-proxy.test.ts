import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { buildDrawioTarget } from "@/app/_utils/drawio-proxy-utils";
import { GET, POST } from "@/app/api/diagram-proxy/[[...path]]/route";

const mockGetCurrentUser = vi.fn();
const mockGetSettings = vi.fn();

vi.mock("@/app/_server/actions/users", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock("@/app/_server/actions/config", () => ({
  getSettings: () => mockGetSettings(),
}));


const DRAWIO = "https://draw.example.com";
const fetchMock = vi.fn();

const call = (path: string[], url = "http://localhost/api/diagram-proxy/x", init?: ConstructorParameters<typeof NextRequest>[1]) =>
  GET(new NextRequest(url, init), { params: Promise.resolve({ path }) });

const enabled = (drawioUrl = DRAWIO) =>
  mockGetSettings.mockResolvedValue({ editor: { drawioUrl, drawioProxyEnabled: true } });

beforeEach(() => {
  mockGetCurrentUser.mockReset();
  mockGetSettings.mockReset();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response("ok", { headers: { "content-type": "text/plain" } }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("diagram proxy bouncer", () => {
  it("refuses anonymous requests before touching the network", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    enabled();
    const response = await call(["index.html"]);
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses when the admin has not enabled the proxy", async () => {
    mockGetCurrentUser.mockResolvedValue({ username: "alice" });
    mockGetSettings.mockResolvedValue({ editor: { drawioUrl: DRAWIO, drawioProxyEnabled: false } });
    const response = await POST(new NextRequest("http://localhost/api/diagram-proxy/x", { method: "POST", body: "a" }), {
      params: Promise.resolve({ path: ["x"] }),
    });
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("only ever fetches from the configured draw.io origin", async () => {
    mockGetCurrentUser.mockResolvedValue({ username: "alice" });
    enabled();
    await call(["js", "app.min.js"], "http://localhost/api/diagram-proxy/js/app.min.js?v=1");
    expect(String(fetchMock.mock.calls[0][0])).toBe(`${DRAWIO}/js/app.min.js?v=1`);
  });

  it.each([
    [["..", "..", "etc", "passwd"]],
    [["//evil.example.com", "x"]],
    [["@evil.example.com"]],
    [["https://evil.example.com"]],
    [["a?b=1#frag"]],
  ])("keeps %j on the configured host", async (path) => {
    mockGetCurrentUser.mockResolvedValue({ username: "alice" });
    enabled();
    const response = await call(path);
    const fetched = fetchMock.mock.calls[0]?.[0];
    if (fetched) {
      expect(new URL(String(fetched)).origin).toBe(DRAWIO);
    } else {
      expect(response.status).toBe(400);
    }
  });

  it("does not forward cookies or compression preferences upstream", async () => {
    mockGetCurrentUser.mockResolvedValue({ username: "alice" });
    enabled();
    await call(["index.html"], "http://localhost/api/diagram-proxy/index.html", {
      headers: { cookie: "session=secret", authorization: "Bearer x", "accept-encoding": "br, zstd" },
    });
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("cookie")).toBeNull();
    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("accept-encoding")).toBeNull();
  });

  it("does not open the proxy to other origins", async () => {
    mockGetCurrentUser.mockResolvedValue({ username: "alice" });
    enabled();
    const response = await call(["index.html"]);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("points root relative assets in draw.io html back through the proxy", async () => {
    mockGetCurrentUser.mockResolvedValue({ username: "alice" });
    enabled();
    fetchMock.mockResolvedValue(
      new Response('<html><head><script src="/js/app.js"></script><script src="//cdn.example.com/x.js"></script></head></html>', {
        headers: { "content-type": "text/html" },
      }),
    );
    const html = await (await call(["index.html"])).text();
    expect(html).toContain('<base href="/api/diagram-proxy/">');
    expect(html).toContain('src="/api/diagram-proxy/js/app.js"');
    expect(html).toContain('src="//cdn.example.com/x.js"');
  });
});

describe("buildDrawioTarget", () => {
  it("keeps a sub path deployment inside its folder", () => {
    expect(buildDrawioTarget("https://host/drawio/", ["js", "a.js"], "")?.toString()).toBe("https://host/drawio/js/a.js");
    expect(buildDrawioTarget("https://host/drawio", ["..", "admin"], "")).toBeNull();
  });

  it("rejects a broken base url", () => {
    expect(buildDrawioTarget("not a url", ["x"], "")).toBeNull();
  });
});

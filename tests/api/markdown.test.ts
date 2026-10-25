import { describe, it, expect, beforeEach, vi } from "vitest";

vi.unmock("unified");
vi.unmock("unist-util-visit");
vi.unmock("js-beautify");
vi.unmock("@/app/_utils/markdown-utils");

import { mockUser, mockAuthenticateApiKey, resetApiMocks, createMockRequest, getResponseJson } from "./setup";
import { POST } from "@/app/api/markdown/from-html/route";
import { HTML_BODY_LIMIT, HTML_LIMIT } from "@/app/_schemas/api/markdown";

const convert = (body: object) =>
  POST(createMockRequest("POST", "http://localhost:3000/api/markdown/from-html", body));

describe("POST /api/markdown/from-html", () => {
  beforeEach(() => {
    resetApiMocks();
    mockAuthenticateApiKey.mockResolvedValue(mockUser);
  });

  it("converts html with relative links resolved", async () => {
    const response = await convert({ html: '<h1>Hi</h1><p><a href="/x">x</a></p>', baseUrl: "https://example.com/a/b" });
    expect(response.status).toBe(200);
    expect(await getResponseJson(response)).toEqual({
      success: true,
      data: { markdown: "# Hi\n\n[x](https://example.com/x)" },
    });
  });

  it("writes tables the way the owner's editor does", async () => {
    mockAuthenticateApiKey.mockResolvedValue({ ...mockUser, tableSyntax: "html" });
    const body = await getResponseJson(await convert({ html: "<table><tr><th>A</th></tr><tr><td>1</td></tr></table>" }));
    expect(body.data.markdown).toMatch(/^<table>/);
  });

  it.each([
    ["missing html", {}],
    ["empty html", { html: "" }],
    ["a relative base url", { html: "<p>x</p>", baseUrl: "/nope" }],
    ["oversized html", { html: "x".repeat(HTML_LIMIT + 1) }],
  ])("refuses %s", async (_label, body) => {
    const response = await convert(body);
    expect(response.status).toBe(400);
    expect((await getResponseJson(response)).error).toBeTruthy();
  });

  it("refuses a body over the limit before parsing it", async () => {
    const response = await convert({ html: "x".repeat(HTML_BODY_LIMIT) });
    expect(response.status).toBe(413);
    expect((await getResponseJson(response)).error).toBeTruthy();
  });

  it("refuses a declared length over the limit without reading it", async () => {
    const response = await POST(
      createMockRequest("POST", "http://localhost:3000/api/markdown/from-html", { html: "<p>x</p>" }, {
        "content-length": String(HTML_BODY_LIMIT + 1),
      }),
    );
    expect(response.status).toBe(413);
  });

  it("needs an API key", async () => {
    mockAuthenticateApiKey.mockResolvedValue(null);
    expect((await convert({ html: "<p>x</p>" })).status).toBe(401);
  });
});

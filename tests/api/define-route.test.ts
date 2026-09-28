import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";
import {
  mockAuthenticateApiKey,
  resetApiMocks,
  createMockRequest,
  getResponseJson,
} from "./setup";
import { defineRoute, definePublicRoute } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";

const handler = vi.fn();

const route = defineRoute(
  {
    id: "probe",
    method: HttpMethod.POST,
    path: "/probe/{probeId}",
    tag: ApiTag.SYSTEM,
    summary: "Probe",
    params: z.object({ probeId: z.string() }),
    query: z.object({ loud: z.enum(["yes", "no"]).optional() }),
    body: z.object({ title: z.string({ error: "Title is required" }) }),
    responses: {},
  },
  async (input) => {
    handler(input);
    return Response.json({ ok: true });
  },
);

const call = (body: unknown, url = "http://localhost:3000/api/probe/p1") =>
  route(createMockRequest("POST", url, body), {
    params: Promise.resolve({ probeId: "p1" }),
  });

describe("defineRoute", () => {
  beforeEach(() => {
    resetApiMocks();
    handler.mockReset();
    mockAuthenticateApiKey.mockResolvedValue({
      username: "testuser",
      isAdmin: false,
      passwordHash: "hash",
      apiKey: "secret",
      mfaSecret: "totp",
    });
  });

  it("refuses a missing or wrong API key before parsing anything", async () => {
    mockAuthenticateApiKey.mockResolvedValue(null);
    const response = await call({});
    expect(response.status).toBe(401);
    expect((await getResponseJson(response)).error).toBe("Unauthorized");
    expect(handler).not.toHaveBeenCalled();
  });

  it("hands the handler a sanitised user and parsed input", async () => {
    const response = await call({ title: "Milk" }, "http://localhost:3000/api/probe/p1?loud=yes");
    expect(response.status).toBe(200);
    const input = handler.mock.calls[0][0];
    expect(input.user.username).toBe("testuser");
    expect(input.user).not.toHaveProperty("passwordHash");
    expect(input.user).not.toHaveProperty("apiKey");
    expect(input.user).not.toHaveProperty("mfaSecret");
    expect(input.params).toEqual({ probeId: "p1" });
    expect(input.query).toEqual({ loud: "yes" });
    expect(input.body).toEqual({ title: "Milk" });
  });

  it("returns 400 with the first issue as the error message", async () => {
    const response = await call({});
    const data = await getResponseJson(response);
    expect(response.status).toBe(400);
    expect(data.error).toBe("Title is required");
    expect(data.details[0].path).toEqual(["title"]);
  });

  it("returns 400 for a bad query value", async () => {
    const response = await call({ title: "x" }, "http://localhost:3000/api/probe/p1?loud=maybe");
    expect(response.status).toBe(400);
  });

  it("returns 400 when the body is not JSON", async () => {
    const broken = new NextRequest("http://localhost:3000/api/probe/p1", {
      method: "POST",
      headers: { "x-api-key": "test-api-key" },
      body: "{nope",
    });
    const response = await route(broken, {
      params: Promise.resolve({ probeId: "p1" }),
    });
    expect(response.status).toBe(400);
    expect((await getResponseJson(response)).error).toBe("Request body must be valid JSON");
  });

  it("hides thrown errors behind a generic 500", async () => {
    handler.mockImplementation(() => {
      throw new Error("/secret/path/on/disk");
    });
    const response = await call({ title: "x" });
    expect(response.status).toBe(500);
    expect((await getResponseJson(response)).error).toBe("Internal server error");
  });
});

describe("definePublicRoute", () => {
  it("runs without an API key", async () => {
    resetApiMocks();
    const open = definePublicRoute(
      {
        id: "open",
        method: HttpMethod.GET,
        path: "/open",
        tag: ApiTag.SYSTEM,
        summary: "Open",
        responses: {},
      },
      async ({ user }) => Response.json({ user }),
    );
    const response = await open(createMockRequest("GET", "http://localhost:3000/api/open", undefined, { "x-api-key": "" }));
    expect(response.status).toBe(200);
    expect(mockAuthenticateApiKey).not.toHaveBeenCalled();
    expect(open.contract.auth).toBe("public");
  });
});

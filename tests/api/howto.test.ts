import { describe, it, expect, beforeEach } from "vitest";
import {
  mockUser,
  mockAuthenticateApiKey,
  mockReadFile,
  resetApiMocks,
  createMockRequest,
  getResponseJson,
} from "./setup";

import { GET as LIST } from "@/app/api/howto/route";
import { GET as READ } from "@/app/api/howto/[docId]/route";
import { getHowtoGuides } from "@/app/_utils/howto-utils";

const GUIDE = "# Garden guide\n\nPlant things.\n";

const read = (docId: string, query = "") =>
  READ(createMockRequest("GET", `http://localhost:3000/api/howto/${docId}${query}`), {
    params: Promise.resolve({ docId }),
  });

describe("how-to guides over the API", () => {
  beforeEach(() => {
    resetApiMocks();
    mockAuthenticateApiKey.mockResolvedValue(mockUser);
    mockReadFile.mockResolvedValue(GUIDE);
  });

  it("lists every guide in the app's registry with its heading as the title", async () => {
    const body = await getResponseJson(await LIST(createMockRequest("GET", "http://localhost:3000/api/howto")));
    const ids = getHowtoGuides((key: string) => key).map((guide) => guide.id);
    expect(body.total).toBe(ids.length);
    expect(body.docs[0]).toEqual({ id: ids[0], title: "Garden guide" });
  });

  it("reads one guide, in parts when asked", async () => {
    const whole = await getResponseJson(await read("mcp"));
    const part = await getResponseJson(await read("mcp", "?limit=8"));
    expect(whole).toEqual({ id: "mcp", title: "Garden guide", content: GUIDE, contentLength: GUIDE.length });
    expect(part).toMatchObject({ content: "# Garden", nextOffset: 8 });
    expect(mockReadFile).toHaveBeenCalledWith(expect.stringMatching(/howto[\\/]MCP\.md$/));
  });

  it("only opens files from the registry", async () => {
    const response = await read("..%2F..%2Fdata%2Fusers%2Fusers.json");
    expect(response.status).toBe(404);
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it("needs an API key", async () => {
    mockAuthenticateApiKey.mockResolvedValue(null);
    expect((await read("mcp")).status).toBe(401);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import {
  mockUser,
  mockAuthenticateApiKey,
  mockGetUserNotes,
  mockGetUserChecklists,
  mockGetNoteById,
  mockSpliceNote,
  resetApiMocks,
  createMockRequest,
  getResponseJson,
} from "./setup";
import { GET as LIST } from "@/app/api/notes/route";
import { GET as BATCH } from "@/app/api/notes/batch/route";
import { NOTES_BATCH_MAX } from "@/app/_schemas/api/notes";
import { GET as READ, PATCH } from "@/app/api/notes/[noteId]/route";
import { POST as TAG } from "@/app/api/notes/[noteId]/tags/route";
import { GET as TAGS } from "@/app/api/tags/route";
import { MANAGED_WARNING } from "@/app/_consts/notes";
import { FIND_AMBIGUOUS } from "@/app/_utils/note-edits";
import { SPLICE_DENIED, SPLICE_ENCRYPTED, SPLICE_UNCHANGED } from "@/app/_server/actions/note/splice";

const NOTE = "aaaaaaaa-1111-4222-8333-944455556666";
const OTHER = "bbbbbbbb-1111-4222-8333-944455556666";
const params = { params: Promise.resolve({ noteId: NOTE }) };

const stored = {
  id: "garden-plan",
  uuid: NOTE,
  title: "Garden plan",
  category: "Home",
  content: "0123456789",
  owner: "testuser",
  tags: ["garden"],
  extraMetadata: { managed: true },
};

const spliced = (extra = {}) => ({
  success: true,
  data: { uuid: NOTE, title: "Garden plan", category: "Home", tags: ["garden"], managed: false, ...extra },
});

describe("note edits over the API", () => {
  beforeEach(() => {
    resetApiMocks();
    mockAuthenticateApiKey.mockResolvedValue(mockUser);
  });

  describe("GET /api/notes/{noteId}", () => {
    it("returns the whole content with its length, tags and the managed flag", async () => {
      mockGetNoteById.mockResolvedValue(stored);
      const body = await getResponseJson(await READ(createMockRequest("GET", `/api/notes/${NOTE}`), params));
      expect(body.data).toMatchObject({ content: "0123456789", contentLength: 10, tags: ["garden"], managed: true });
      expect(body.data.nextOffset).toBeUndefined();
    });

    it("pages through long content with offset and limit", async () => {
      mockGetNoteById.mockResolvedValue(stored);
      const first = await getResponseJson(
        await READ(createMockRequest("GET", `/api/notes/${NOTE}?limit=4`), params),
      );
      const last = await getResponseJson(
        await READ(createMockRequest("GET", `/api/notes/${NOTE}?offset=8&limit=4`), params),
      );
      expect(first.data).toMatchObject({ content: "0123", contentLength: 10, nextOffset: 4 });
      expect(last.data).toMatchObject({ content: "89", contentLength: 10 });
      expect(last.data.nextOffset).toBeUndefined();
    });
  });

  describe("GET /api/notes", () => {
    const notes = [
      { ...stored, uuid: NOTE, tags: ["home/garden"] },
      { ...stored, uuid: OTHER, title: "Work log", tags: ["work"], extraMetadata: undefined },
    ];

    it("filters by tag, nested tags included", async () => {
      mockGetUserNotes.mockResolvedValue({ success: true, data: notes });
      const body = await getResponseJson(await LIST(createMockRequest("GET", "/api/notes?tag=home")));
      expect(body.notes).toHaveLength(1);
      expect(body.notes[0]).toMatchObject({ id: NOTE, tags: ["home/garden"], managed: true });
    });
  });

  describe("GET /api/notes/batch", () => {
    const notes = [
      { ...stored, uuid: NOTE },
      { ...stored, uuid: OTHER, title: "Work log", content: "log", extraMetadata: undefined },
    ];
    const batch = async (ids: string) =>
      BATCH(createMockRequest("GET", `/api/notes/batch?ids=${encodeURIComponent(ids)}`));

    it("reads several notes by id in the order asked, with their length", async () => {
      mockGetUserNotes.mockResolvedValue({ success: true, data: notes });
      const body = await getResponseJson(await batch(`${OTHER.toUpperCase()}, ${NOTE}`));
      expect(body.notes).toMatchObject([
        { id: OTHER, content: "log", contentLength: 3 },
        { id: NOTE, content: "0123456789", contentLength: 10, managed: true },
      ]);
      expect(body.missing).toEqual([]);
    });

    it("lists unknown ids under missing instead of failing", async () => {
      mockGetUserNotes.mockResolvedValue({ success: true, data: notes });
      const response = await batch(`${NOTE},nope,${NOTE}`);
      expect(response.status).toBe(200);
      const body = await getResponseJson(response);
      expect(body.notes.map((note: { id: string }) => note.id)).toEqual([NOTE]);
      expect(body.missing).toEqual(["nope"]);
    });

    it("refuses an empty list and too many ids", async () => {
      expect((await batch("")).status).toBe(400);
      const many = Array.from({ length: NOTES_BATCH_MAX + 1 }, (_, i) => `id-${i}`).join(",");
      expect((await batch(many)).status).toBe(400);
    });
  });

  describe("PATCH /api/notes/{noteId}", () => {
    it("runs the find and replace inside the note's splice", async () => {
      mockSpliceNote.mockImplementation(async (_user, _uuid, edit) => {
        expect(edit("keep old keep")).toEqual({ body: "keep new keep" });
        return spliced();
      });
      const response = await PATCH(
        createMockRequest("PATCH", `/api/notes/${NOTE}`, { find: "old", replace: "new" }),
        params,
      );
      expect(response.status).toBe(200);
      expect(mockSpliceNote).toHaveBeenCalledWith(mockUser, NOTE, expect.any(Function));
      expect((await getResponseJson(response)).warning).toBeUndefined();
    });

    it("warns when a script manages the note", async () => {
      mockSpliceNote.mockResolvedValue(spliced({ managed: true }));
      const body = await getResponseJson(
        await PATCH(createMockRequest("PATCH", `/api/notes/${NOTE}`, { find: "a", replace: "b" }), params),
      );
      expect(body.warning).toBe(MANAGED_WARNING);
    });

    it.each([
      [FIND_AMBIGUOUS, 400],
      [SPLICE_ENCRYPTED, 400],
      [SPLICE_DENIED, 403],
    ])("turns %s into a %i", async (error, status) => {
      mockSpliceNote.mockResolvedValue({ success: false, error });
      const response = await PATCH(
        createMockRequest("PATCH", `/api/notes/${NOTE}`, { find: "a", replace: "b" }),
        params,
      );
      expect(response.status).toBe(status);
    });

    it("needs a find text", async () => {
      const response = await PATCH(createMockRequest("PATCH", `/api/notes/${NOTE}`, { replace: "b" }), params);
      expect(response.status).toBe(400);
      expect(mockSpliceNote).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/notes/{noteId}/tags", () => {
    it("adds and removes hashtags without resending the note", async () => {
      mockSpliceNote.mockImplementation(async (_user, _uuid, edit) => {
        expect(edit("Body #old\n")).toEqual({ body: "Body\n\n#new\n" });
        return spliced({ tags: ["new"] });
      });
      const body = await getResponseJson(
        await TAG(createMockRequest("POST", `/api/notes/${NOTE}/tags`, { add: ["#New"], remove: ["old"] }), params),
      );
      expect(body.data).toEqual({ id: NOTE, title: "Garden plan", tags: ["new"], changed: true });
    });

    it("answers without writing when the tags already match", async () => {
      mockSpliceNote.mockResolvedValue({ success: false, error: SPLICE_UNCHANGED });
      mockGetNoteById.mockResolvedValue(stored);
      const body = await getResponseJson(
        await TAG(createMockRequest("POST", `/api/notes/${NOTE}/tags`, { add: ["garden"] }), params),
      );
      expect(body.data).toMatchObject({ tags: ["garden"], changed: false });
      expect(body.warning).toBe(MANAGED_WARNING);
    });

    it("refuses tag names that can't be hashtags", async () => {
      const response = await TAG(
        createMockRequest("POST", `/api/notes/${NOTE}/tags`, { add: ["two words"] }),
        params,
      );
      expect(response.status).toBe(400);
      expect(mockSpliceNote).not.toHaveBeenCalled();
    });

    it("needs add or remove", async () => {
      const response = await TAG(createMockRequest("POST", `/api/notes/${NOTE}/tags`, {}), params);
      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/tags", () => {
    it("counts each tag across notes and checklists", async () => {
      mockGetUserNotes.mockResolvedValue({
        success: true,
        data: [{ uuid: NOTE, tags: ["Garden", "work"] }, { uuid: OTHER, tags: ["garden"] }],
      });
      mockGetUserChecklists.mockResolvedValue({ success: true, data: [{ uuid: "c", tags: ["garden"] }] });

      const body = await getResponseJson(await TAGS(createMockRequest("GET", "/api/tags")));
      expect(body).toEqual({
        tags: [
          { tag: "garden", notes: 2, checklists: 1 },
          { tag: "work", notes: 1, checklists: 0 },
        ],
        total: 2,
      });
    });
  });
});

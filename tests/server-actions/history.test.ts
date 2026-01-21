import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockFs, resetAllMocks, createFormData } from "../setup";

const mockGetCurrentUser = vi.fn();
const mockCheckUserPermission = vi.fn();
const mockGetNoteById = vi.fn();
const mockEnsureRepo = vi.fn();
const mockGetSettings = vi.fn();
const mockExtractYamlMetadata = vi.fn();
const mockGitInstance = {
    raw: vi.fn(),
    show: vi.fn(),
    log: vi.fn(),
};

vi.mock("@/app/_server/actions/users", () => ({
    getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
}));

vi.mock("@/app/_server/actions/sharing", () => ({
    checkUserPermission: (...args: any[]) => mockCheckUserPermission(...args),
}));

vi.mock("@/app/_server/actions/note", () => ({
    getNoteById: (...args: any[]) => mockGetNoteById(...args),
}));

vi.mock("@/app/_server/actions/history", async (importOriginal) => {
    const original = (await importOriginal()) as any;
    return {
        ...original,
        ensureRepo: (...args: any[]) => mockEnsureRepo(...args),
    };
});

vi.mock("simple-git", () => ({
    default: vi.fn(() => mockGitInstance),
}));

vi.mock("@/app/_server/actions/config", () => ({
    getSettings: (...args: any[]) => mockGetSettings(...args),
}));

vi.mock("@/app/_utils/yaml-metadata-utils", () => ({
    extractYamlMetadata: (...args: any[]) => mockExtractYamlMetadata(...args),
}));

import { getHistory, getVersion } from "@/app/_server/actions/history";

describe("History Actions", () => {
    beforeEach(() => {
        resetAllMocks();
        mockGetCurrentUser.mockResolvedValue({ username: "testuser" });
        mockCheckUserPermission.mockResolvedValue(true);
        mockEnsureRepo.mockResolvedValue(undefined);
        mockGetSettings.mockResolvedValue({ editor: { historyEnabled: true } });
        mockExtractYamlMetadata.mockReturnValue({
            metadata: {},
            contentWithoutMetadata: "",
        });
        mockGitInstance.raw.mockResolvedValue("");
        mockGitInstance.show.mockResolvedValue("");
        mockGitInstance.log.mockResolvedValue({ latest: { date: "2024-01-01T00:00:00Z" } });
    });

    describe("getHistory", () => {
        it("should lookup note by UUID to find current category", async () => {
            mockGetNoteById.mockResolvedValue({
                id: "note-id",
                uuid: "test-uuid",
                category: "NewCategory",
                title: "Test Note",
            });

            mockGitInstance.raw.mockResolvedValue(
                "abc123|2024-01-01T00:00:00Z|[update] Test Note\n"
            );

            const result = await getHistory(
                "test-uuid",
                "old-id",
                "OldCategory",
                "testuser"
            );

            expect(mockGetNoteById).toHaveBeenCalledWith(
                "test-uuid",
                undefined,
                "testuser"
            );

            expect(mockGitInstance.raw).toHaveBeenCalledWith(
                expect.arrayContaining([
                    "log",
                    "--follow",
                    expect.anything(),
                    expect.anything(),
                    expect.anything(),
                    expect.anything(),
                    "--",
                    "NewCategory/note-id.md",
                ])
            );

            expect(result.success).toBe(true);
        });

        it("should return error if note not found by UUID", async () => {
            mockGetNoteById.mockResolvedValue(null);

            const result = await getHistory(
                "nonexistent-uuid",
                "note-id",
                "Category",
                "testuser"
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe("Note not found");
        });

        it("should parse git history entries correctly", async () => {
            mockGetNoteById.mockResolvedValue({
                id: "note-id",
                uuid: "test-uuid",
                category: "Category",
                title: "Test Note",
            });

            mockGitInstance.raw.mockResolvedValue(
                "abc123|2024-01-01T00:00:00Z|[create] Test Note\n" +
                "def456|2024-01-02T00:00:00Z|[update] Test Note\n" +
                "ghi789|2024-01-03T00:00:00Z|[move] Test Note: OldCat -> NewCat\n"
            );

            const result = await getHistory(
                "test-uuid",
                "note-id",
                "Category",
                "testuser"
            );

            expect(result.success).toBe(true);
            expect(result.data?.entries).toHaveLength(3);
            expect(result.data?.entries[0].action).toBe("create");
            expect(result.data?.entries[1].action).toBe("update");
            expect(result.data?.entries[2].action).toBe("move");
        });

        it("should handle pagination correctly", async () => {
            mockGetNoteById.mockResolvedValue({
                id: "note-id",
                uuid: "test-uuid",
                category: "Category",
                title: "Test Note",
            });

            const entries = Array.from({ length: 21 }, (_, i) =>
                `hash${i}|2024-01-01T00:00:00Z|[update] Test Note`
            ).join("\n");

            mockGitInstance.raw.mockResolvedValue(entries);

            const result = await getHistory(
                "test-uuid",
                "note-id",
                "Category",
                "testuser",
                1,
                20
            );

            expect(result.success).toBe(true);
            expect(result.data?.entries).toHaveLength(20);
            expect(result.data?.hasMore).toBe(true);
        });

        it("should return error when history is not enabled", async () => {
            mockGetSettings.mockResolvedValue({ editor: { historyEnabled: false } });

            const result = await getHistory(
                "test-uuid",
                "note-id",
                "Category",
                "testuser"
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe("History is not enabled");
        });

        it("should check permissions before returning history", async () => {
            mockCheckUserPermission.mockResolvedValue(false);
            mockGetNoteById.mockResolvedValue({
                id: "note-id",
                uuid: "test-uuid",
                category: "Category",
            });

            const result = await getHistory(
                "test-uuid",
                "note-id",
                "Category",
                "testuser"
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe("Permission denied");
        });
    });

    describe("getVersion", () => {
        it("should validate commit hash format", async () => {
            const result = await getVersion(
                "test-uuid",
                "note-id",
                "Category",
                "testuser",
                "invalid-hash"
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe("Invalid commit hash");
        });

        it("should retrieve version content from git", async () => {
            mockExtractYamlMetadata.mockReturnValue({
                metadata: { uuid: "test-uuid", title: "Test Note" },
                contentWithoutMetadata: "Version content",
            });

            mockGitInstance.raw.mockResolvedValue("Category/note-id.md");
            mockGitInstance.show.mockResolvedValue(
                "---\nuuid: test-uuid\ntitle: Test Note\n---\n\nVersion content"
            );

            const result = await getVersion(
                "test-uuid",
                "note-id",
                "Category",
                "testuser",
                "abc1234"
            );

            expect(result.success).toBe(true);
            expect(result.data?.content).toContain("Version content");
        });

        it("should find file by UUID in commit regardless of category", async () => {
            mockExtractYamlMetadata.mockReturnValue({
                metadata: { uuid: "test-uuid", title: "Test" },
                contentWithoutMetadata: "Content",
            });

            mockGitInstance.raw.mockResolvedValue("OldCategory/note-id.md");
            mockGitInstance.show.mockResolvedValue(
                "---\nuuid: test-uuid\ntitle: Test\n---\n\nContent"
            );

            const result = await getVersion(
                "test-uuid",
                "note-id",
                "NewCategory",
                "testuser",
                "abc1234"
            );

            expect(result.success).toBe(true);
        });
    });
});

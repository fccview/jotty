import { vi } from "vitest";
import { NextRequest } from "next/server";
import { Modes } from "@/app/_types/enums";

export const mockUser = {
  username: "testuser",
  isAdmin: false,
  isSuperAdmin: false,
};

export const mockAuthenticateApiKey = vi.fn();
export const mockGetUserNotes = vi.fn();
export const mockCreateNote = vi.fn();
export const mockUpdateNote = vi.fn();
export const mockDeleteNote = vi.fn();
export const mockGetUserChecklists = vi.fn();
export const mockCreateList = vi.fn();
export const mockMakeList = vi.fn();
export const mockMakeNote = vi.fn();
export const mockUpdateList = vi.fn();
export const mockDeleteList = vi.fn();
export const mockGetListById = vi.fn();
export const mockCreateItem = vi.fn();
export const mockUpdateItem = vi.fn();
export const mockDeleteItem = vi.fn();
export const mockUpdateItemStatus = vi.fn();
export const mockGetCategories = vi.fn();
export const mockIsAdmin = vi.fn();
export const mockServerWriteFile = vi.fn();
export const mockFindUserRecord = vi.fn();
export const mockExportAllChecklistsNotes = vi.fn();
export const mockExportUserChecklistsNotes = vi.fn();
export const mockExportAllUsersData = vi.fn();
export const mockExportWholeDataFolder = vi.fn();
export const mockGetExportProgress = vi.fn();
export const mockGetAppSettings = vi.fn();
export const mockResolveApiId = vi.fn();
export const mockLegacyResolve = vi.fn();

vi.mock("@/app/_server/actions/api", () => ({
  authenticateApiKey: (...args: any[]) => mockAuthenticateApiKey(...args),
}));

vi.mock("@/app/_server/actions/note", () => ({
  getUserNotes: (...args: any[]) => mockGetUserNotes(...args),
  createNote: (...args: any[]) => mockCreateNote(...args),
  updateNote: (...args: any[]) => mockUpdateNote(...args),
  deleteNote: (...args: any[]) => mockDeleteNote(...args),
}));

vi.mock("@/app/_server/actions/checklist", () => ({
  getUserChecklists: (...args: any[]) => mockGetUserChecklists(...args),
  createList: (...args: any[]) => mockCreateList(...args),
  updateList: (...args: any[]) => mockUpdateList(...args),
  deleteList: (...args: any[]) => mockDeleteList(...args),
  getListById: (...args: any[]) => mockGetListById(...args),
}));

vi.mock("@/app/_server/actions/checklist/creator", () => ({
  makeList: (...args: any[]) => mockMakeList(...args),
}));

vi.mock("@/app/_server/actions/note/creator", () => ({
  makeNote: (...args: any[]) => mockMakeNote(...args),
}));

vi.mock("@/app/_server/actions/checklist-item", () => ({
  createItem: (...args: any[]) => mockCreateItem(...args),
  updateItem: (...args: any[]) => mockUpdateItem(...args),
  deleteItem: (...args: any[]) => mockDeleteItem(...args),
  updateItemStatus: (...args: any[]) => mockUpdateItemStatus(...args),
}));

vi.mock("@/app/_server/actions/category", () => ({
  getCategories: (...args: any[]) => mockGetCategories(...args),
}));

vi.mock("@/app/_server/actions/users", () => ({
  isAdmin: (...args: any[]) => mockIsAdmin(...args),
}));

vi.mock("@/app/_server/actions/users/records", () => ({
  findUserRecord: (...args: any[]) => mockFindUserRecord(...args),
}));

vi.mock("@/app/_server/actions/file", () => ({
  serverWriteFile: (...args: any[]) => mockServerWriteFile(...args),
}));

vi.mock("@/app/_server/actions/export", () => ({
  exportAllChecklistsNotes: (...args: any[]) =>
    mockExportAllChecklistsNotes(...args),
  exportUserChecklistsNotes: (...args: any[]) =>
    mockExportUserChecklistsNotes(...args),
  exportAllUsersData: (...args: any[]) => mockExportAllUsersData(...args),
  exportWholeDataFolder: (...args: any[]) => mockExportWholeDataFolder(...args),
  getExportProgress: (...args: any[]) => mockGetExportProgress(...args),
}));

vi.mock("@/app/_server/actions/config", () => ({
  getAppSettings: (...args: any[]) => mockGetAppSettings(...args),
}));

vi.mock("@/app/_server/actions/lib/legacy-lookup", () => ({
  resolveApiId: (...args: any[]) => mockResolveApiId(...args),
  legacyResolve: (...args: any[]) => mockLegacyResolve(...args),
}));

export function resetApiMocks() {
  vi.clearAllMocks();
  mockAuthenticateApiKey.mockReset();
  mockGetUserNotes.mockReset();
  mockCreateNote.mockReset();
  mockUpdateNote.mockReset();
  mockDeleteNote.mockReset();
  mockGetUserChecklists.mockReset();
  mockCreateList.mockReset();
  mockMakeList.mockReset();
  mockMakeNote.mockReset();
  mockUpdateList.mockReset();
  mockDeleteList.mockReset();
  mockGetListById.mockReset();
  mockCreateItem.mockReset();
  mockUpdateItem.mockReset();
  mockDeleteItem.mockReset();
  mockUpdateItemStatus.mockReset();
  mockGetCategories.mockReset();
  mockIsAdmin.mockReset();
  mockServerWriteFile.mockReset();
  mockFindUserRecord.mockReset();
  mockExportAllChecklistsNotes.mockReset();
  mockExportUserChecklistsNotes.mockReset();
  mockExportAllUsersData.mockReset();
  mockExportWholeDataFolder.mockReset();
  mockGetExportProgress.mockReset();
  mockGetAppSettings.mockReset();
  mockLegacyResolve.mockReset();
  mockResolveApiId.mockReset();
  mockResolveApiId.mockImplementation(async (_mode: Modes, param: string) => param);
}

export function createMockRequest(
  method: string,
  url: string,
  body?: any,
  headers: Record<string, string> = {},
): NextRequest {
  const requestHeaders = new Headers({
    "Content-Type": "application/json",
    "x-api-key": "test-api-key",
    ...headers,
  });

  const requestInit: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(
    new URL(url, "http://localhost:3000"),
    requestInit as any,
  );
}

export async function getResponseJson(response: Response) {
  return response.json();
}

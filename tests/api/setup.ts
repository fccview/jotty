import { vi } from "vitest";
import { NextRequest } from "next/server";

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
export const mockGetUserByUsername = vi.fn();
export const mockExportAllChecklistsNotes = vi.fn();
export const mockExportUserChecklistsNotes = vi.fn();
export const mockExportAllUsersData = vi.fn();
export const mockExportWholeDataFolder = vi.fn();
export const mockGetExportProgress = vi.fn();

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
  getUserByUsername: (...args: any[]) => mockGetUserByUsername(...args),
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

export function resetApiMocks() {
  vi.clearAllMocks();
  mockAuthenticateApiKey.mockReset();
  mockGetUserNotes.mockReset();
  mockCreateNote.mockReset();
  mockUpdateNote.mockReset();
  mockDeleteNote.mockReset();
  mockGetUserChecklists.mockReset();
  mockCreateList.mockReset();
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
  mockGetUserByUsername.mockReset();
  mockExportAllChecklistsNotes.mockReset();
  mockExportUserChecklistsNotes.mockReset();
  mockExportAllUsersData.mockReset();
  mockExportWholeDataFolder.mockReset();
  mockGetExportProgress.mockReset();
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

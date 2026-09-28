import { vi } from "vitest";
import { NextRequest } from "next/server";
import { Modes } from "@/app/_types/enums";

export const mockUser = {
  username: "testuser",
  isAdmin: false,
  isSuperAdmin: false,
};

export const mockAuthenticateApiKey = vi.fn();
export const mockEditNote = vi.fn();
export const mockDropNote = vi.fn();
export const mockEditList = vi.fn();
export const mockDropList = vi.fn();
export const mockAddItem = vi.fn();
export const mockEditItem = vi.fn();
export const mockStampStatus = vi.fn();
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
export const mockGetCurrentUser = vi.fn();
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
export const mockRemoveItem = vi.fn();
export const mockGraftItem = vi.fn();
export const mockRestatus = vi.fn();
export const mockAssignItem = vi.fn();
export const mockRemindItem = vi.fn();
export const mockCanReach = vi.fn();

vi.mock("@/app/_server/actions/api", () => ({
  authenticateApiKey: (...args: any[]) => mockAuthenticateApiKey(...args),
}));

vi.mock("@/app/_server/actions/note/queries", () => ({
  getUserNotes: (...args: any[]) => mockGetUserNotes(...args),
}));

vi.mock("@/app/_server/actions/note", () => ({
  createNote: (...args: any[]) => mockCreateNote(...args),
  updateNote: (...args: any[]) => mockUpdateNote(...args),
  deleteNote: (...args: any[]) => mockDeleteNote(...args),
}));

vi.mock("@/app/_server/actions/checklist/queries", () => ({
  getUserChecklists: (...args: any[]) => mockGetUserChecklists(...args),
  getListById: (...args: any[]) => mockGetListById(...args),
}));

vi.mock("@/app/_server/actions/checklist", () => ({
  createList: (...args: any[]) => mockCreateList(...args),
  updateList: (...args: any[]) => mockUpdateList(...args),
  deleteList: (...args: any[]) => mockDeleteList(...args),
}));

vi.mock("@/app/_server/actions/checklist/creator", () => ({
  makeList: (...args: any[]) => mockMakeList(...args),
}));

vi.mock("@/app/_server/actions/note/creator", () => ({
  makeNote: (...args: any[]) => mockMakeNote(...args),
}));

vi.mock("@/app/_server/actions/note/editor", () => ({
  editNote: (...args: any[]) => mockEditNote(...args),
  dropNote: (...args: any[]) => mockDropNote(...args),
}));

vi.mock("@/app/_server/actions/checklist/editor", () => ({
  editList: (...args: any[]) => mockEditList(...args),
  dropList: (...args: any[]) => mockDropList(...args),
}));

vi.mock("@/app/_server/actions/checklist-item/editor", () => ({
  addItem: (...args: any[]) => mockAddItem(...args),
  editItem: (...args: any[]) => mockEditItem(...args),
}));

vi.mock("@/app/_server/actions/checklist-item/remover", () => ({
  removeItem: (...args: any[]) => mockRemoveItem(...args),
}));

vi.mock("@/app/_server/actions/checklist-item/grafter", () => ({
  graftItem: (...args: any[]) => mockGraftItem(...args),
}));

vi.mock("@/app/_server/actions/checklist/restatus", () => ({
  restatus: (...args: any[]) => mockRestatus(...args),
}));

vi.mock("@/app/_server/actions/kanban/tweaker", () => ({
  assignItem: (...args: any[]) => mockAssignItem(...args),
  remindItem: (...args: any[]) => mockRemindItem(...args),
}));

vi.mock("@/app/_server/actions/share/queries", () => ({
  canReach: (...args: any[]) => mockCanReach(...args),
}));

vi.mock("@/app/_server/actions/checklist-item/stamper", () => ({
  stampStatus: (...args: any[]) => mockStampStatus(...args),
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
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
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
  getSettings: async () => (await mockGetAppSettings())?.data ?? {},
}));

vi.mock("@/app/_server/actions/export/builders", () => ({
  buildAllContent: (...args: any[]) => mockExportAllChecklistsNotes(...args),
  buildUserContent: (...args: any[]) => mockExportUserChecklistsNotes(...args),
  buildAllUsers: (...args: any[]) => mockExportAllUsersData(...args),
  buildWholeData: (...args: any[]) => mockExportWholeDataFolder(...args),
  readExportProgress: (...args: any[]) => mockGetExportProgress(...args),
}));

vi.mock("@/app/_server/actions/lib/legacy-lookup", () => ({
  resolveApiId: (...args: any[]) => mockResolveApiId(...args),
  legacyResolve: (...args: any[]) => mockLegacyResolve(...args),
}));

export function resetApiMocks() {
  vi.clearAllMocks();
  mockAuthenticateApiKey.mockReset();
  mockGetCurrentUser.mockReset();
  mockEditNote.mockReset();
  mockDropNote.mockReset();
  mockEditList.mockReset();
  mockDropList.mockReset();
  mockAddItem.mockReset();
  mockEditItem.mockReset();
  mockStampStatus.mockReset();
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
  mockRemoveItem.mockReset();
  mockRemoveItem.mockResolvedValue({ success: true });
  mockGraftItem.mockReset();
  mockGraftItem.mockResolvedValue({ success: true });
  mockRestatus.mockReset();
  mockRestatus.mockImplementation(
    async (_user: any, _uuid: string, reshape: (current?: any[]) => any[]) => ({
      success: true,
      data: { statuses: reshape(undefined) },
    }),
  );
  mockAssignItem.mockReset();
  mockRemindItem.mockReset();
  mockCanReach.mockReset();
  mockCanReach.mockResolvedValue(true);
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

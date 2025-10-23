"use server";

import {
  Result,
  User,
  GlobalSharingReturn,
  SharedItem,
  SharingMetadata,
} from "@/app/_types";
import { getCurrentUser } from "@/app/_server/actions/users";
import { ItemType } from "@/app/_types";
import { ensureDir, serverReadFile } from "@/app/_server/actions/file";
import { readJsonFile, writeJsonFile } from "@/app/_server/actions/file";
import {
  SHARING_DIR,
  SHARED_ITEMS_FILE,
  USERS_FILE,
} from "@/app/_consts/files";

export const getGlobalSharing = async (): Promise<GlobalSharingReturn> => {
  try {
    const metadata = await readSharingMetadata();

    const allSharedChecklists = Object.values(metadata.checklists);
    const allSharedNotes = Object.values(metadata.notes);
    const allItems = [...allSharedChecklists, ...allSharedNotes];

    const totalSharedChecklists = allSharedChecklists.length;
    const totalSharedNotes = allSharedNotes.length;

    const totalSharingRelationships = allItems.length;

    const totalPublicShares = allItems.filter(
      (item) => item.isPubliclyShared
    ).length;

    const sharerCounts: Record<string, number> = {};
    allItems.forEach((item) => {
      sharerCounts[item.owner] = (sharerCounts[item.owner] || 0) + 1;
    });

    const mostActiveSharers = Object.entries(sharerCounts)
      .map(([username, sharedCount]) => ({ username, sharedCount }))
      .sort((a, b) => b.sharedCount - a.sharedCount)
      .slice(0, 5);

    return {
      success: true,
      data: {
        allSharedChecklists,
        allSharedNotes,
        sharingStats: {
          totalSharedChecklists,
          totalSharedNotes,
          totalSharingRelationships,
          mostActiveSharers,
          totalPublicShares,
        },
      },
    };
  } catch (error) {
    console.error("Error in getGlobalSharing:", error);

    return {
      success: false,
      data: {
        allSharedChecklists: [],
        allSharedNotes: [],
        sharingStats: {
          totalSharedChecklists: 0,
          totalSharedNotes: 0,
          totalSharingRelationships: 0,
          totalPublicShares: 0,
          mostActiveSharers: [],
        },
      },
    };
  }
};

export const shareItem = async (formData: FormData): Promise<Result<null>> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    const itemId = formData.get("itemId") as string;
    const type = formData.get("type") as ItemType;
    const title = formData.get("title") as string;
    const category = formData.get("category") as string;
    const action = formData.get("action") as
      | "share"
      | "unshare"
      | "share-public"
      | "unshare-public";
    const targetUsers = formData.get("targetUsers") as string;

    if (!itemId || !type || !title || !action) {
      return { success: false, error: "Missing required fields" };
    }

    if (type !== "checklist" && type !== "note") {
      return { success: false, error: "Invalid item type" };
    }

    const users = await readJsonFile(USERS_FILE);
    const usernames = users.map((u: User) => u.username);

    if (action === "share") {
      if (!targetUsers) {
        return { success: false, error: "No target users specified" };
      }

      const targetUserList = targetUsers.split(",").map((u) => u.trim());

      const invalidUsers = targetUserList.filter((u) => !usernames.includes(u));
      if (invalidUsers.length > 0) {
        return {
          success: false,
          error: `Invalid users: ${invalidUsers.join(", ")}`,
        };
      }

      const filteredUsers = targetUserList.filter(
        (u) => u !== currentUser.username
      );
      if (filteredUsers.length === 0) {
        return { success: false, error: "Cannot share with yourself" };
      }

      const existingMetadata = await getItemSharingMetadata(
        itemId,
        type,
        currentUser.username
      );

      if (existingMetadata) {
        const allUsers = [...existingMetadata.sharedWith, ...filteredUsers];
        const newSharedWith = allUsers.filter(
          (user, index) => allUsers.indexOf(user) === index
        );
        await updateSharedItem(itemId, type, currentUser.username, {
          sharedWith: newSharedWith,
        });
      } else {
        await addSharedItem(
          itemId,
          type,
          title,
          currentUser.username,
          filteredUsers,
          category
        );
      }

      return { success: true };
    } else if (action === "share-public") {
      const existingMetadata = await getItemSharingMetadata(
        itemId,
        type,
        currentUser.username
      );

      if (existingMetadata) {
        await updateSharedItem(itemId, type, currentUser.username, {
          ...existingMetadata,
          isPubliclyShared: true,
        });
      } else {
        await addSharedItem(
          itemId,
          type,
          title,
          currentUser.username,
          [],
          category,
          undefined,
          true
        );
      }

      return { success: true };
    } else if (action === "unshare-public") {
      const existingMetadata = await getItemSharingMetadata(
        itemId,
        type,
        currentUser.username
      );

      if (existingMetadata) {
        if (existingMetadata.sharedWith.length === 0) {
          await removeSharedItem(itemId, type, currentUser.username);
        } else {
          await updateSharedItem(itemId, type, currentUser.username, {
            ...existingMetadata,
            isPubliclyShared: false,
          });
        }
      }

      return { success: true };
    } else if (action === "unshare") {
      if (!targetUsers) {
        await removeSharedItem(itemId, type, currentUser.username);
      } else {
        const targetUserList = targetUsers.split(",").map((u) => u.trim());
        const existingMetadata = await getItemSharingMetadata(
          itemId,
          type,
          currentUser.username
        );

        if (existingMetadata) {
          const newSharedWith = existingMetadata.sharedWith.filter(
            (u) => !targetUserList.includes(u)
          );

          if (newSharedWith.length === 0) {
            await removeSharedItem(itemId, type, currentUser.username);
          } else {
            await updateSharedItem(itemId, type, currentUser.username, {
              sharedWith: newSharedWith,
            });
          }
        }
      }

      return { success: true };
    }

    return { success: false, error: "Invalid action" };
  } catch (error) {
    console.error("Error in shareItemAction:", error);
    return { success: false, error: "Failed to share item" };
  }
};

export const unshareItem = async (
  formData: FormData
): Promise<Result<null>> => {
  formData.set("action", "unshare");
  return shareItem(formData);
};

const generateSharingId = async (
  owner: string,
  itemId: string,
  type: ItemType
): Promise<string> => {
  return `${owner}-${itemId}-${type}`;
};

export const readSharingMetadata = async (): Promise<SharingMetadata> => {
  await ensureDir(SHARING_DIR);

  const content = await serverReadFile(SHARED_ITEMS_FILE, JSON.stringify({
    checklists: {},
    notes: {},
  }));

  try {
    return JSON.parse(content);
  } catch {
    return {
      checklists: {},
      notes: {},
    };
  }
};

export const addSharedItem = async (
  itemId: string,
  type: ItemType,
  title: string,
  owner: string,
  sharedWith: string[],
  category?: string,
  filePath?: string,
  isPubliclyShared?: boolean
): Promise<void> => {
  const metadata = await readSharingMetadata();
  const sharingId = await generateSharingId(owner, itemId, type);

  const sharedItem: SharedItem = {
    id: itemId,
    type,
    title,
    owner,
    sharedWith,
    sharedAt: new Date().toISOString(),
    category,
    filePath:
      filePath || `${owner}/${category || "Uncategorized"}/${itemId}.md`,
    isPubliclyShared: isPubliclyShared || false,
  };

  if (type === "checklist") {
    metadata.checklists[sharingId] = sharedItem;
  } else {
    metadata.notes[sharingId] = sharedItem;
  }

  await writeJsonFile(metadata, SHARED_ITEMS_FILE);
};

export const removeSharedItem = async (
  itemId: string,
  type: ItemType,
  owner: string
): Promise<void> => {
  const metadata = await readSharingMetadata();
  const sharingId = await generateSharingId(owner, itemId, type);

  if (type === "checklist") {
    delete metadata.checklists[sharingId];
  } else {
    delete metadata.notes[sharingId];
  }

  await writeJsonFile(metadata, SHARED_ITEMS_FILE);
};

export const updateSharedItem = async (
  itemId: string,
  type: ItemType,
  owner: string,
  updates: Partial<SharedItem>
): Promise<void> => {
  const metadata = await readSharingMetadata();
  const sharingId = await generateSharingId(owner, itemId, type);

  if (type === "checklist") {
    if (metadata.checklists[sharingId]) {
      metadata.checklists[sharingId] = {
        ...metadata.checklists[sharingId],
        ...updates,
      };
    }
  } else {
    if (metadata.notes[sharingId]) {
      metadata.notes[sharingId] = {
        ...metadata.notes[sharingId],
        ...updates,
      };
    }
  }

  await writeJsonFile(metadata, SHARED_ITEMS_FILE);
};

export const getItemsSharedWithUser = async (
  username: string
): Promise<{
  checklists: SharedItem[];
  notes: SharedItem[];
}> => {
  const metadata = await readSharingMetadata();

  const sharedChecklists = Object.values(metadata.checklists).filter((item) =>
    item.sharedWith.includes(username)
  );

  const sharedNotes = Object.values(metadata.notes).filter((item) =>
    item.sharedWith.includes(username)
  );

  return {
    checklists: sharedChecklists,
    notes: sharedNotes,
  };
};

export const getItemsSharedByUser = async (
  username: string
): Promise<{
  checklists: SharedItem[];
  notes: SharedItem[];
}> => {
  const metadata = await readSharingMetadata();

  const sharedChecklists = Object.values(metadata.checklists).filter(
    (item) => item.owner === username
  );

  const sharedNotes = Object.values(metadata.notes).filter(
    (item) => item.owner === username
  );

  return {
    checklists: sharedChecklists,
    notes: sharedNotes,
  };
};

export const getItemSharingMetadata = async (
  itemId: string,
  type: ItemType,
  owner: string
): Promise<SharedItem | null> => {
  const metadata = await readSharingMetadata();
  const sharingId = await generateSharingId(owner, itemId, type);

  if (type === "checklist") {
    return metadata.checklists[sharingId] || null;
  } else {
    return metadata.notes[sharingId] || null;
  }
};

export const getItemSharingStatus = async (
  itemId: string,
  type: ItemType,
  owner: string
): Promise<
  Result<{ isShared: boolean; sharedWith: string[]; isPubliclyShared: boolean }>
> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    if (currentUser.username !== owner) {
      return { success: false, error: "Unauthorized" };
    }

    const metadata = await getItemSharingMetadata(itemId, type, owner);

    if (!metadata) {
      return {
        success: true,
        data: { isShared: false, sharedWith: [], isPubliclyShared: false },
      };
    }

    return {
      success: true,
      data: {
        isShared: metadata.sharedWith.length > 0,
        sharedWith: metadata.sharedWith,
        isPubliclyShared: metadata.isPubliclyShared || false,
      },
    };
  } catch (error) {
    console.error("Error in getItemSharingStatus:", error);
    return { success: false, error: "Failed to get sharing status" };
  }
};

export const getAllSharingStatuses = async (
  items: Array<{ id: string; type: ItemType; owner: string }>
): Promise<
  Result<
    Record<
      string,
      { isShared: boolean; sharedWith: string[]; isPubliclyShared: boolean }
    >
  >
> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    const results: Record<
      string,
      { isShared: boolean; sharedWith: string[]; isPubliclyShared: boolean }
    > = {};

    for (const item of items) {
      if (currentUser.username !== item.owner) {
        results[item.id] = {
          isShared: false,
          sharedWith: [],
          isPubliclyShared: false,
        };
        continue;
      }

      try {
        const metadata = await getItemSharingMetadata(
          item.id,
          item.type,
          item.owner
        );

        if (!metadata) {
          results[item.id] = {
            isShared: false,
            sharedWith: [],
            isPubliclyShared: false,
          };
        } else {
          results[item.id] = {
            isShared: metadata.sharedWith.length > 0,
            sharedWith: metadata.sharedWith,
            isPubliclyShared: metadata.isPubliclyShared || false,
          };
        }
      } catch (error) {
        console.error(
          `Error getting sharing status for item ${item.id}:`,
          error
        );
        results[item.id] = {
          isShared: false,
          sharedWith: [],
          isPubliclyShared: false,
        };
      }
    }

    return { success: true, data: results };
  } catch (error) {
    console.error("Error in getAllSharingStatuses:", error);
    return { success: false, error: "Failed to get sharing statuses" };
  }
};

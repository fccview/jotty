interface ItemDetails {
  exists: boolean;
  isPublic: boolean;
  sharedWith: string[];
}

export const sharingInfo = (
  data: any,
  targetId: string,
  targetCategory: string
) => {
  let result: ItemDetails = {
    exists: false,
    isPublic: false,
    sharedWith: [] as string[],
  };

  const isMatch = (item: { id?: string; uuid?: string; category?: string }) =>
    item.uuid === targetId || (item.id === targetId && item.category?.toLowerCase() === targetCategory?.toLowerCase());

  for (const categoryKey in data) {
    const categoryObject = data[categoryKey];

    if (typeof categoryObject !== "object" || categoryObject === null) {
      continue;
    }

    for (const bucketName in categoryObject) {
      const list = categoryObject[bucketName];

      if (Array.isArray(list) && list.some(isMatch)) {
        result.exists = true;

        if (bucketName === "public") {
          result.isPublic = true;
        } else {
          result.sharedWith.push(bucketName);
        }
      }
    }
  }

  return result;
};

export const getPermissions = (
  data: any,
  username: string,
  targetId: string,
  targetCategory: string
) => {
  const isMatch = (item: { id?: string; uuid?: string; category?: string }) =>
    item.uuid === targetId || (item.id === targetId && item.category?.toLowerCase() === targetCategory?.toLowerCase());

  for (const categoryKey in data) {
    const categoryObject = data[categoryKey];

    if (typeof categoryObject !== "object" || categoryObject === null) {
      continue;
    }

    const userList = categoryObject[username];

    if (Array.isArray(userList)) {
      const foundItem = userList.find(isMatch);

      if (foundItem) {
        return foundItem.permissions || null;
      }
    }
  }

  return null;
};

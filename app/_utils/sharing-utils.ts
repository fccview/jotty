interface ItemDetails {
    exists: boolean;
    isPublic: boolean;
    sharedWith: string[];
}

export const sharingInfo = (data: any, targetId: string, targetCategory: string) => {
    let result: ItemDetails = {
        exists: false,
        isPublic: false,
        sharedWith: [] as string[]
    };

    const isMatch = (item: { id: string; category: string }) => item.id === targetId && item.category === targetCategory;

    for (const categoryKey in data) {
        const categoryObject = data[categoryKey];

        if (typeof categoryObject !== 'object' || categoryObject === null) {
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
}
"use client";

import { File02Icon, CheckmarkSquare04Icon } from "hugeicons-react";
import { encodeCategoryPath } from "@/app/_utils/global-utils";
import { useRouter } from "next/navigation";
import { ItemType } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";

interface ReferencingItem {
  type: ItemType;
  path: string;
  title: string;
  category: string;
}

interface ReferencedBySectionProps {
  referencingItems: ReferencingItem[];
}

export const ReferencedBySection = ({
  referencingItems,
}: ReferencedBySectionProps) => {
  const router = useRouter();
  if (referencingItems.length === 0) return null;

  const handleItemClick = (item: ReferencingItem) => {
    const url = `/${item.type}/${encodeCategoryPath(item.path)}`;
    router.push(url);
  };

  return (
    <div className="mt-8 space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <span>Referenced By</span>
        <span className="text-sm text-muted-foreground font-normal">
          ({referencingItems.length})
        </span>
      </h3>

      <div className="space-y-2">
        {referencingItems.map((item) => (
          <div
            key={`${item.type}-${item.path}`}
            onClick={() => handleItemClick(item)}
            className="bg-muted/50 border border-border rounded-lg p-3 cursor-pointer hover:shadow-sm hover:border-primary/30 transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {item.type === ItemTypes.NOTE ? (
                  <File02Icon className="h-4 w-4 text-blue-500" />
                ) : (
                  <CheckmarkSquare04Icon className="h-4 w-4 text-green-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {item.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground capitalize">
                  {item.type}
                </span>
                {item.category && item.category !== "Uncategorized" && (
                  <>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {item.category.split("/").pop()}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

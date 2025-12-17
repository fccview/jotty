import { SharedItem } from "@/app/_types";
import { Globe02Icon } from "hugeicons-react";

export const SharedItemCard = ({ item }: { item: SharedItem }) => (
  <div className="jotty-shared-item-card p-3 bg-muted/50 rounded-jotty">
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-2">
        <p className="font-medium text-foreground">{item.title}</p>
        {item.isPubliclyShared && (
          <Globe02Icon className="h-4 w-4 text-primary" />
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        {new Date(item.sharedAt).toLocaleDateString()}
      </div>
    </div>
    <p className="text-sm text-muted-foreground mb-2">by {item.owner}</p>
    {item.isPubliclyShared ? (
      <div className="flex items-center gap-1 text-xs text-primary">
        <Globe02Icon className="h-3 w-3" />
        <span>Publicly accessible</span>
      </div>
    ) : (
      <div className="flex flex-wrap gap-1">
        {item.sharedWith.map((username) => (
          <span
            key={username}
            className="inline-flex px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
          >
            {username}
          </span>
        ))}
      </div>
    )}
  </div>
);

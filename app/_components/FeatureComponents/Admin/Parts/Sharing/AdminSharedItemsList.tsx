import { X } from "lucide-react";

interface SimpleSharedItem {
  id: string;
  category: string;
}

export const AdminSharedItemsList = ({
  items,
  onUnshare,
}: {
  items: SimpleSharedItem[];
  onUnshare?: (item: SimpleSharedItem) => void;
}) => (
  <div className="">
    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
      {items?.length > 0 ? (
        items.map((item: SimpleSharedItem) => (
          <div key={`${item.category}-${item.id}`} className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
            <div>
              <div className="font-medium text-foreground">{item.id}</div>
              <div className="text-sm text-muted-foreground">{item.category}</div>
            </div>
            {onUnshare && (
              <button
                onClick={() => onUnshare(item)}
                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                title={`Unshare ${item.id}`}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">
          No shared items
        </p>
      )}
    </div>
  </div>
);
